/**
 * ============================================================================
 * CONTENT COMMAND ROUTER — /king/content
 * KingCam Content Factory — unified generation for all content types.
 *
 * Procedures:
 *   generateContent   — run a full generation job (6 types)
 *   postToTelegram    — send media + caption to a Telegram channel
 *   saveToVault       — persist an output URL to vault_assets
 *   getHistory        — paginated history of all generations
 *
 * Owner-gated: user IDs 6 and 33 only.
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDb() {
  const url =
    process.env.DATABASE_URL ||
    "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function rows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

// ─── Owner Guard ──────────────────────────────────────────────────────────────
const OWNER_IDS = [6, 33];
function ownerGuard(userId: number) {
  if (!OWNER_IDS.includes(userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_CLONE_MODEL_ID || "kingcam214/fluxdevcam";
const REPLICATE_VERSION =
  process.env.REPLICATE_CLONE_VERSION ||
  "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727";
const TRIGGER_WORD = process.env.REPLICATE_CLONE_TRIGGER_WORD || "fluxdevCam";
const POLLO_KEY = process.env.POLLO_API_KEY || "";
const POLLO_BASE = "https://pollo.ai/api/platform";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL_ID || "";
const TELEGRAM_VAULTX_CHANNEL = process.env.TELEGRAM_VAULTX_CHANNEL_ID || "";

const IDENTITY_PREFIX =
  "KingCam reference-first identity lock: preserve exact hairstyle, hairline, hair length, hair texture, facial hair, jewelry, skin tone, face structure, body build";
const IDENTITY_SUFFIX =
  "paid clone output must match the submitted prompt and reference-media identity exactly";
const LOCKED_NEGATIVE =
  "wrong hairstyle, invented hairstyle, generic AI haircut, bald, shaved head, no hair, hat, beanie, hood, wrong glasses, light skin, thin build, no beard, clean shaven, extra fingers, fused fingers, deformed hands, warped face, duplicate face, bad anatomy, text artifacts, watermark, logo, blurry, uncanny valley";

const SCENARIO_PROMPTS: Record<string, string> = {
  CreatorVault:
    "dark luxury creator command center with glowing screens, cinematic premium atmosphere, no people",
  VaultX:
    "beautiful Black woman in luxury penthouse, silk lingerie, moody dramatic lighting, sensual editorial, no nudity, cinematic vertical",
  "Clone Engine":
    "dark throne room, gold ornate throne, dramatic spotlight, luxury palace, cinematic, no people",
  "Body Cinema":
    "artistic silhouette of woman against dramatic backlit penthouse window, fashion editorial, cinematic",
  Marketplace:
    "luxury digital storefront with glowing product displays, dark premium atmosphere, cyan accent lighting",
};

// ─── Replicate image generation ───────────────────────────────────────────────
async function generateCloneImage(scenePrompt: string): Promise<string> {
  if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });

  const finalPrompt = `${TRIGGER_WORD} ${IDENTITY_PREFIX}, ${scenePrompt.replace(new RegExp(`\\b${TRIGGER_WORD}\\b`, "gi"), "").trim()}, ${IDENTITY_SUFFIX}`;

  const startResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: REPLICATE_VERSION,
      input: {
        prompt: finalPrompt,
        negative_prompt: LOCKED_NEGATIVE,
        width: 768,
        height: 1344,
        num_outputs: 1,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        output_format: "png",
        output_quality: 100,
      },
    }),
  });
  if (!startResp.ok) throw new Error(`Replicate start error: ${await startResp.text()}`);
  const prediction = await startResp.json();
  const predId = prediction.id;

  // Poll up to 90s
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    const data = await pollResp.json();
    if (data.status === "succeeded" && data.output) {
      const urls = Array.isArray(data.output) ? data.output : [data.output];
      return String(urls[0]);
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate failed: ${data.error || "unknown"}`);
    }
  }
  throw new Error("Replicate timeout after 90s");
}

// ─── Pollo image-to-video ─────────────────────────────────────────────────────
async function animateImage(
  imageUrl: string,
  motionPrompt: string,
  resolution = "720p",
  lengthSeconds = 5
): Promise<string> {
  if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });

  const startResp = await fetch(`${POLLO_BASE}/generation/pollo/pollo-v1-6`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { image: imageUrl, prompt: motionPrompt, resolution, length: lengthSeconds, mode: "pro" },
    }),
  });
  if (!startResp.ok) throw new Error(`Pollo start error: ${await startResp.text()}`);
  const payload = await startResp.json();
  if (payload?.code !== "SUCCESS" || !payload?.data?.taskId) {
    throw new Error(`Pollo did not return taskId: ${JSON.stringify(payload)}`);
  }
  const taskId = payload.data.taskId as string;

  // Poll up to 5 minutes
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollResp = await fetch(`${POLLO_BASE}/generation/${taskId}/status`, {
      headers: { "x-api-key": POLLO_KEY },
    });
    if (!pollResp.ok) continue;
    const result = await pollResp.json();
    const gen = result?.data?.generations?.[0];
    const status = String(gen?.status || result?.data?.status || "").toLowerCase();
    const url = gen?.url || result.url;
    if ((status === "succeed" || status === "succeeded" || status === "completed") && url) return url;
    if (status === "failed" || status === "fail" || status === "error") {
      throw new Error(`Pollo failed: ${gen?.failMsg || result.error || status}`);
    }
  }
  throw new Error("Pollo timeout after 5 minutes");
}

// ─── Pollo text-to-video (no image) ──────────────────────────────────────────
async function generateVideo(
  prompt: string,
  resolution = "720p",
  lengthSeconds = 5,
  aspectRatio = "9:16"
): Promise<string> {
  if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });

  // Use Kling text-to-video endpoint
  const startResp = await fetch(`${POLLO_BASE}/generation/kling/kling-v1-6-standard`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { prompt, duration: lengthSeconds, aspect_ratio: aspectRatio, mode: "std" },
    }),
  });

  if (!startResp.ok) {
    // Fallback: try the generic Pollo endpoint
    const fallback = await fetch(`${POLLO_BASE}/generation/pollo/pollo-v1-6`, {
      method: "POST",
      headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { prompt, resolution, length: lengthSeconds, mode: "pro" },
      }),
    });
    if (!fallback.ok) throw new Error(`Pollo text-to-video error: ${await fallback.text()}`);
    const payload = await fallback.json();
    if (payload?.code !== "SUCCESS" || !payload?.data?.taskId) {
      throw new Error(`Pollo fallback did not return taskId: ${JSON.stringify(payload)}`);
    }
    return await pollPolloTask(payload.data.taskId);
  }

  const payload = await startResp.json();
  const taskId = payload?.data?.taskId || payload?.id;
  if (!taskId) throw new Error(`Pollo Kling did not return taskId: ${JSON.stringify(payload)}`);
  return await pollPolloTask(taskId);
}

async function pollPolloTask(taskId: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollResp = await fetch(`${POLLO_BASE}/generation/${taskId}/status`, {
      headers: { "x-api-key": POLLO_KEY },
    });
    if (!pollResp.ok) continue;
    const result = await pollResp.json();
    const gen = result?.data?.generations?.[0];
    const status = String(gen?.status || result?.data?.status || "").toLowerCase();
    const url = gen?.url || result.url;
    if ((status === "succeed" || status === "succeeded" || status === "completed") && url) return url;
    if (status === "failed" || status === "fail" || status === "error") {
      throw new Error(`Pollo task failed: ${gen?.failMsg || result.error || status}`);
    }
  }
  throw new Error("Pollo task timeout");
}

// ─── GPT helpers ──────────────────────────────────────────────────────────────
async function gptText(system: string, user: string, maxTokens = 500): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: maxTokens,
  });
  return res.choices[0].message.content || "";
}

async function gptJson<T = any>(system: string, user: string, maxTokens = 600): Promise<T> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });
  return JSON.parse(res.choices[0].message.content || "{}") as T;
}

// ─── Caption generator for clone drops ───────────────────────────────────────
async function generateCloneCaptions(scenePrompt: string, platform: string): Promise<{
  hook: string;
  caption: string;
  dmOpener: string;
  ppvTeaser: string;
}> {
  return gptJson(
    `You are KingCam's content strategist. Generate 4 captions for a clone drop targeting ${platform}. 
     Luxury, confident, money-aware tone. KingCam is a Black male creator/founder.
     Return JSON: { hook: string, caption: string, dmOpener: string, ppvTeaser: string }
     hook: 1 punchy line under 100 chars
     caption: 2-3 sentences with CTA, under 250 chars
     dmOpener: DM message to send fans, under 150 chars
     ppvTeaser: PPV unlock teaser line, under 100 chars`,
    `Scene: ${scenePrompt}. Platform: ${platform}.`
  );
}

// ─── Telegram sender ──────────────────────────────────────────────────────────
async function sendTelegram(
  channelId: string,
  caption: string,
  mediaUrl?: string,
  isVideo = false
): Promise<void> {
  if (!TELEGRAM_TOKEN || !channelId) return;
  const endpoint = mediaUrl
    ? isVideo
      ? "sendVideo"
      : "sendPhoto"
    : "sendMessage";
  const mediaKey = isVideo ? "video" : "photo";
  const body: Record<string, any> = {
    chat_id: channelId,
    parse_mode: "Markdown",
  };
  if (mediaUrl) {
    body[mediaKey] = mediaUrl;
    body.caption = caption.slice(0, 1024);
  } else {
    body.text = caption.slice(0, 4096);
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── DB save helper ───────────────────────────────────────────────────────────
async function saveHistory(userId: number, contentType: string, outputs: any): Promise<void> {
  const db = await getDb();
  try {
    await db.execute(
      "INSERT INTO content_command_history (user_id, content_type, outputs) VALUES (?, ?, ?)",
      [userId, contentType, JSON.stringify(outputs)]
    );
  } catch { /* non-fatal */ } finally { db.end(); }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const contentCommandRouter = router({

  /**
   * generateContent — the main factory procedure
   */
  generateContent: protectedProcedure
    .input(z.object({
      contentType: z.enum([
        "clone_drop",
        "platform_trailer",
        "social_post",
        "creator_campaign",
        "telegram_blast",
        "custom",
      ]),
      brief: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);

      switch (input.contentType) {

        // ── Clone Drop ─────────────────────────────────────────────────────
        case "clone_drop": {
          const scenePrompt = String(input.brief.scenePrompt || "dark throne room, velvet suit, gold chains");
          const motionPrompt = String(
            input.brief.motionPrompt ||
            "slow cinematic push toward camera, dramatic shadow shift, luxury presence"
          );
          const platform = String(input.brief.platform || "OnlyFans");

          // Generate image and captions in parallel
          const [imageUrl, captions] = await Promise.all([
            generateCloneImage(scenePrompt),
            generateCloneCaptions(scenePrompt, platform),
          ]);

          // Animate the image
          const videoUrl = await animateImage(
            imageUrl,
            motionPrompt,
            "720p",
            5
          );

          const result = { type: "clone_drop", imageUrl, videoUrl, captions, platform };
          await saveHistory(ctx.user.id, "clone_drop", result);
          return result;
        }

        // ── Platform Trailer ───────────────────────────────────────────────
        case "platform_trailer": {
          const subject = String(input.brief.subject || "CreatorVault");
          const tone = String(input.brief.tone || "Cinematic");
          const keyMessage = String(input.brief.keyMessage || "The platform that turns content into campaigns");
          const duration = parseInt(String(input.brief.duration || "5")) || 5;

          const basePrompt = SCENARIO_PROMPTS[subject] || subject;
          const fullPrompt = `${basePrompt}. ${tone} cinematic style. Slow dramatic camera movement. Premium luxury atmosphere. No text overlay. No UI. No people unless specified.`;

          const [videoUrl, caption] = await Promise.all([
            generateVideo(fullPrompt, "720p", duration, "16:9"),
            gptText(
              "Write a bold social caption for a CreatorVault platform trailer. Luxury tone. Max 200 chars. Include strong CTA.",
              `Subject: ${subject}. Key message: ${keyMessage}. Tone: ${tone}.`
            ),
          ]);

          const result = { type: "platform_trailer", videoUrl, caption, subject, tone };
          await saveHistory(ctx.user.id, "platform_trailer", result);
          return result;
        }

        // ── Social Post ────────────────────────────────────────────────────
        case "social_post": {
          const platform = String(input.brief.platform || "Twitter");
          const hookStyle = String(input.brief.hookStyle || "Statement");
          const topic = String(input.brief.topic || "Why creators are broke despite good content");
          const ctaKeyword = String(input.brief.ctaKeyword || "VAULT");
          const isVertical = platform === "TikTok" || platform === "Instagram";

          const [copy, videoUrl] = await Promise.all([
            gptJson<{ hook: string; caption: string; hashtags: string[]; ctaLine: string }>(
              `You are KingCam's content strategist for CreatorVault/VaultX. Write ${platform} content.
               Hook style: ${hookStyle}. Bold, luxury, money-aware. Black founder energy.
               Return JSON: { hook: string, caption: string, hashtags: string[], ctaLine: string }
               hook: under 100 chars, punchy opener
               caption: 2-3 sentences with CTA keyword ${ctaKeyword}
               hashtags: 5-8 relevant tags without #
               ctaLine: short CTA line under 60 chars`,
              `Topic: ${topic}. CTA keyword: ${ctaKeyword}.`
            ),
            generateVideo(
              `cinematic visual for creator platform social post about: ${topic}. Dark luxury aesthetic. Premium atmosphere. No text overlay. No UI.`,
              "720p",
              5,
              isVertical ? "9:16" : "16:9"
            ),
          ]);

          const result = { type: "social_post", ...copy, videoUrl, platform };
          await saveHistory(ctx.user.id, "social_post", result);
          return result;
        }

        // ── Creator Campaign ───────────────────────────────────────────────
        case "creator_campaign": {
          const creatorName = String(input.brief.creatorName || "Creator");
          const contentType = String(input.brief.contentType || "Video");
          const assetUrl = String(input.brief.assetUrl || "");
          const ppvPrice = parseFloat(String(input.brief.ppvPrice || "29")) || 29;
          const platforms: string[] = Array.isArray(input.brief.platforms)
            ? input.brief.platforms
            : ["VaultX", "Telegram"];

          // Generate campaign copy pack
          const campaignPack = await gptJson<{
            headline: string;
            teaserCaption: string;
            dmScript: string;
            ppvUnlockLine: string;
            telegramBlast: string;
          }>(
            `You are a premium adult creator campaign strategist. Generate a full drop package.
             Creator: ${creatorName}. Content type: ${contentType}. Price: $${ppvPrice}.
             Platforms: ${platforms.join(", ")}.
             Return JSON: { headline, teaserCaption, dmScript, ppvUnlockLine, telegramBlast }
             All copy: bold, luxury, conversion-focused. Under 200 chars each.`,
            `Create a complete campaign drop package for ${creatorName}.`
          );

          // Generate a teaser video if no asset provided
          let videoUrl = assetUrl || null;
          if (!videoUrl) {
            videoUrl = await generateVideo(
              `cinematic teaser for premium creator content. Dark luxury aesthetic. Woman in luxury setting. Sensual editorial. No nudity. No text overlay.`,
              "720p", 5, "9:16"
            );
          }

          const result = {
            type: "creator_campaign",
            creatorName,
            ppvPrice,
            platforms,
            videoUrl,
            campaignPack,
          };
          await saveHistory(ctx.user.id, "creator_campaign", result);
          return result;
        }

        // ── Telegram Blast ─────────────────────────────────────────────────
        case "telegram_blast": {
          const messageTopic = String(input.brief.messageTopic || "New drop available now");
          const channel = String(input.brief.channel || "CreatorVault_Free");
          const sendNow = Boolean(input.brief.sendNow);
          const includeMedia = Boolean(input.brief.includeMedia);

          const message = await gptText(
            "Write a Telegram broadcast message for CreatorVault/VaultX. Bold, direct, money-aware. Include emoji. Max 500 chars. End with a keyword CTA. No markdown headers.",
            messageTopic,
            300
          );

          let mediaUrl: string | null = null;
          if (includeMedia) {
            mediaUrl = await generateVideo(
              `cinematic visual for: ${messageTopic}. Dark luxury aesthetic. Premium atmosphere. No text overlay.`,
              "720p", 5, "9:16"
            ).catch(() => null);
          }

          let sent = false;
          if (sendNow && TELEGRAM_TOKEN) {
            const channelIds =
              channel === "Both"
                ? [TELEGRAM_CHANNEL, TELEGRAM_VAULTX_CHANNEL].filter(Boolean)
                : channel === "VaultX Inner Circle"
                ? [TELEGRAM_VAULTX_CHANNEL].filter(Boolean)
                : [TELEGRAM_CHANNEL].filter(Boolean);

            for (const cid of channelIds) {
              await sendTelegram(cid, message, mediaUrl || undefined, !!mediaUrl);
            }
            sent = true;
          }

          const result = { type: "telegram_blast", message, mediaUrl, sent, channel };
          await saveHistory(ctx.user.id, "telegram_blast", result);
          return result;
        }

        // ── Custom ─────────────────────────────────────────────────────────
        case "custom": {
          const description = String(input.brief.description || "Create something amazing");

          const plan = await gptJson<{
            contentPlan: string;
            primaryOutput: string;
            copy: { hook: string; caption: string };
          }>(
            `You are the CreatorVault content factory AI. Given a description, determine what to build and generate it.
             Return JSON: { contentPlan: string, primaryOutput: string, copy: { hook: string, caption: string } }
             contentPlan: 1-2 sentences describing what will be built
             primaryOutput: "video" or "image" or "copy"
             copy.hook: punchy hook line under 100 chars
             copy.caption: 2-3 sentence caption with CTA`,
            description
          );

          const videoUrl = await generateVideo(
            `${description}. Dark luxury cinematic aesthetic. Premium atmosphere. No text overlay. No UI.`,
            "720p", 5, "9:16"
          );

          const result = {
            type: "custom",
            contentPlan: plan.contentPlan,
            primaryOutput: plan.primaryOutput,
            copy: plan.copy,
            videoUrl,
          };
          await saveHistory(ctx.user.id, "custom", result);
          return result;
        }

        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown content type" });
      }
    }),

  /**
   * postToTelegram — send generated output to a channel
   */
  postToTelegram: protectedProcedure
    .input(z.object({
      videoUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      caption: z.string(),
      channelId: z.string().optional(),
      channel: z.enum(["CreatorVault_Free", "VaultX Inner Circle", "Both"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      if (!TELEGRAM_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TELEGRAM_BOT_TOKEN not configured" });

      const channelIds = input.channelId
        ? [input.channelId]
        : input.channel === "Both"
        ? [TELEGRAM_CHANNEL, TELEGRAM_VAULTX_CHANNEL].filter(Boolean)
        : input.channel === "VaultX Inner Circle"
        ? [TELEGRAM_VAULTX_CHANNEL].filter(Boolean)
        : [TELEGRAM_CHANNEL].filter(Boolean);

      for (const cid of channelIds) {
        const mediaUrl = input.videoUrl || input.imageUrl;
        await sendTelegram(cid, input.caption, mediaUrl, !!input.videoUrl);
      }

      return { success: true, channelsSent: channelIds.length };
    }),

  /**
   * saveToVault — persist output to vault_assets
   */
  saveToVault: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      assetType: z.enum(["video", "image", "voice"]),
      title: z.string().optional(),
      contentType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO vault_assets (id, user_id, asset_type, url, title, source, created_at)
           VALUES (UUID(), ?, ?, ?, ?, 'content_command', NOW())`,
          [ctx.user.id, input.assetType, input.url, input.title || `Content Command ${input.assetType}`, ]
        ).catch(() => {
          // Fallback if vault_assets doesn't exist yet
        });
        return { success: true };
      } finally { db.end(); }
    }),

  /**
   * getHistory — paginated history of all generations
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).default({}))
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        const histRows = rows(await db.execute(
          "SELECT id, content_type, outputs, created_at FROM content_command_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          [ctx.user.id, input.limit, input.offset]
        ));
        return histRows.map((r: any) => ({
          id: r.id,
          contentType: r.content_type,
          outputs: typeof r.outputs === "string" ? JSON.parse(r.outputs) : r.outputs,
          createdAt: r.created_at,
        }));
      } finally { db.end(); }
    }),
});
