/**
 * CONTENT FACTORY v3 — Rebuilt. All 6 types working.
 * Uses Replicate image → Pollo image-to-video (no broken text-to-video).
 * New: clone_series (6-scene arc), body_cinema_drop (AI-enhanced body focus).
 * Fixed: custom type GPT-4o JSON bug.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import OpenAI from "openai";
import { generateSpeech } from "../_core/tts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}
function rows(r: any): any[] {
  if (Array.isArray(r) && r.length >= 1 && Array.isArray(r[0])) return r[0] as any[];
  if (Array.isArray(r)) return r;
  return [];
}

const OWNER_IDS = [6, 33];
function ownerGuard(userId: number) {
  if (!OWNER_IDS.includes(userId)) throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
}

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_VERSION = process.env.REPLICATE_CLONE_VERSION || "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727";
const TRIGGER_WORD = process.env.REPLICATE_CLONE_TRIGGER_WORD || "fluxdevCam";
const POLLO_KEY = process.env.POLLO_API_KEY || "";
const POLLO_BASE = "https://pollo.ai/api/platform";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_KINGCAM = process.env.TELEGRAM_KINGCAM_CHAT_ID || "";
const TELEGRAM_OWNER = process.env.TELEGRAM_OWNER_CHAT_ID || "";

const ID_PREFIX = "KingCam reference-first identity lock: preserve exact hairstyle, hairline, hair length, hair texture, facial hair, jewelry, skin tone, face structure, body build";
const ID_SUFFIX = "paid clone output must match the submitted prompt and reference-media identity exactly";
const LOCKED_NEG = "wrong hairstyle, invented hairstyle, generic AI haircut, bald, shaved head, no hair, hat, beanie, hood, wrong glasses, light skin, thin build, no beard, clean shaven, extra fingers, fused fingers, deformed hands, warped face, duplicate face, bad anatomy, text artifacts, watermark, logo, blurry, uncanny valley";

function buildIdentityPrompt(scene: string): string {
  return `${TRIGGER_WORD} ${ID_PREFIX}, ${scene.replace(new RegExp(`\\b${TRIGGER_WORD}\\b`, "gi"), "").trim()}, ${ID_SUFFIX}`;
}

const BODY_CAMERA_PROMPTS: Record<string, string> = {
  abs:        "slow cinematic push tight on toned midsection, abs as hero, low angle looking up, dramatic side lighting, shallow depth of field, luxury film grade",
  waist:      "smooth orbital camera circling hourglass waist, side-light accentuating the curve, slow 180-degree arc, cinematic rim lighting, premium editorial",
  butt:       "low-angle push from behind, rear curves as hero, backlight creating halo silhouette on the arch, slow push in, cinematic heat grade",
  legs:       "slow vertical tilt from ankle up the full length of legs, elongating low angle, soft glamour lighting, premium film look",
  thighs:     "lateral tracking shot at thigh level, tight framing on inner thighs, soft boudoir lighting, shallow focus, intimate cinematic warmth",
  chest:      "slow tilt from collarbone down to chest, rack focus pulling onto decollete, rose-warm lighting, cinematic editorial quality",
  back:       "slow tilt down the spine from nape to lower back, backlight edge glow, cinematic noir grade, intimate reveal",
  lowerback:  "tight close-up push on lower back dimples, warm backlight halo, slow push in, cinematic luxury grade",
  hips:       "side tracking shot following hip sway in motion, parallax, neon-warm lighting, cinematic energy",
  face:       "extreme close-up orbit around jawline and lips, dramatic side light, soft skin glow, cinematic intimacy",
  silhouette: "full-body silhouette with strong backlight, 360-degree orbit, cinematic noir, every curve visible against the light",
  full:       "slow dolly-out reveal from tight body detail to full-frame wide shot, dramatic falloff lighting, premium cinematic grade",
  // Extended body features
  neck:       "slow tilt from jawline down the neck, intimate close-up, warm side lighting, cinematic beauty grade",
  shoulders:  "wide shot emphasizing shoulder line and posture, dramatic backlighting, editorial fashion aesthetic",
  stomach:    "tight close-up on stomach and navel area, warm cinematic lighting, shallow depth of field, intimate reveal",
  ankles:     "floor-level shot of ankles and feet, slow tilt up, elongating perspective, luxury editorial",
  hands:      "extreme close-up of hands and fingers, macro focus, warm intimate lighting, cinematic detail shot",
  lips:       "extreme macro close-up of lips, shallow focus, warm rose lighting, cinematic beauty grade",
  eyes:       "extreme close-up of eyes, dramatic side lighting, shallow depth of field, cinematic intimacy",
  curves:     "full-body shot emphasizing natural curves, side lighting, slow orbital camera, luxury editorial grade",
};

async function gptText(system: string, user: string, maxTokens = 600): Promise<string> {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: maxTokens,
  });
  return r.choices[0].message.content || "";
}

async function gptJson<T = any>(system: string, user: string, maxTokens = 800): Promise<T> {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system + "\n\nIMPORTANT: Respond with valid JSON only. No markdown fences, no explanation." },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });
  return JSON.parse(r.choices[0].message.content || "{}") as T;
}

async function replicateStart(prompt: string, w = 768, h = 1344): Promise<string> {
  if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });
  const r = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version: REPLICATE_VERSION, input: { prompt, negative_prompt: LOCKED_NEG, width: w, height: h, num_outputs: 1, guidance_scale: 3.5, num_inference_steps: 28, output_format: "png", output_quality: 100 } }),
  });
  if (!r.ok) throw new Error(`Replicate start: ${await r.text()}`);
  return (await r.json()).id;
}

async function replicatePoll(predId: string): Promise<string> {
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, { headers: { Authorization: `Token ${REPLICATE_TOKEN}` } });
    const d = await r.json();
    if (d.status === "succeeded" && d.output) return String(Array.isArray(d.output) ? d.output[0] : d.output);
    if (d.status === "failed" || d.status === "canceled") throw new Error(`Replicate failed: ${d.error || "unknown"}`);
  }
  throw new Error("Replicate timeout");
}

async function generateImages(scene: string, count = 4, w = 768, h = 1344): Promise<string[]> {
  const prompt = buildIdentityPrompt(scene);
  const ids = await Promise.all(Array.from({ length: count }, () => replicateStart(prompt, w, h)));
  return Promise.all(ids.map(id => replicatePoll(id)));
}

// Pollo image-to-video — the ONLY working Pollo path
async function polloAnimate(imageUrl: string, motionPrompt: string, resolution = "720p", secs = 5): Promise<string> {
  if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });
  const r = await fetch(`${POLLO_BASE}/generation/pollo/pollo-v1-6`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { image: imageUrl, prompt: motionPrompt, resolution, length: secs, mode: "basic" } }),
  });
  if (!r.ok) throw new Error(`Pollo: ${await r.text()}`);
  const job = await r.json();
  const jobId = job?.data?.taskId || job?.id || job?.task_id;
  if (!jobId) throw new Error(`Pollo no taskId: ${JSON.stringify(job)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await fetch(`${POLLO_BASE}/generation/${jobId}/status`, { headers: { "x-api-key": POLLO_KEY } });
    if (!poll.ok) continue;
    const result = await poll.json();
    const gen = result?.data?.generations?.[0];
    const status = String(gen?.status || result?.data?.status || "").toLowerCase();
    const url = gen?.url || result?.url;
    if ((status === "succeed" || status === "succeeded" || status === "completed") && url) return url;
    if (status === "failed" || status === "fail" || status === "error") throw new Error(`Pollo failed: ${gen?.failMsg || status}`);
  }
  throw new Error("Pollo timeout");
}

async function sendTelegram(channelId: string, caption: string, mediaUrl?: string, isVideo = false): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !channelId) return false;
  const endpoint = mediaUrl ? (isVideo ? "sendVideo" : "sendPhoto") : "sendMessage";
  const body: Record<string, any> = { chat_id: channelId, parse_mode: "Markdown" };
  if (mediaUrl) { body[isVideo ? "video" : "photo"] = mediaUrl; body.caption = caption.slice(0, 1024); }
  else { body.text = caption.slice(0, 4096); }
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.ok;
}

interface FullCopySuite {
  hook: string; caption: string; dmOpener: string; ppvTeaser: string;
  tiktokHook: string; instagramCaption: string; twitterPost: string; telegramBlast: string;
  hookVariants: string[]; postingSchedule: string; urgencyLine: string; pricingAnchor: string;
  // Extended outputs
  smsBlast?: string; emailSubject?: string; storyCaption?: string; redditPost?: string;
}

async function generateCopySuite(context: string, platform = "all", price = 29): Promise<FullCopySuite> {
  return gptJson<FullCopySuite>(
    `You are an elite adult creator content strategist. Generate a complete multi-platform copy suite that converts.
     Tone: premium, direct, money-aware, luxury boss energy. Every line should stop the scroll and drive action.
     Return JSON with exactly these keys:
     hook (punchy under 80 chars),
     caption (2-3 sentences premium tone),
     dmOpener (DM message under 150 chars),
     ppvTeaser (PPV unlock teaser under 100 chars),
     tiktokHook (TikTok-optimized under 80 chars),
     instagramCaption (3-4 sentences + hashtags),
     twitterPost (under 280 chars),
     telegramBlast (bold, emoji, 300-500 chars, ends with CTA),
     hookVariants (array of 5 alternative hooks for A/B testing — not 3, FIVE),
     postingSchedule (best times to post, 2-3 sentences),
     urgencyLine (scarcity/urgency under 80 chars),
     pricingAnchor (price justification under 100 chars),
     smsBlast (SMS-optimized under 160 chars),
     emailSubject (email subject line under 60 chars),
     storyCaption (Instagram/Snapchat story caption under 50 chars),
     redditPost (Reddit-style post title under 100 chars)`,
    `Context: ${context}. Platform: ${platform}. Price: $${price}. Make every line convert. Be specific, not generic.`,
    1800
  );
}

async function saveHistory(userId: number, contentType: string, outputs: any): Promise<number> {
  const db = await getDb();
  try {
    const [result] = await db.execute("INSERT INTO content_command_history (user_id, content_type, outputs) VALUES (?, ?, ?)", [userId, contentType, JSON.stringify(outputs)]) as any;
    return result?.insertId || 0;
  } catch { return 0; } finally { db.end(); }
}

export const contentCommandRouter = router({

  generateContent: protectedProcedure
    .input(z.object({
      contentType: z.enum(["clone_drop", "clone_series", "body_cinema_drop", "social_post", "creator_campaign", "telegram_blast", "custom"]),
      brief: z.record(z.string(), z.any()).default({}),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const { contentType, brief } = input;

      switch (contentType) {

        case "clone_drop": {
          const scene = String(brief.scene || "dark luxury throne room, dramatic spotlight, cinematic premium atmosphere");
          const platform = String(brief.platform || "OnlyFans");
          const imageCount = Math.min(8, Math.max(1, parseInt(String(brief.imageCount || "4"))));
          const withVoice = Boolean(brief.withVoice);
          const [images, copySuite] = await Promise.all([
            generateImages(scene, imageCount),
            generateCopySuite(`KingCam clone drop. Scene: ${scene}`, platform),
          ]);
          const videoUrl = await polloAnimate(images[0], `slow cinematic push, dramatic luxury lighting, KingCam presence, premium film look`).catch(() => null);
          let voiceUrl: string | null = null;
          if (withVoice) {
            try { const r = await generateSpeech(copySuite.hook, { voice: "kingcam" }); voiceUrl = r.audioUrl; } catch {}
          }
          const result = { type: "clone_drop", scene, platform, images, videoUrl, voiceUrl, copySuite, primaryImage: images[0] };
          await saveHistory(ctx.user.id, "clone_drop", result);
          return result;
        }

        case "clone_series": {
          const theme = String(brief.theme || "luxury empire");
          const platform = String(brief.platform || "OnlyFans");
          const seriesPlan = await gptJson<{
            title: string; arc: string;
            scenes: Array<{ id: number; name: string; prompt: string; caption: string; bodyFocus: string }>;
            seriesHook: string; seriesCTA: string;
          }>(
            `You are an elite adult creator content director. Design a 6-scene content series with a narrative arc.
             Arc: hook → intrigue → build → peak → tease → CTA. Each scene builds on the last.
             Return JSON: title, arc (1 sentence), scenes (array of 6 with id/name/prompt/caption/bodyFocus), seriesHook, seriesCTA`,
            `Theme: ${theme}. Platform: ${platform}. Creator: KingCam (Black male, luxury boss). Make it cinematic and converting.`,
            1500
          );
          const sceneImages = await Promise.all(
            seriesPlan.scenes.map(s => replicateStart(buildIdentityPrompt(s.prompt)).then(id => replicatePoll(id)))
          );
          const [hookVideo, peakVideo] = await Promise.all([
            polloAnimate(sceneImages[0], `slow cinematic push, dramatic luxury lighting, premium film look`).catch(() => null),
            polloAnimate(sceneImages[3] || sceneImages[0], `slow cinematic reveal, dramatic lighting, body focus, premium film look`).catch(() => null),
          ]);
          const result = {
            type: "clone_series", theme, platform, seriesPlan, hookVideo, peakVideo,
            scenes: seriesPlan.scenes.map((s, i) => ({ ...s, imageUrl: sceneImages[i], videoUrl: i === 0 ? hookVideo : i === 3 ? peakVideo : null })),
          };
          await saveHistory(ctx.user.id, "clone_series", result);
          return result;
        }

        case "body_cinema_drop": {
          const bodyFocus = String(brief.bodyFocus || "silhouette");
          const vibe = String(brief.vibe || "cinematic_heat");
          const sourceImageUrl = String(brief.sourceImageUrl || "");
          const price = parseFloat(String(brief.price || "29")) || 29;
          const baseScene = BODY_CAMERA_PROMPTS[bodyFocus] || BODY_CAMERA_PROMPTS.full;
          const [enhancedPrompt, copySuite] = await Promise.all([
            gptText(
              `You are a world-class cinematographer writing prompts for AI video generation. Write the most cinematic, converting prompt possible. Under 200 words. No generic phrases.`,
              `Base scene: ${baseScene}. Body focus: ${bodyFocus}. Vibe: ${vibe}. Write the perfect Pollo image-to-video prompt.`,
              200
            ),
            generateCopySuite(`Body cinema drop. Focus: ${bodyFocus}. Vibe: ${vibe}. Price: $${price}`, "all", price),
          ]);
          let imageUrl: string;
          if (sourceImageUrl) {
            imageUrl = sourceImageUrl;
          } else {
            const predId = await replicateStart(buildIdentityPrompt(enhancedPrompt));
            imageUrl = await replicatePoll(predId);
          }
          const videoUrl = await polloAnimate(imageUrl, enhancedPrompt).catch(() => null);
          const result = { type: "body_cinema_drop", bodyFocus, vibe, enhancedPrompt, imageUrl, videoUrl, copySuite, price };
          await saveHistory(ctx.user.id, "body_cinema_drop", result);
          return result;
        }

        case "social_post": {
          const topic = String(brief.topic || "luxury lifestyle drop");
          const platform = String(brief.platform || "all");
          const price = parseFloat(String(brief.price || "29")) || 29;
          const scenePrompt = `${TRIGGER_WORD} ${ID_PREFIX}, ${topic}, luxury editorial, cinematic, premium atmosphere`;
          const [predId, copySuite] = await Promise.all([
            replicateStart(scenePrompt),
            generateCopySuite(topic, platform, price),
          ]);
          const imageUrl = await replicatePoll(predId);
          const videoUrl = await polloAnimate(imageUrl, `slow cinematic push, luxury atmosphere, premium film look, ${topic}`).catch(() => null);
          const result = { type: "social_post", topic, platform, imageUrl, videoUrl, copySuite, price };
          await saveHistory(ctx.user.id, "social_post", result);
          return result;
        }

        case "creator_campaign": {
          const creatorName = String(brief.creatorName || "Creator");
          const contentType = String(brief.contentType || "Video");
          const ppvPrice = parseFloat(String(brief.ppvPrice || "29")) || 29;
          const platforms: string[] = Array.isArray(brief.platforms) ? brief.platforms : ["VaultX", "Telegram"];
          const autoPost = Boolean(brief.autoPost);
          const scenePrompt = `${TRIGGER_WORD} ${ID_PREFIX}, luxury creator campaign, dark premium atmosphere, cinematic`;
          const [campaignPack, predId] = await Promise.all([
            gptJson<{ headline: string; teaserCaption: string; dmSequence: string[]; ppvUnlockLine: string; telegramBlast: string; twitterTeaser: string; instagramCaption: string; pricingAnchor: string; urgencyLine: string; hookVariants: string[] }>(
              `You are a premium adult creator campaign strategist. Return JSON with keys: headline, teaserCaption, dmSequence (array of 3), ppvUnlockLine, telegramBlast, twitterTeaser, instagramCaption, pricingAnchor, urgencyLine, hookVariants (array of 3)`,
              `Creator: ${creatorName}. Content: ${contentType}. Price: $${ppvPrice}. Platforms: ${platforms.join(", ")}.`,
              1200
            ),
            replicateStart(scenePrompt),
          ]);
          const imageUrl = await replicatePoll(predId);
          const videoUrl = await polloAnimate(imageUrl, `slow cinematic push, luxury atmosphere, premium film look`).catch(() => null);
          let telegramSent = false;
          if (autoPost && TELEGRAM_TOKEN && TELEGRAM_KINGCAM) {
            telegramSent = await sendTelegram(TELEGRAM_KINGCAM, campaignPack.telegramBlast, videoUrl || imageUrl, !!videoUrl);
          }
          const result = { type: "creator_campaign", creatorName, ppvPrice, platforms, imageUrl, videoUrl, campaignPack, telegramSent };
          await saveHistory(ctx.user.id, "creator_campaign", result);
          return result;
        }

        case "telegram_blast": {
          const message = String(brief.message || "New drop just landed. Link in bio.");
          const channels: string[] = Array.isArray(brief.channels) ? brief.channels : ["kingcam"];
          const abTest = Boolean(brief.abTest);
          const [messageA, messageB] = await Promise.all([
            gptText(`You are KingCam's Telegram content writer. Write a punchy, converting Telegram message. Bold text, emojis, CTA at end. Under 400 chars.`, `Message: ${message}. Variant A — direct and urgent.`, 200),
            abTest ? gptText(`You are KingCam's Telegram content writer. Write a punchy, converting Telegram message. Bold text, emojis, CTA at end. Under 400 chars.`, `Message: ${message}. Variant B — mysterious and exclusive.`, 200) : Promise.resolve(null),
          ]);
          const sent: Record<string, boolean> = {};
          const channelMap: Record<string, string> = { kingcam: TELEGRAM_KINGCAM, owner: TELEGRAM_OWNER };
          for (const ch of channels) { const cid = channelMap[ch]; if (cid) sent[ch] = await sendTelegram(cid, messageA); }
          const result = { type: "telegram_blast", messageA, messageB, channels, sent, totalSent: Object.values(sent).filter(Boolean).length };
          await saveHistory(ctx.user.id, "telegram_blast", result);
          return result;
        }

        case "custom": {
          const description = String(brief.description || "");
          if (!description) throw new TRPCError({ code: "BAD_REQUEST", message: "Description required for custom content" });
          const plan = await gptJson<{ contentType: string; reasoning: string; steps: string[]; copyPack: { hook: string; caption: string; telegramBlast: string; dmOpener: string; ppvTeaser: string }; imagePrompt: string; videoPrompt: string; recommendations: string[] }>(
            `You are KingCam's AI content director. Analyze the request and create a complete content plan. Return JSON with keys: contentType, reasoning, steps (array), copyPack (object with hook/caption/telegramBlast/dmOpener/ppvTeaser), imagePrompt, videoPrompt, recommendations (array)`,
            `Request: ${description}. Creator: KingCam (Black male, luxury boss, premium creator). Platform: CreatorVault/VaultX.`,
            1000
          );
          let imageUrl: string | null = null;
          let videoUrl: string | null = null;
          try {
            const predId = await replicateStart(buildIdentityPrompt(plan.imagePrompt));
            imageUrl = await replicatePoll(predId);
            if (imageUrl) videoUrl = await polloAnimate(imageUrl, plan.videoPrompt).catch(() => null);
          } catch {}
          const result = { type: "custom", description, plan, imageUrl, videoUrl };
          await saveHistory(ctx.user.id, "custom", result);
          return result;
        }

        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown content type: ${contentType}` });
      }
    }),

  generateBatch: protectedProcedure
    .input(z.object({
      contentType: z.enum(["clone_drop", "social_post", "telegram_blast"]),
      brief: z.record(z.string(), z.any()).default({}),
      count: z.number().min(1).max(10).default(3),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const variations = await Promise.all(
        Array.from({ length: input.count }, (_, i) =>
          generateCopySuite(`${String(input.brief.scene || input.brief.topic || "luxury content")} — variation ${i + 1}`, String(input.brief.platform || "all"))
        )
      );
      return { variations, count: variations.length };
    }),

  postToTelegram: protectedProcedure
    .input(z.object({
      channel: z.enum(["kingcam", "owner", "both"]),
      caption: z.string(),
      mediaUrl: z.string().optional(),
      isVideo: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const results: Record<string, boolean> = {};
      if (input.channel === "kingcam" || input.channel === "both") results.kingcam = await sendTelegram(TELEGRAM_KINGCAM, input.caption, input.mediaUrl, input.isVideo);
      if (input.channel === "owner" || input.channel === "both") results.owner = await sendTelegram(TELEGRAM_OWNER, input.caption, input.mediaUrl, input.isVideo);
      return { results, totalSent: Object.values(results).filter(Boolean).length };
    }),

  saveToVault: protectedProcedure
    .input(z.object({ url: z.string().url(), assetType: z.enum(["video", "image", "voice"]), title: z.string().optional(), contentType: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        await db.execute("INSERT INTO vault_assets (id, user_id, asset_type, url, title, source, created_at) VALUES (UUID(), ?, ?, ?, ?, \'content_command\', NOW())", [ctx.user.id, input.assetType, input.url, input.title || `Content Command ${input.assetType}`]).catch(() => {});
        return { success: true };
      } finally { db.end(); }
    }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(20), offset: z.number().min(0).default(0), contentType: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        const whereType = input.contentType ? "AND content_type = ?" : "";
        const params: any[] = [ctx.user.id];
        if (input.contentType) params.push(input.contentType);
        const safeLimit = Math.max(1, Math.min(500, Math.floor(input.limit)));
        const safeOffset = Math.max(0, Math.floor(input.offset));
        const histRows = rows(await db.query(`SELECT id, content_type, outputs, created_at FROM content_command_history WHERE user_id = ? ${whereType} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`, params));
        return histRows.map((r: any) => ({ id: r.id, contentType: r.content_type, outputs: typeof r.outputs === "string" ? JSON.parse(r.outputs) : r.outputs, createdAt: r.created_at }));
      } finally { db.end(); }
    }),

  remixContent: protectedProcedure
    .input(z.object({ historyId: z.number(), variation: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        const histRows = rows(await db.execute("SELECT content_type, outputs FROM content_command_history WHERE id = ? AND user_id = ?", [input.historyId, ctx.user.id]));
        if (!histRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
        const prev = typeof histRows[0].outputs === "string" ? JSON.parse(histRows[0].outputs) : histRows[0].outputs;
        const variationNote = input.variation || "Make it more aggressive and money-focused";
        const remixedCopy = await generateCopySuite(`${prev.scene || prev.topic || "creator content"}. ${variationNote}`, prev.platform || "all");
        const result = { ...prev, copySuite: remixedCopy, remixNote: variationNote };
        await saveHistory(ctx.user.id, prev.type || "remix", result);
        return result;
      } finally { db.end(); }
    }),

  distributeAll: protectedProcedure
    .input(z.object({ caption: z.string(), videoUrl: z.string().optional(), imageUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const mediaUrl = input.videoUrl || input.imageUrl;
      const isVideo = !!input.videoUrl;
      const results: Record<string, boolean> = {};
      results.kingcam = await sendTelegram(TELEGRAM_KINGCAM, input.caption, mediaUrl, isVideo);
      results.owner = await sendTelegram(TELEGRAM_OWNER, input.caption, mediaUrl, isVideo);
      return { results, totalSent: Object.values(results).filter(Boolean).length };
    }),
});
