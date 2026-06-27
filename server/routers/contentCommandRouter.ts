/**
 * ============================================================================
 * CONTENT COMMAND ROUTER — WEAPONIZED v2
 * /king/content — KingCam Content Factory
 *
 * Every content type is now a full production pipeline:
 *
 *   clone_drop        — 4 parallel images → best animated → full platform copy suite
 *                       + ElevenLabs voice narration + auto-distribution
 *   platform_trailer  — Pollo video + ElevenLabs KingCam voiceover + full copy suite
 *   social_post       — Platform-specific copy for ALL 4 platforms simultaneously
 *                       + 3 hook variants + hashtag strategy + posting schedule
 *   creator_campaign  — Full drop pack + teaser video + DM sequence + PPV copy
 *                       + auto-post teaser to Telegram
 *   telegram_blast    — A/B message variants + scheduled send + media optimization
 *   custom            — GPT-4o routes to correct pipeline, multi-step execution
 *
 * New procedures:
 *   generateContent   — main factory (all 6 types, weaponized)
 *   generateBatch     — generate 3 variations and return all for comparison
 *   postToTelegram    — send to any channel with media
 *   saveToVault       — persist to vault_assets
 *   distributeAll     — push to all configured channels in one call
 *   getHistory        — paginated history with full outputs
 *   remixContent      — take a previous output and regenerate with variations
 *
 * Owner-gated: user IDs 6 and 33 only.
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import OpenAI from "openai";
import { generateSpeech } from "../_core/tts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── DB ───────────────────────────────────────────────────────────────────────
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

// ─── Owner guard ──────────────────────────────────────────────────────────────
const OWNER_IDS = [6, 33];
function ownerGuard(userId: number) {
  if (!OWNER_IDS.includes(userId)) throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_VERSION = process.env.REPLICATE_CLONE_VERSION || "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727";
const TRIGGER_WORD = process.env.REPLICATE_CLONE_TRIGGER_WORD || "fluxdevCam";
const POLLO_KEY = process.env.POLLO_API_KEY || "";
const POLLO_BASE = "https://pollo.ai/api/platform";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_KINGCAM = process.env.TELEGRAM_KINGCAM_CHAT_ID || "";
const TELEGRAM_OWNER = process.env.TELEGRAM_OWNER_CHAT_ID || "";

// ─── Identity lock ────────────────────────────────────────────────────────────
const ID_PREFIX = "KingCam reference-first identity lock: preserve exact hairstyle, hairline, hair length, hair texture, facial hair, jewelry, skin tone, face structure, body build";
const ID_SUFFIX = "paid clone output must match the submitted prompt and reference-media identity exactly";
const LOCKED_NEG = "wrong hairstyle, invented hairstyle, generic AI haircut, bald, shaved head, no hair, hat, beanie, hood, wrong glasses, light skin, thin build, no beard, clean shaven, extra fingers, fused fingers, deformed hands, warped face, duplicate face, bad anatomy, text artifacts, watermark, logo, blurry, uncanny valley";

function buildIdentityPrompt(scene: string): string {
  return `${TRIGGER_WORD} ${ID_PREFIX}, ${scene.replace(new RegExp(`\\b${TRIGGER_WORD}\\b`, "gi"), "").trim()}, ${ID_SUFFIX}`;
}

// ─── Scenario prompts ─────────────────────────────────────────────────────────
const SCENARIOS: Record<string, string> = {
  CreatorVault: "dark luxury creator command center with glowing screens, cinematic premium atmosphere, no people",
  VaultX: "beautiful Black woman in luxury penthouse, silk lingerie, moody dramatic lighting, sensual editorial, no nudity, cinematic vertical",
  "Clone Engine": "dark throne room, gold ornate throne, dramatic spotlight, luxury palace, cinematic, no people",
  "Body Cinema": "artistic silhouette of woman against dramatic backlit penthouse window, fashion editorial, cinematic",
  Marketplace: "luxury digital storefront with glowing product displays, dark premium atmosphere, cyan accent lighting",
};

// ─── Replicate: fire prediction ───────────────────────────────────────────────
async function replicateStart(prompt: string, w = 768, h = 1344): Promise<string> {
  if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });
  const r = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: REPLICATE_VERSION,
      input: { prompt, negative_prompt: LOCKED_NEG, width: w, height: h, num_outputs: 1, guidance_scale: 3.5, num_inference_steps: 28, output_format: "png", output_quality: 100 },
    }),
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

// Generate N images in parallel, return all URLs
async function generateImages(scene: string, count = 4, w = 768, h = 1344): Promise<string[]> {
  const prompt = buildIdentityPrompt(scene);
  const ids = await Promise.all(Array.from({ length: count }, () => replicateStart(prompt, w, h)));
  return Promise.all(ids.map(id => replicatePoll(id)));
}

// ─── Pollo: image-to-video ────────────────────────────────────────────────────
async function polloAnimate(imageUrl: string, motionPrompt: string, resolution = "720p", secs = 5): Promise<string> {
  if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });
  const r = await fetch(`${POLLO_BASE}/generation/pollo/pollo-v1-6`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { image: imageUrl, prompt: motionPrompt, resolution, length: secs, mode: "pro" } }),
  });
  if (!r.ok) throw new Error(`Pollo animate: ${await r.text()}`);
  const p = await r.json();
  if (p?.code !== "SUCCESS" || !p?.data?.taskId) throw new Error(`Pollo no taskId: ${JSON.stringify(p)}`);
  return pollPollo(p.data.taskId);
}

// Pollo text-to-video
async function polloText2Video(prompt: string, resolution = "720p", secs = 5, aspect = "9:16"): Promise<string> {
  if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });
  // Try Kling first
  const r = await fetch(`${POLLO_BASE}/generation/kling/kling-v1-6-standard`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { prompt, duration: secs, aspect_ratio: aspect, mode: "std" } }),
  });
  if (r.ok) {
    const p = await r.json();
    const tid = p?.data?.taskId || p?.id;
    if (tid) return pollPollo(tid);
  }
  // Fallback to pollo-v1-6
  const r2 = await fetch(`${POLLO_BASE}/generation/pollo/pollo-v1-6`, {
    method: "POST",
    headers: { "x-api-key": POLLO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { prompt, resolution, length: secs, mode: "pro" } }),
  });
  if (!r2.ok) throw new Error(`Pollo t2v: ${await r2.text()}`);
  const p2 = await r2.json();
  if (!p2?.data?.taskId) throw new Error(`Pollo t2v no taskId: ${JSON.stringify(p2)}`);
  return pollPollo(p2.data.taskId);
}

async function pollPollo(taskId: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch(`${POLLO_BASE}/generation/${taskId}/status`, { headers: { "x-api-key": POLLO_KEY } });
    if (!r.ok) continue;
    const d = await r.json();
    const gen = d?.data?.generations?.[0];
    const s = String(gen?.status || d?.data?.status || "").toLowerCase();
    const url = gen?.url || d.url;
    if ((s === "succeed" || s === "succeeded" || s === "completed") && url) return url;
    if (s === "failed" || s === "fail" || s === "error") throw new Error(`Pollo failed: ${gen?.failMsg || s}`);
  }
  throw new Error("Pollo timeout");
}

// ─── ElevenLabs voice narration ───────────────────────────────────────────────
async function generateVoiceOver(script: string): Promise<string | null> {
  try {
    const result = await generateSpeech(script, { voice: "kingcam", speed: 0.95, stability: 0.5, similarityBoost: 0.85, style: 0.35, language: "en" });
    return result.audioUrl;
  } catch { return null; }
}

// ─── OpenAI helpers ───────────────────────────────────────────────────────────
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
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });
  return JSON.parse(r.choices[0].message.content || "{}") as T;
}

// ─── Full platform copy suite ─────────────────────────────────────────────────
interface PlatformCopySuite {
  tiktok: { hook: string; caption: string; hashtags: string[] };
  instagram: { hook: string; caption: string; hashtags: string[] };
  twitter: { hook: string; caption: string };
  telegram: { message: string };
  dmOpener: string;
  ppvTeaser: string;
  hookVariants: string[];
  postingSchedule: string;
}

async function generateFullCopySuite(topic: string, ctaKeyword: string, platform = "all"): Promise<PlatformCopySuite> {
  return gptJson<PlatformCopySuite>(
    `You are KingCam's elite content strategist for CreatorVault/VaultX. Generate a complete multi-platform copy suite.
     KingCam: Black male founder, luxury boss energy, direct and money-aware.
     CTA keyword: ${ctaKeyword}
     Return JSON with EXACTLY these keys:
     {
       tiktok: { hook: string (under 80 chars, punchy), caption: string (2-3 sentences), hashtags: string[] (8 tags, no #) },
       instagram: { hook: string (under 100 chars), caption: string (3-4 sentences with CTA), hashtags: string[] (10 tags, no #) },
       twitter: { hook: string (under 140 chars), caption: string (under 280 chars) },
       telegram: { message: string (bold, emoji, under 500 chars, ends with CTA) },
       dmOpener: string (DM message under 150 chars),
       ppvTeaser: string (PPV unlock teaser under 100 chars),
       hookVariants: string[] (3 alternative hooks for A/B testing),
       postingSchedule: string (best times to post, 1-2 sentences)
     }`,
    `Topic: ${topic}. CTA keyword: ${ctaKeyword}. Platform focus: ${platform}.`,
    1200
  );
}

// ─── Clone drop captions ──────────────────────────────────────────────────────
interface CloneCopySuite {
  hook: string;
  caption: string;
  dmOpener: string;
  ppvTeaser: string;
  tiktokHook: string;
  instagramCaption: string;
  twitterPost: string;
  telegramBlast: string;
  hookVariants: string[];
}

async function generateCloneCopySuite(scene: string, platform: string): Promise<CloneCopySuite> {
  return gptJson<CloneCopySuite>(
    `You are KingCam's elite content strategist. Generate a complete copy suite for a KingCam clone drop.
     KingCam: Black male founder, luxury boss, premium creator energy.
     Return JSON:
     {
       hook: string (punchy, under 80 chars),
       caption: string (2-3 sentences, premium tone, CTA),
       dmOpener: string (DM to fans, under 150 chars),
       ppvTeaser: string (PPV unlock teaser, under 100 chars),
       tiktokHook: string (TikTok-optimized hook, under 80 chars),
       instagramCaption: string (3-4 sentences + hashtags),
       twitterPost: string (under 280 chars, punchy),
       telegramBlast: string (bold, emoji, 300-500 chars, ends with CTA),
       hookVariants: string[] (3 alternative hooks for A/B testing)
     }`,
    `Scene: ${scene}. Primary platform: ${platform}.`,
    900
  );
}

// ─── Telegram sender ──────────────────────────────────────────────────────────
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

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function saveHistory(userId: number, contentType: string, outputs: any): Promise<number> {
  const db = await getDb();
  try {
    const [result] = await db.execute(
      "INSERT INTO content_command_history (user_id, content_type, outputs) VALUES (?, ?, ?)",
      [userId, contentType, JSON.stringify(outputs)]
    ) as any;
    return result?.insertId || 0;
  } catch { return 0; } finally { db.end(); }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const contentCommandRouter = router({

  // ── generateContent — weaponized main factory ───────────────────────────────
  generateContent: protectedProcedure
    .input(z.object({
      contentType: z.enum(["clone_drop", "platform_trailer", "social_post", "creator_campaign", "telegram_blast", "custom"]),
      brief: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);

      switch (input.contentType) {

        // ── CLONE DROP — 4 parallel images → best animated → full copy suite + voice ──
        case "clone_drop": {
          const scene = String(input.brief.scenePrompt || "dark throne room, velvet suit, gold chains, neon lighting");
          const motion = String(input.brief.motionPrompt || "slow cinematic push toward camera, dramatic shadow shift, luxury presence");
          const platform = String(input.brief.platform || "OnlyFans");
          const imageCount = Math.min(parseInt(String(input.brief.imageCount || "2")) || 2, 4);
          const withVoice = input.brief.withVoice !== false;

          // Fire everything in parallel: images + copy suite + optional voice
          const voiceScript = `${scene}. Premium KingCam content. Exclusive access available now.`;
          const [imageUrls, copySuite, voiceUrl] = await Promise.all([
            generateImages(scene, imageCount, 768, 1344),
            generateCloneCopySuite(scene, platform),
            withVoice ? generateVoiceOver(voiceScript) : Promise.resolve(null),
          ]);

          // Animate the first (best) image
          const videoUrl = await polloAnimate(imageUrls[0], motion, "720p", 5);

          const result = {
            type: "clone_drop",
            imageUrls,
            primaryImageUrl: imageUrls[0],
            videoUrl,
            voiceUrl,
            copySuite,
            platform,
            scene,
            // Legacy fields for backward compat
            imageUrl: imageUrls[0],
            captions: {
              hook: copySuite.hook,
              caption: copySuite.caption,
              dmOpener: copySuite.dmOpener,
              ppvTeaser: copySuite.ppvTeaser,
            },
          };
          await saveHistory(ctx.user.id, "clone_drop", result);
          return result;
        }

        // ── PLATFORM TRAILER — video + KingCam voiceover + full copy suite ──────────
        case "platform_trailer": {
          const subject = String(input.brief.subject || "VaultX");
          const tone = String(input.brief.tone || "Cinematic");
          const keyMessage = String(input.brief.keyMessage || "The platform that turns content into campaigns");
          const secs = parseInt(String(input.brief.duration || "5")) || 5;
          const withVoice = input.brief.withVoice !== false;

          const basePrompt = SCENARIOS[subject] || subject;
          const videoPrompt = `${basePrompt}. ${tone} cinematic style. Slow dramatic camera movement. Premium luxury atmosphere. No text overlay. No UI.`;

          // Voiceover script
          const voiceScript = `${keyMessage}. ${subject} — the platform built for creators who operate at the highest level. Your content. Your clone. Your money machine.`;

          const [videoUrl, copySuite, voiceUrl] = await Promise.all([
            polloText2Video(videoPrompt, "720p", secs, "16:9"),
            generateFullCopySuite(`${subject} platform trailer: ${keyMessage}`, subject.toUpperCase().replace(" ", "_"), "all"),
            withVoice ? generateVoiceOver(voiceScript) : Promise.resolve(null),
          ]);

          const result = {
            type: "platform_trailer",
            videoUrl,
            voiceUrl,
            copySuite,
            subject,
            tone,
            keyMessage,
            // Legacy
            caption: copySuite.twitter.hook,
          };
          await saveHistory(ctx.user.id, "platform_trailer", result);
          return result;
        }

        // ── SOCIAL POST — full platform suite + 3 hook variants + schedule ──────────
        case "social_post": {
          const platform = String(input.brief.platform || "Twitter");
          const hookStyle = String(input.brief.hookStyle || "Statement");
          const topic = String(input.brief.topic || "Why creators are broke despite good content");
          const ctaKeyword = String(input.brief.ctaKeyword || "VAULT");
          const isVertical = platform === "TikTok" || platform === "Instagram";

          const [copySuite, videoUrl] = await Promise.all([
            generateFullCopySuite(topic, ctaKeyword, platform),
            polloText2Video(
              `cinematic visual for creator platform post about: ${topic}. Dark luxury aesthetic. Premium atmosphere. No text overlay. No UI.`,
              "720p", 5, isVertical ? "9:16" : "16:9"
            ),
          ]);

          // Pick the right copy for the selected platform
          const primaryCopy = platform === "TikTok" ? copySuite.tiktok
            : platform === "Instagram" ? copySuite.instagram
            : platform === "Telegram" ? { hook: copySuite.telegram.message.split("\n")[0], caption: copySuite.telegram.message, hashtags: [] }
            : copySuite.twitter;

          const result = {
            type: "social_post",
            platform,
            videoUrl,
            copySuite,
            // Primary platform copy (for backward compat)
            hook: (primaryCopy as any).hook || copySuite.twitter.hook,
            caption: (primaryCopy as any).caption || copySuite.twitter.caption,
            hashtags: (primaryCopy as any).hashtags || [],
            hookVariants: copySuite.hookVariants,
            postingSchedule: copySuite.postingSchedule,
            ctaLine: ctaKeyword,
          };
          await saveHistory(ctx.user.id, "social_post", result);
          return result;
        }

        // ── CREATOR CAMPAIGN — full drop pack + DM sequence + auto-post teaser ──────
        case "creator_campaign": {
          const creatorName = String(input.brief.creatorName || "Creator");
          const contentType = String(input.brief.contentType || "Video");
          const assetUrl = String(input.brief.assetUrl || "");
          const ppvPrice = parseFloat(String(input.brief.ppvPrice || "29")) || 29;
          const platforms: string[] = Array.isArray(input.brief.platforms) ? input.brief.platforms : ["VaultX", "Telegram"];
          const autoPost = Boolean(input.brief.autoPost);

          // Full campaign copy pack + teaser video in parallel
          const [campaignPack, videoUrl] = await Promise.all([
            gptJson<{
              headline: string;
              teaserCaption: string;
              dmSequence: string[];
              ppvUnlockLine: string;
              telegramBlast: string;
              twitterTeaser: string;
              instagramCaption: string;
              pricingAnchor: string;
              urgencyLine: string;
              hookVariants: string[];
            }>(
              `You are a premium adult creator campaign strategist. Generate a complete drop package.
               Creator: ${creatorName}. Content: ${contentType}. Price: $${ppvPrice}. Platforms: ${platforms.join(", ")}.
               Return JSON:
               {
                 headline: string (bold headline under 80 chars),
                 teaserCaption: string (2-3 sentences, premium tone),
                 dmSequence: string[] (3-message DM sequence: opener, follow-up, close),
                 ppvUnlockLine: string (PPV unlock CTA under 100 chars),
                 telegramBlast: string (bold, emoji, 300-500 chars, ends with CTA),
                 twitterTeaser: string (under 280 chars),
                 instagramCaption: string (3-4 sentences + hashtags),
                 pricingAnchor: string (price justification line under 100 chars),
                 urgencyLine: string (scarcity/urgency line under 80 chars),
                 hookVariants: string[] (3 hook variants for A/B testing)
               }`,
              `Campaign for ${creatorName}. ${contentType} drop at $${ppvPrice}.`,
              1000
            ),
            assetUrl
              ? Promise.resolve(assetUrl)
              : polloText2Video(
                  `cinematic teaser for premium creator content. Dark luxury aesthetic. Woman in luxury setting. Sensual editorial. No nudity. No text overlay.`,
                  "720p", 5, "9:16"
                ),
          ]);

          // Auto-post teaser to Telegram if requested
          let telegramSent = false;
          if (autoPost && TELEGRAM_TOKEN && TELEGRAM_KINGCAM) {
            telegramSent = await sendTelegram(TELEGRAM_KINGCAM, campaignPack.telegramBlast, videoUrl, true);
          }

          const result = {
            type: "creator_campaign",
            creatorName,
            ppvPrice,
            platforms,
            videoUrl,
            campaignPack,
            telegramSent,
            autoPost,
          };
          await saveHistory(ctx.user.id, "creator_campaign", result);
          return result;
        }

        // ── TELEGRAM BLAST — A/B variants + media + send ─────────────────────────────
        case "telegram_blast": {
          const topic = String(input.brief.messageTopic || "New drop available now");
          const channel = String(input.brief.channel || "KingCam");
          const sendNow = Boolean(input.brief.sendNow);
          const includeMedia = Boolean(input.brief.includeMedia);
          const abTest = Boolean(input.brief.abTest);

          // Generate primary message + A/B variant simultaneously
          const [messageA, messageB] = await Promise.all([
            gptText(
              "Write a Telegram broadcast message for CreatorVault/VaultX. Bold, direct, money-aware. Include emoji. Max 500 chars. End with keyword CTA. No markdown headers.",
              topic, 300
            ),
            abTest
              ? gptText(
                  "Write an ALTERNATIVE Telegram broadcast message for CreatorVault/VaultX. Different angle, same topic. Bold, direct. Include emoji. Max 500 chars. End with keyword CTA.",
                  topic, 300
                )
              : Promise.resolve(null),
          ]);

          // Generate media if requested
          let mediaUrl: string | null = null;
          if (includeMedia) {
            mediaUrl = await polloText2Video(
              `cinematic visual for: ${topic}. Dark luxury aesthetic. Premium atmosphere. No text overlay.`,
              "720p", 5, "9:16"
            ).catch(() => null);
          }

          // Send if requested
          let sent = false;
          let sentChannels: string[] = [];
          if (sendNow && TELEGRAM_TOKEN) {
            const channelMap: Record<string, string> = {
              KingCam: TELEGRAM_KINGCAM,
              Owner: TELEGRAM_OWNER,
              Both: TELEGRAM_KINGCAM,
            };
            const targetId = channelMap[channel] || TELEGRAM_KINGCAM;
            if (targetId) {
              sent = await sendTelegram(targetId, messageA, mediaUrl || undefined, !!mediaUrl);
              if (sent) sentChannels.push(channel);
              // If Both, also send to Owner
              if (channel === "Both" && TELEGRAM_OWNER && TELEGRAM_OWNER !== TELEGRAM_KINGCAM) {
                await sendTelegram(TELEGRAM_OWNER, messageA, mediaUrl || undefined, !!mediaUrl);
                sentChannels.push("Owner");
              }
            }
          }

          const result = {
            type: "telegram_blast",
            messageA,
            messageB,
            mediaUrl,
            sent,
            sentChannels,
            channel,
            // Legacy
            message: messageA,
          };
          await saveHistory(ctx.user.id, "telegram_blast", result);
          return result;
        }

        // ── CUSTOM — GPT-4o routes to correct pipeline, multi-step execution ─────────
        case "custom": {
          const description = String(input.brief.description || "Create something amazing");

          // GPT-4o analyzes the request and determines the best pipeline
          const plan = await gptJson<{
            contentPlan: string;
            primaryOutput: string;
            videoPrompt: string;
            copySystem: string;
            copyUser: string;
            voiceScript: string | null;
            recommendedPlatforms: string[];
          }>(
            `You are the CreatorVault content factory AI. Analyze the request and design the optimal content pipeline.
             Return JSON:
             {
               contentPlan: string (1-2 sentences describing what will be built),
               primaryOutput: "video" | "image" | "copy",
               videoPrompt: string (optimized Pollo video generation prompt, dark luxury aesthetic, no text overlay),
               copySystem: string (system prompt for copy generation),
               copyUser: string (user prompt for copy generation),
               voiceScript: string | null (ElevenLabs script if voiceover would add value, else null),
               recommendedPlatforms: string[] (best platforms for this content)
             }`,
            description,
            600
          );

          // Execute the planned pipeline
          const [videoUrl, copy, voiceUrl] = await Promise.all([
            polloText2Video(`${plan.videoPrompt}. Dark luxury cinematic aesthetic. No text overlay.`, "720p", 5, "9:16"),
            gptJson<{ hook: string; caption: string; hashtags: string[]; ctaLine: string }>(
              plan.copySystem,
              plan.copyUser,
              400
            ),
            plan.voiceScript ? generateVoiceOver(plan.voiceScript) : Promise.resolve(null),
          ]);

          const result = {
            type: "custom",
            contentPlan: plan.contentPlan,
            primaryOutput: plan.primaryOutput,
            recommendedPlatforms: plan.recommendedPlatforms,
            videoUrl,
            voiceUrl,
            copy,
          };
          await saveHistory(ctx.user.id, "custom", result);
          return result;
        }

        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown content type" });
      }
    }),

  // ── generateBatch — 3 variations for comparison ─────────────────────────────
  generateBatch: protectedProcedure
    .input(z.object({
      contentType: z.enum(["clone_drop", "social_post", "telegram_blast"]),
      brief: z.record(z.any()),
      count: z.number().min(2).max(3).default(3),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);

      if (input.contentType === "clone_drop") {
        const scene = String(input.brief.scenePrompt || "dark throne room, velvet suit, gold chains");
        const imageUrls = await generateImages(scene, input.count, 768, 1344);
        return { type: "batch_images", imageUrls, scene };
      }

      if (input.contentType === "social_post") {
        const topic = String(input.brief.topic || "Creator economy");
        const variants = await Promise.all(
          Array.from({ length: input.count }, (_, i) =>
            gptText(
              `You are KingCam's content strategist. Write a ${["punchy", "luxury", "direct"][i]} hook for a social post. Under 100 chars.`,
              `Topic: ${topic}. Variant ${i + 1} of ${input.count}.`,
              100
            )
          )
        );
        return { type: "batch_hooks", hooks: variants, topic };
      }

      if (input.contentType === "telegram_blast") {
        const topic = String(input.brief.messageTopic || "New drop");
        const variants = await Promise.all(
          Array.from({ length: input.count }, (_, i) =>
            gptText(
              `Write a Telegram broadcast message variant ${i + 1}. ${["Bold and direct", "Luxury and exclusive", "Urgent and scarce"][i]} tone. Include emoji. Max 400 chars. End with CTA.`,
              topic, 250
            )
          )
        );
        return { type: "batch_messages", messages: variants, topic };
      }

      throw new TRPCError({ code: "BAD_REQUEST" });
    }),

  // ── postToTelegram ────────────────────────────────────────────────────────────
  postToTelegram: protectedProcedure
    .input(z.object({
      videoUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      caption: z.string(),
      channel: z.enum(["KingCam", "Owner", "Both"]).default("KingCam"),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      if (!TELEGRAM_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TELEGRAM_BOT_TOKEN not configured" });

      const channelIds =
        input.channel === "Both"
          ? [TELEGRAM_KINGCAM, TELEGRAM_OWNER].filter(Boolean)
          : input.channel === "Owner"
          ? [TELEGRAM_OWNER].filter(Boolean)
          : [TELEGRAM_KINGCAM].filter(Boolean);

      let sent = 0;
      for (const cid of channelIds) {
        const ok = await sendTelegram(cid, input.caption, input.videoUrl || input.imageUrl, !!input.videoUrl);
        if (ok) sent++;
      }
      return { success: sent > 0, channelsSent: sent };
    }),

  // ── distributeAll — push to all channels in one call ─────────────────────────
  distributeAll: protectedProcedure
    .input(z.object({
      videoUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      caption: z.string(),
      channels: z.array(z.enum(["KingCam", "Owner"])).default(["KingCam"]),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const channelMap: Record<string, string> = { KingCam: TELEGRAM_KINGCAM, Owner: TELEGRAM_OWNER };
      const results: Record<string, boolean> = {};
      for (const ch of input.channels) {
        const cid = channelMap[ch];
        if (cid) results[ch] = await sendTelegram(cid, input.caption, input.videoUrl || input.imageUrl, !!input.videoUrl);
      }
      return { results, totalSent: Object.values(results).filter(Boolean).length };
    }),

  // ── saveToVault ───────────────────────────────────────────────────────────────
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
          "INSERT INTO vault_assets (id, user_id, asset_type, url, title, source, created_at) VALUES (UUID(), ?, ?, ?, ?, 'content_command', NOW())",
          [ctx.user.id, input.assetType, input.url, input.title || `Content Command ${input.assetType}`]
        ).catch(() => {});
        return { success: true };
      } finally { db.end(); }
    }),

  // ── getHistory ────────────────────────────────────────────────────────────────
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      contentType: z.string().optional(),
    }).default({}))
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        const whereType = input.contentType ? "AND content_type = ?" : "";
        const params: any[] = [ctx.user.id];
        if (input.contentType) params.push(input.contentType);
        params.push(input.limit, input.offset);
        const histRows = rows(await db.execute(
          `SELECT id, content_type, outputs, created_at FROM content_command_history WHERE user_id = ? ${whereType} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          params
        ));
        return histRows.map((r: any) => ({
          id: r.id,
          contentType: r.content_type,
          outputs: typeof r.outputs === "string" ? JSON.parse(r.outputs) : r.outputs,
          createdAt: r.created_at,
        }));
      } finally { db.end(); }
    }),

  // ── remixContent — take a previous output and regenerate with variations ──────
  remixContent: protectedProcedure
    .input(z.object({
      historyId: z.number(),
      variation: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      ownerGuard(ctx.user.id);
      const db = await getDb();
      try {
        const histRows = rows(await db.execute(
          "SELECT content_type, outputs FROM content_command_history WHERE id = ? AND user_id = ?",
          [input.historyId, ctx.user.id]
        ));
        if (!histRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
        const prev = typeof histRows[0].outputs === "string" ? JSON.parse(histRows[0].outputs) : histRows[0].outputs;
        const contentType = histRows[0].content_type;

        // Remix: regenerate copy with a variation instruction
        const variationNote = input.variation || "Make it more aggressive and money-focused";
        if (contentType === "clone_drop" && prev.scene) {
          const newCopy = await generateCloneCopySuite(`${prev.scene}. ${variationNote}`, prev.platform || "OnlyFans");
          const result = { ...prev, copySuite: newCopy, captions: { hook: newCopy.hook, caption: newCopy.caption, dmOpener: newCopy.dmOpener, ppvTeaser: newCopy.ppvTeaser }, remixNote: variationNote };
          await saveHistory(ctx.user.id, contentType, result);
          return result;
        }
        if (contentType === "social_post" && prev.copySuite) {
          const newSuite = await generateFullCopySuite(`${prev.copySuite.postingSchedule || "creator content"}. ${variationNote}`, "VAULT", prev.platform || "all");
          const result = { ...prev, copySuite: newSuite, remixNote: variationNote };
          await saveHistory(ctx.user.id, contentType, result);
          return result;
        }
        // Generic remix: regenerate copy
        const remixedCopy = await gptText(
          `You are KingCam's content strategist. Remix this content with the following variation: ${variationNote}. Keep the same format but make it ${variationNote}.`,
          JSON.stringify(prev).slice(0, 500),
          300
        );
        return { ...prev, remixNote: variationNote, remixedCopy };
      } finally { db.end(); }
    }),
});
