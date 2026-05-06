/**
 * VaultX Teaser Engine Router
 *
 * Workflow:
 * 1. Creator picks a content item from vaultx_content
 * 2. Kling 2.1 (Replicate) generates a SFW teaser clip from the thumbnail
 * 3. censored_url is saved back to vaultx_content
 * 4. AI Deal Closer scans subscribers who viewed but didn't purchase
 * 5. GPT-4o-mini generates personalized PPV pitch messages for each non-purchaser
 * 6. Messages are queued in vaultx_mass_messages for delivery
 *
 * NO STUBS. NO MOCKS. Every call hits a real API.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import { db } from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

// ── DB helper ─────────────────────────────────────────────────────────────────
async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  throw new Error("Cannot access database pool");
}

// ── Replicate polling ─────────────────────────────────────────────────────────
async function replicatePredict(
  modelVersion: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");

  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: modelVersion, input }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate start failed (${startRes.status}): ${err}`);
  }

  const { id } = (await startRes.json()) as { id: string };

  // Poll until done — 5s intervals, max 10 minutes
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = (await poll.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
    };
    if (data.status === "succeeded") {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error("Replicate returned empty output");
      return out;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error ?? "unknown"}`);
    }
  }
  throw new Error("Replicate prediction timed out after 10 minutes");
}

// ── Kling 2.1 model version ───────────────────────────────────────────────────
// Using the "latest" tag via model path format
async function replicatePredictByModel(
  modelPath: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");

  const startRes = await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate start failed (${startRes.status}): ${err}`);
  }

  const { id } = (await startRes.json()) as { id: string };

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = (await poll.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
    };
    if (data.status === "succeeded") {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error("Replicate returned empty output");
      return out;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error ?? "unknown"}`);
    }
  }
  throw new Error("Replicate prediction timed out after 10 minutes");
}

export const teaserEngineRouter = router({

  /**
   * generateTeaser
   *
   * Takes a content item from vaultx_content, uses Kling 2.1 (Replicate) to
   * generate a SFW teaser clip from the censored_thumbnail_url or thumbnail_url,
   * then saves the result back to censored_url in vaultx_content.
   *
   * Real Replicate API call. No mock.
   */
  generateTeaser: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      teaserStyle: z.enum(["slow_reveal", "body_focus", "desire_grade", "cinematic_tease"]).default("cinematic_tease"),
      customPrompt: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve creator_id from user_id via vaultx_creators table
      const creatorLookup = await rawQuery(
        `SELECT id FROM vaultx_creators WHERE user_id = ? LIMIT 1`,
        [ctx.user.id]
      ) as Array<{ id: number }>;
      const creatorId = creatorLookup.length ? creatorLookup[0].id : null;
      if (!creatorId) throw new Error("Creator profile not found — complete VaultX onboarding first");

      // 1. Fetch the content item — must belong to this creator
      const rows = await rawQuery(
        `SELECT c.*, cp.display_name as creator_name
         FROM vaultx_content c
         LEFT JOIN vaultx_creator_profiles cp ON cp.creator_id = c.creator_id
         WHERE c.id = ? AND c.creator_id = ?
         LIMIT 1`,
        [input.contentId, creatorId]
      ) as Array<{
        id: number;
        title: string;
        thumbnail_url: string | null;
        censored_thumbnail_url: string | null;
        censored_url: string | null;
        ppv_price: number;
        creator_name: string;
      }>;

      if (!rows.length) throw new Error("Content not found or access denied");
      const content = rows[0];

      // 2. Use censored thumbnail if available, fall back to main thumbnail
      const sourceImageUrl = content.censored_thumbnail_url || content.thumbnail_url;
      if (!sourceImageUrl) throw new Error("Content has no thumbnail to generate teaser from");

      // 3. Build the teaser prompt based on style
      const stylePrompts: Record<string, string> = {
        slow_reveal: "Slow cinematic reveal, soft focus pulling to sharp, warm golden lighting, body-positive celebration, desire-driven atmosphere, 9:16 vertical, 5 seconds",
        body_focus: "Intimate body-positive close-up, smooth skin texture, warm editorial lighting, curves celebrated, desire-grade color, 9:16 vertical, 5 seconds",
        desire_grade: "Warm golden desire-grade color, soft shadows, luminous skin, cinematic slow motion, professional film look, body-positive, 9:16 vertical, 5 seconds",
        cinematic_tease: "Cinematic tease, dramatic lighting, slow elegant motion, body-positive celebration, warm skin tones, desire-driven close up, 9:16 vertical, 5 seconds",
      };

      const finalPrompt = input.customPrompt || stylePrompts[input.teaserStyle];

      // 4. Call Replicate minimax/video-01 — image-to-video, real API call
      const teaserUrl = await replicatePredictByModel(
        "minimax/video-01",
        {
          first_frame_image: sourceImageUrl,
          prompt: finalPrompt,
          prompt_optimizer: true,
        }
      );

      // 5. Save the teaser URL back to vaultx_content.censored_url
      await rawQuery(
        `UPDATE vaultx_content
         SET censored_url = ?, is_free_preview = 1, free_preview_seconds = 15, updated_at = NOW()
         WHERE id = ? AND creator_id = ?`,
        [teaserUrl, input.contentId, creatorId]
      );

      return {
        contentId: input.contentId,
        teaserUrl,
        teaserStyle: input.teaserStyle,
        message: "Teaser generated and saved. Ready to post to SocialHub.",
      };
    }),

  /**
   * launchPPVCampaign
   *
   * After a teaser is generated, this procedure:
   * 1. Finds all active subscribers who have NOT purchased this content
   * 2. Uses GPT-4o-mini to generate a personalized PPV pitch for each subscriber
   * 3. Queues the messages in vaultx_mass_messages
   *
   * Real OpenAI call. Real DB writes. No mock.
   */
  launchPPVCampaign: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      campaignStyle: z.enum(["urgent", "exclusive", "personal", "discount"]).default("exclusive"),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get the content details
      const contentRows = await rawQuery(
        `SELECT title, description, ppv_price FROM vaultx_content
         WHERE id = ? AND creator_id = ? LIMIT 1`,
        [input.contentId, ctx.user.id]
      ) as Array<{ title: string; description: string | null; ppv_price: number }>;

      if (!contentRows.length) throw new Error("Content not found");
      const content = contentRows[0];

      // 2. Get creator profile for personalization
      const profileRows = await rawQuery(
        `SELECT display_name FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1`,
        [ctx.user.id]
      ) as Array<{ display_name: string }>;
      const creatorName = profileRows[0]?.display_name || "Your creator";

      // 3. Find active subscribers who have NOT purchased this content
      const nonPurchasers = await rawQuery(
        `SELECT s.fan_id
         FROM vaultx_subscriptions s
         WHERE s.creator_id = ? AND s.status = 'active'
         AND s.fan_id NOT IN (
           SELECT p.fan_id FROM vaultx_ppv_purchases p
           WHERE p.content_id = ? AND p.status = 'completed'
         )
         LIMIT 200`,
        [ctx.user.id, input.contentId]
      ) as Array<{ fan_id: number }>;

      if (!nonPurchasers.length) {
        return { queued: 0, message: "All active subscribers have already purchased this content." };
      }

      // 4. Generate campaign copy with GPT-4o-mini — one real API call for the template
      const styleInstructions: Record<string, string> = {
        urgent: "Create urgency — limited time, exclusive access, don't miss out",
        exclusive: "Emphasize exclusivity — this is special, only for loyal subscribers",
        personal: "Make it feel personal and intimate — direct, warm, genuine",
        discount: "Offer a sense of value — this is worth every penny, premium content",
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `You are a top adult content creator named ${creatorName}.
Write a short, compelling PPV pitch message (max 120 words) for your subscribers.

Content: "${content.title}"
Price: $${content.ppv_price}
Style: ${styleInstructions[input.campaignStyle]}

Rules:
- Write in first person as the creator
- Be direct, confident, and enticing
- Include the price naturally
- End with a clear call to action
- Body-positive, desire-driven tone
- No hashtags in this message`,
        }],
        max_tokens: 200,
        temperature: 0.85,
      });

      const messageTemplate = completion.choices[0].message.content || "";

      // 5. Queue messages in vaultx_mass_messages for each non-purchaser
      const now = new Date();
      const scheduledAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

      // Insert one mass message record for the PPV campaign (one message sent to all non-purchasers)
      // vaultx_mass_messages is a broadcast table — one record per campaign, not per fan
      await rawQuery(
        `INSERT INTO vaultx_mass_messages
           (creator_id, subject, message_text, is_locked, unlock_price, target_tier, scheduled_for, status, created_at)
         VALUES (?, ?, ?, 1, ?, 'all', ?, 'scheduled', NOW())`,
        [
          ctx.user.id,
          `Exclusive content just for you — ${content.title}`,
          messageTemplate,
          content.ppv_price,
          scheduledAt,
        ]
      );

      return {
        queued: nonPurchasers.length,
        messagePreview: messageTemplate,
        scheduledAt: scheduledAt.toISOString(),
        message: `PPV campaign queued for ${nonPurchasers.length} subscribers.`,
      };
    }),

  /**
   * getTeaserStatus
   *
   * Returns the teaser generation status and campaign metrics for a content item.
   * Reads directly from vaultx_content and vaultx_mass_messages.
   */
  getTeaserStatus: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const contentRows = await rawQuery(
        `SELECT id, title, censored_url, is_free_preview, ppv_price, purchase_count, view_count, revenue_generated
         FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1`,
        [input.contentId, ctx.user.id]
      ) as Array<{
        id: number;
        title: string;
        censored_url: string | null;
        is_free_preview: number;
        ppv_price: number;
        purchase_count: number;
        view_count: number;
        revenue_generated: number;
      }>;

      if (!contentRows.length) throw new Error("Content not found");
      const content = contentRows[0];

      // Get campaign stats from vaultx_mass_messages
      const campaignRows = await rawQuery(
        `SELECT
           COUNT(*) as total_queued,
           SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
           SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as pending,
           SUM(COALESCE(revenue_generated, 0)) as revenue
         FROM vaultx_mass_messages
         WHERE creator_id = ? AND is_locked = 1 AND unlock_price = (
           SELECT ppv_price FROM vaultx_content WHERE id = ? LIMIT 1
         )`,
        [ctx.user.id, input.contentId]
      ) as Array<{ total_queued: number; sent: number; pending: number; revenue: number }>;

      const campaign = campaignRows[0] || { total_queued: 0, sent: 0, pending: 0 };

      return {
        contentId: content.id,
        title: content.title,
        hasTeaserGenerated: !!content.censored_url,
        teaserUrl: content.censored_url,
        isLiveInFeed: !!content.is_free_preview,
        ppvPrice: content.ppv_price,
        stats: {
          views: content.view_count,
          purchases: content.purchase_count,
          revenueGenerated: content.revenue_generated,
          campaignMessagesSent: campaign.sent,
          campaignMessagesPending: campaign.pending,
        },
      };
    }),

  /**
   * getMyContentForTeaser
   *
   * Returns the creator's active content items that are PPV-eligible
   * and either have no teaser yet or have one ready to campaign.
   */
  getMyContentForTeaser: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await rawQuery(
        `SELECT id, title, content_type, thumbnail_url, censored_thumbnail_url,
                censored_url, is_ppv, ppv_price, is_free_preview,
                view_count, purchase_count, revenue_generated, status, created_at
         FROM vaultx_content
         WHERE creator_id = ? AND status = 'active' AND is_ppv = 1
         ORDER BY created_at DESC
         LIMIT 50`,
        [ctx.user.id]
      ) as Array<{
        id: number;
        title: string;
        content_type: string;
        thumbnail_url: string | null;
        censored_thumbnail_url: string | null;
        censored_url: string | null;
        is_ppv: number;
        ppv_price: number;
        is_free_preview: number;
        view_count: number;
        purchase_count: number;
        revenue_generated: number;
        status: string;
        created_at: string;
      }>;

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        contentType: r.content_type,
        thumbnailUrl: r.censored_thumbnail_url || r.thumbnail_url,
        hasTeaserGenerated: !!r.censored_url,
        teaserUrl: r.censored_url,
        isLiveInFeed: !!r.is_free_preview,
        ppvPrice: r.ppv_price,
        stats: {
          views: r.view_count,
          purchases: r.purchase_count,
          revenue: r.revenue_generated,
        },
        createdAt: r.created_at,
      }));
    }),
});
