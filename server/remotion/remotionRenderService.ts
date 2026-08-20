/**
 * CreatorVault Remotion Render Service
 * Server-side rendering using @remotion/renderer + @remotion/bundler
 * Handles bundling, rendering, FFmpeg encoding, and output validation
 */
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import type { RenderContract, RenderResult, MotionPreset } from "./types.js";
import { PRESET_REGISTRY } from "./types.js";
import { CAPTION_ENGINE_TEMPLATES } from "../../shared/captionEngine.js";

const execFileAsync = promisify(execFile);

const REMOTION_ROOT = process.env.REMOTION_ROOT || path.resolve(process.cwd(), "server/remotion/Root.tsx");
const UPLOADS_DIR = process.env.STORAGE_DIR || "/root/creatorvault/storage/uploads";
const FONTS_DIR = "/root/creatorvault/assets/fonts";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

// Font family → TTF path mapping
const FONT_PATH_MAP: Record<string, string> = {
  BebasNeue: path.join(FONTS_DIR, "BebasNeue-Regular.ttf"),
  Anton: path.join(FONTS_DIR, "Anton-Regular.ttf"),
  Oswald: path.join(FONTS_DIR, "Oswald-Bold.ttf"),
  Montserrat: path.join(FONTS_DIR, "Montserrat-ExtraBold.ttf"),
  Raleway: path.join(FONTS_DIR, "Raleway-ExtraBold.ttf"),
  PlayfairDisplay: path.join(FONTS_DIR, "PlayfairDisplay-Bold.ttf"),
  Righteous: path.join(FONTS_DIR, "Righteous.ttf"),
  Orbitron: path.join(FONTS_DIR, "Orbitron-Black.ttf"),
  ChakraPetch: path.join(FONTS_DIR, "ChakraPetch-Bold.ttf"),
  PermanentMarker: path.join(FONTS_DIR, "PermanentMarker.ttf"),
  BarlowCondensed: path.join(FONTS_DIR, "BarlowCondensed-Black.ttf"),
};

// Composition ID selector based on mode and dimensions
function getCompositionId(contract: RenderContract): string {
  const { mode, width, height } = contract;
  const isSquare = Math.abs(width - height) < 100;
  const isPortrait = height > width;

  // Visual DNA compositions — pure CSS/React, no base image required
  if (mode === "visual_dna_portrait") return "VisualDNAPortrait";
  if (mode === "visual_dna_square") return "VisualDNASquare";
  if (mode === "visual_dna_landscape") return "VisualDNALandscape";
  if (mode === "visual_dna_thumbnail") return "VisualDNAThumbnail";
  if (mode === "visual_dna_broll") return "VisualDNABroll";
  if (mode === "visual_dna_title_card") return "VisualDNATitleCard";

  if (mode === "caption_stage") return "CreatorVaultRuntimeCaptionStage";
  if (mode === "source_preserving_master") return "CreatorVaultSourcePreservingMaster";

  // 3D Empire compositions
  if (mode === "episode_trailer") return "EpisodeTrailer";
  if (mode === "empire_map_snapshot") return "EmpireMapSnapshot";

  if (mode === "album_cover") {
    return isSquare ? "AlbumCoverSquare" : "AlbumCoverPortrait";
  }
  // flyer / promo_art
  if (isSquare) return "MotionFlyerSquare";
  if (isPortrait) return "MotionFlyerPortrait";
  return "MotionFlyerLandscape";
}

// Validate output file with ffprobe
async function validateOutput(videoPath: string, expectedDuration: number): Promise<void> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Output file does not exist: ${videoPath}`);
  }
  const stat = fs.statSync(videoPath);
  if (stat.size < 10000) {
    throw new Error(`Output file too small (${stat.size} bytes): ${videoPath}`);
  }

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      videoPath,
    ]);
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find((s: any) => s.codec_type === "video");
    if (!videoStream) throw new Error("No video stream found in output");

    const duration = parseFloat(probe.format?.duration || "0");
    const tolerance = Math.max(2, expectedDuration * 0.15);
    if (Math.abs(duration - expectedDuration) > tolerance) {
      throw new Error(`Duration mismatch: expected ${expectedDuration}s, got ${duration.toFixed(2)}s`);
    }
  } catch (err: any) {
    if (err.message.includes("Duration mismatch") || err.message.includes("No video stream")) {
      throw err;
    }
    // ffprobe not found or other error — skip validation
    console.warn("[RemotionRender] ffprobe validation skipped:", err.message);
  }
}

// Extract thumbnail frame
async function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", videoPath,
    "-ss", "1.5",
    "-frames:v", "1",
    "-q:v", "2",
    outputPath,
  ]);
}

// Bundle cache to avoid re-bundling the same composition
let bundleCache: { bundleDir: string; timestamp: number } | null = null;
let flyerBundleCache: { bundleDir: string; timestamp: number } | null = null;
let captionBundleCache: { bundleDir: string; timestamp: number } | null = null;
const BUNDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RUNTIME_FLYER_ENTRY = path.join(os.tmpdir(), "creatorvault-motion-flyer-runtime-entry.tsx");
const RUNTIME_CAPTION_ENTRY = path.join(os.tmpdir(), "creatorvault-caption-stage-runtime-entry.tsx");
// Prefer the host Chromium when available. Falling back to Remotion's managed browser
// preserves portability, while production does not pay a first-render download penalty.
const REMOTION_CHROMIUM_EXECUTABLE = process.env.REMOTION_CHROME_EXECUTABLE || (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

const RUNTIME_FLYER_SOURCE = `import React from "react";
import { AbsoluteFill, Composition, Img, Video, interpolate, registerRoot, spring, useCurrentFrame, useVideoConfig } from "remotion";
const color = (value, fallback) => { const raw = String(value || "").trim(); return raw ? (raw.startsWith("#") ? raw : "#" + raw) : fallback; };
const SourceLayer = ({ layer, style }) => { if (!layer || !layer.url) return null; return layer.mediaType === "video" ? <Video src={layer.url} muted style={style} /> : <Img src={layer.url} style={style} />; };
const KillaPoster = ({ killaGraphicsPlan, sourceLayers = [], width, height, fps, frame }) => {
  const plan = killaGraphicsPlan || {}; const copy = plan.copy || {}; const colors = plan.colors || {}; const family = plan.family || "monument_type_cutout";
  const primary = color(colors.primary, "#171717"); const accent = color(colors.accent, "#F0C04A"); const text = color(colors.text, "#FFFFFF");
  const hero = sourceLayers.find((layer) => layer.role === "hero") || sourceLayers.find((layer) => layer.role === "background") || sourceLayers[0];
  const support = sourceLayers.filter((layer) => layer !== hero && (layer.role === "support" || layer.role === "texture")); const logo = sourceLayers.find((layer) => layer.role === "logo");
  const titleIn = spring({ frame: Math.max(0, frame - 7), fps, config: { damping: 19, stiffness: 125 } }); const heroIn = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 20, stiffness: 104 } }); const infoIn = spring({ frame: Math.max(0, frame - 72), fps, config: { damping: 20, stiffness: 118 } }); const creditIn = spring({ frame: Math.max(0, frame - 117), fps, config: { damping: 21, stiffness: 112 } });
  const drift = interpolate(frame, [0, fps * 5.1], [0, 1], { extrapolateRight: "clamp" }); const camera = 1 + interpolate(frame, [0, fps * 5.5], [0, .045], { extrapolateRight: "clamp" }); const title = String(copy.headline || "KILLAGRAPHICS").toUpperCase(); const words = title.split(/\\s+/).filter(Boolean); const splitAt = words.length > 2 ? Math.ceil(words.length / 2) : 1; const lineOne = words.slice(0, splitAt).join(" "); const lineTwo = words.slice(splitAt).join(" ");
  const info = [copy.eventDate, copy.eventTime, copy.venue, copy.city].filter(Boolean).join("  •  "); const detail = [copy.ticketLine, copy.callToAction].filter(Boolean).join("  •  "); const editorial = family === "editorial_cover_world"; const collage = family === "culture_event_collage"; const tour = family === "client_identity_tour";
  if (plan.authority === "flat_master_art" && hero) return <AbsoluteFill style={{ background: "#050505", overflow: "hidden" }}><div style={{ position: "absolute", inset: 0, transform: "scale(" + camera + ")" }}><SourceLayer layer={hero} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} /></div><AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,.16), transparent 42%, rgba(0,0,0,.14))", opacity: .5 + Math.sin(frame / 18) * .08 }} /><div style={{ position: "absolute", left: width*.045, right: width*.045, bottom: height*.045, height: 2, background: accent, opacity: infoIn*.8 }} /></AbsoluteFill>;
  return <AbsoluteFill style={{ background: primary, overflow: "hidden", fontFamily: "Arial Black, Arial, sans-serif" }}>
    <AbsoluteFill style={{ background: "linear-gradient(135deg," + primary + " 0%, #050505 62%," + primary + " 100%)" }} />
    <div style={{ position: "absolute", top: -height*.12, bottom: -height*.12, left: -width*.65, width: width*.34, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)", transform: "translateX(" + (interpolate(frame, [fps*.7, fps*3.9], [-width*.1, width*1.82], { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" })) + "px) skewX(-12deg)", opacity: .72 }} />
    <div style={{ position: "absolute", left: -width*.1, bottom: height*.17, width: width*1.2, height: 2, background: accent, opacity: .22, transform: "scaleX(" + infoIn + ")", transformOrigin: "left center" }} />
    {support.slice(0, 2).map((layer, index) => <div key={index} style={{ position: "absolute", inset: index ? "12% -16% 18% 38%" : "-6% 35% 28% -20%", opacity: .21, transform: "rotate(" + (index ? 9 : -7) + "deg) translateX(" + ((index ? -1 : 1) * drift * width*.03) + "px) scale(" + camera + ")", overflow: "hidden" }}><SourceLayer layer={layer} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.12) saturate(.8)" }} /></div>)}
    {collage ? <><div style={{ position: "absolute", left: width*.06, top: height*.12, width: width*.86, height: height*.11, background: accent, transform: "skewX(-9deg) translateX(" + interpolate(titleIn,[0,1],[-180,0]) + "px)", opacity: titleIn*.94 }} /><div style={{ position: "absolute", right: width*.06, top: height*.21, width: width*.38, height: height*.07, background: text, opacity: .1 + infoIn*.17 }} /></> : null}
    {hero ? <div style={{ position: "absolute", left: editorial ? width*.2 : width*.12, right: editorial ? width*.2 : width*.12, top: editorial ? height*.16 : height*.24, bottom: editorial ? height*.22 : height*.20, opacity: heroIn, transform: "translate(" + (drift * width*.025) + "px," + interpolate(heroIn,[0,1],[90,0]) + "px) scale(" + camera + ")", overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,.42)" }}><SourceLayer layer={hero} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} /><AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 34%, rgba(0,0,0,.62) 100%)" }} /></div> : <div style={{ position: "absolute", left: width*.1, top: height*.22, width: width*.8, height: height*.5, border: "2px solid " + accent, opacity: .3 + heroIn*.4, transform: "rotate(-4deg)" }} />}
    <div style={{ position: "absolute", left: width*.055, right: width*.055, top: editorial ? height*.055 : height*.06, opacity: titleIn, transform: "translate(" + (-drift * width*.012) + "px," + interpolate(titleIn,[0,1],[-54,0]) + "px)" }}><div style={{ color: accent, fontSize: Math.min(width*.027,31), letterSpacing: ".25em", fontWeight: 900, textTransform: "uppercase" }}>{copy.hostLine || plan.familyLabel || "KILLAGRAPHICS PRESENTS"}</div><div style={{ marginTop: editorial ? 18 : 34, color: text, fontSize: editorial ? Math.min(width*.15,158) : Math.min(width*.19,202), fontWeight: 950, letterSpacing: "-.095em", lineHeight: .74, textTransform: "uppercase", textShadow: "0 8px 22px rgba(0,0,0,.38)" }}>{lineOne}<br />{lineTwo || (tour ? "TOUR" : "")}</div></div>
    {family === "monument_type_cutout" || family === "premium_promo_action" ? <div style={{ position: "absolute", right: width*.055, top: height*.36, writingMode: "vertical-rl", color: accent, border: "1px solid " + accent, padding: "13px 8px", fontSize: Math.min(width*.023,26), letterSpacing: ".16em", fontWeight: 900, opacity: infoIn, transform: "translateY(" + interpolate(infoIn,[0,1],[-72,0]) + "px)" }}>{copy.eventDate || copy.campaignWorld || "LIVE"}</div> : null}
    <div style={{ position: "absolute", left: width*.055, right: width*.055, bottom: height*.07, opacity: infoIn, transform: "translate(" + (drift * width*.008) + "px," + interpolate(infoIn,[0,1],[45,0]) + "px)" }}><div style={{ display: "inline-flex", background: accent, color: primary, padding: "11px 15px", fontSize: Math.min(width*.025,27), fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" }}>{copy.campaignWorld || plan.campaign?.type || "EVENT"}</div>{copy.supportingLine ? <div style={{ marginTop: 17, color: text, fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: Math.min(width*.039,43), lineHeight: 1.05, maxWidth: width*.8 }}>{copy.supportingLine}</div> : null}<div style={{ marginTop: 18, color: text, fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: Math.min(width*.023,25), letterSpacing: ".08em", textTransform: "uppercase" }}>{info}</div>{detail ? <div style={{ marginTop: 9, color: accent, fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: Math.min(width*.02,22), letterSpacing: ".09em", textTransform: "uppercase" }}>{detail}</div> : null}<div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,.45)", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", color: text, fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: Math.min(width*.016,18), letterSpacing: ".14em", textTransform: "uppercase", opacity: creditIn, transform: "translateY(" + interpolate(creditIn,[0,1],[16,0]) + "px)" }}><span>{copy.creditLine || "DESIGN BY KILLAGRAPHICS"}</span>{logo ? <div style={{ width: width*.11, height: height*.045 }}><SourceLayer layer={logo} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "right center" }} /></div> : null}</div></div>
  </AbsoluteFill>;
};
const Flyer = ({ artistName = "CreatorVault", songTitle = "THE MOMENT", subtitle = "Make it impossible to ignore.", callToAction = "ENTER THE VAULT", accentColor = "D4AF37", textColor = "FFFFFF", backgroundVideoUrl = "", sourceMediaUrl = "", sourceMediaType = "video", killaGraphicsPlan = null, sourceLayers = [] }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); if (killaGraphicsPlan) return <KillaPoster killaGraphicsPlan={killaGraphicsPlan} sourceLayers={sourceLayers} width={width} height={height} fps={fps} frame={frame} />;
  const accent = color(accentColor, "#D4AF37"); const text = color(textColor, "#FFFFFF"); const top = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 18, stiffness: 135 } }); const title = spring({ frame: Math.max(0, frame - 13), fps, config: { damping: 17, stiffness: 105 } }); const body = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 18, stiffness: 110 } }); const exit = interpolate(frame, [Math.max(0, Math.round(fps * 5.2)), Math.round(fps * 5.85)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#080706", overflow: "hidden" }}>{sourceMediaType === "image" && sourceMediaUrl ? <Img src={sourceMediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }} /> : backgroundVideoUrl ? <Video src={backgroundVideoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }} /> : null}<AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,6,.84) 0%, rgba(8,7,6,.15) 28%, rgba(8,7,6,.22) 56%, rgba(8,7,6,.92) 100%)" }} /><AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,7,6,.72) 0%, transparent 57%, rgba(8,7,6,.18) 100%)" }} /><div style={{ position: "absolute", top: height * .075, left: width * .07, right: width * .07, opacity: top * (1 - exit), transform: "translateY(" + interpolate(top, [0,1], [-36,0]) + "px)" }}><div style={{ display: "flex", alignItems: "center", gap: 16 }}><div style={{ height: 2, width: 56, backgroundColor: accent }} /><div style={{ color: accent, fontFamily: "Arial, sans-serif", fontSize: Math.min(width*.026,29), fontWeight: 800, letterSpacing: ".24em", textTransform: "uppercase" }}>{artistName}</div></div></div><div style={{ position: "absolute", left: width*.07, right: width*.07, bottom: height*.105, opacity: title * (1-exit), transform: "translateY(" + interpolate(title, [0,1], [72,0]) + "px)" }}><div style={{ color: text, fontFamily: "Arial, sans-serif", fontSize: Math.min(width*.148,154), fontWeight: 900, lineHeight: .82, letterSpacing: "-.075em", textTransform: "uppercase", textShadow: "0 8px 32px rgba(0,0,0,.48)" }}>{songTitle}</div><div style={{ width:76, height:3, marginTop:38, backgroundColor:accent, opacity:body }} /><div style={{ marginTop:28, maxWidth:width*.75, color:text, fontFamily:"Arial, sans-serif", fontSize:Math.min(width*.039,42), fontWeight:600, letterSpacing:"-.018em", lineHeight:1.16, opacity:body }}>{subtitle}</div><div style={{ marginTop:42, display:"inline-flex", border:"1px solid " + accent, color:accent, fontFamily:"Arial, sans-serif", fontSize:Math.min(width*.025,28), fontWeight:800, letterSpacing:".12em", padding:"19px 24px", textTransform:"uppercase", opacity:body }}>{callToAction}</div></div></AbsoluteFill>;
};
const Root = () => <Composition id="CreatorVaultRuntimeMotionFlyer" component={Flyer} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{}} />;
registerRoot(Root);`;

const RUNTIME_CAPTION_SOURCE = `import React from "react";
import { AbsoluteFill, Composition, Video, interpolate, registerRoot, spring, useCurrentFrame, useVideoConfig } from "remotion";
const TEMPLATES = ${JSON.stringify(CAPTION_ENGINE_TEMPLATES)};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const templateFor = (id) => TEMPLATES.find((template) => template.id === id) || TEMPLATES.find((template) => template.id === "founder") || TEMPLATES[0];
const profileFor = (profile, safeZone, width, height) => {
  const map = {
    creatorvault: { top: .12, right: .075, bottom: .18, left: .075, preferred: "lower" },
    tiktok: { top: .13, right: .11, bottom: .27, left: .075, preferred: "lower" },
    instagram_reels: { top: .12, right: .075, bottom: .24, left: .075, preferred: "lower" },
    youtube_shorts: { top: .12, right: .08, bottom: .21, left: .08, preferred: "lower" },
    instagram_square: { top: .10, right: .09, bottom: .12, left: .09, preferred: "lower" },
    youtube_landscape: { top: .08, right: .07, bottom: .10, left: .07, preferred: "lower" },
  };
  if (profile && map[profile]) return map[profile];
  if (safeZone === "square" || Math.abs(width - height) < 12) return map.instagram_square;
  if (safeZone === "landscape" || width > height) return map.youtube_landscape;
  return map.creatorvault;
};
const wordsFor = (segment) => {
  const supplied = Array.isArray(segment && segment.words) ? segment.words.filter((word) => String(word && word.text || "").trim() && Number(word.end) > Number(word.start)) : [];
  if (supplied.length) return supplied.map((word) => ({ text: String(word.text).trim(), start: Number(word.start), end: Number(word.end), speaker: word.speaker || segment.speaker || null }));
  const text = String(segment && segment.text || "").trim().split(/\s+/).filter(Boolean); const span = Math.max(.12, Number(segment.end) - Number(segment.start));
  return text.map((word, index) => ({ text: word, start: Number(segment.start) + span * index / text.length, end: Number(segment.start) + span * (index + 1) / text.length, speaker: segment.speaker || null }));
};
const groupsFor = (segments, template) => {
  const groups = [];
  (segments || []).forEach((segment, segmentIndex) => {
    const words = wordsFor(segment); if (!words.length) return;
    if (template.timing === "sentence") { groups.push({ id: "s-" + segmentIndex, start: Number(segment.start), end: Number(segment.end), text: String(segment.text || "").trim(), words, speaker: segment.speaker || words[0].speaker || null }); return; }
    let bucket = [];
    const flush = () => { if (!bucket.length) return; groups.push({ id: "s-" + segmentIndex + "-" + groups.length, start: bucket[0].start, end: bucket[bucket.length - 1].end, text: bucket.map((word) => word.text).join(" ").replace(/\s+([,.!?;:])/g, "$1"), words: bucket, speaker: bucket.find((word) => word.speaker)?.speaker || segment.speaker || null }); bucket = []; };
    words.forEach((word) => { bucket.push(word); const punctuation = /[,.!?;:]$/.test(word.text); if (template.timing === "word" || bucket.length >= Math.max(1, Number(template.maxWords || 4)) || (punctuation && bucket.length >= 2)) flush(); });
    flush();
  });
  return groups;
};
const motion = (behavior, frame, fps) => {
  const inFrame = Math.max(0, frame); const settle = spring({ frame: inFrame, fps, config: { damping: behavior === "bounce" ? 10 : 18, stiffness: behavior === "punch" || behavior === "word_pop" ? 170 : 110, mass: .8 } });
  if (behavior === "machine_gun") return { opacity: clamp(inFrame / 3, 0, 1), scale: 1.04 - clamp(inFrame / 6, 0, 1) * .04, y: 0 };
  if (behavior === "word_pop") return { opacity: settle, scale: .58 + settle * .42, y: (1 - settle) * 22 };
  if (behavior === "punch") return { opacity: settle, scale: .72 + settle * .28, y: (1 - settle) * 34 };
  if (behavior === "bounce") return { opacity: settle, scale: .92 + settle * .08, y: Math.sin(inFrame / 3.4) * 7 * Math.max(0, 1 - inFrame / (fps * 1.2)) };
  if (behavior === "impact_stack") return { opacity: settle, scale: .86 + settle * .14, y: (1 - settle) * 46 };
  if (behavior === "slow_reveal" || behavior === "documentary") return { opacity: clamp(inFrame / (fps * .26), 0, 1), scale: 1, y: (1 - clamp(inFrame / (fps * .32), 0, 1)) * 12 };
  if (behavior === "lower_third") return { opacity: settle, scale: 1, y: (1 - settle) * 42 };
  if (behavior === "beat_pulse") return { opacity: settle, scale: 1 + Math.sin(inFrame / 4.2) * .025, y: 0 };
  return { opacity: settle, scale: 1, y: 0 };
};
const skinFor = (template) => {
  const id = template.id;
  if (["word-pop", "reaction", "machine-gun"].includes(id)) return { layout: "solo", noBox: true, case: "upper", tracking: "-.055em", radius: 0 };
  if (["cinematic-minimal", "slow-reveal", "light-sweep", "noir", "storyteller", "confessional"].includes(id)) return { layout: "film", noBox: true, case: "none", tracking: "-.02em", radius: 0 };
  if (["editorial-lower-third", "interview", "newsroom"].includes(id)) return { layout: "lowerThird", noBox: false, case: "none", tracking: "-.015em", radius: 12 };
  if (["tutorial-callout", "product-demo", "announcement", "cta-finale"].includes(id)) return { layout: "banner", noBox: false, case: "upper", tracking: "-.03em", radius: 16 };
  if (["quote-card", "luxury-serif", "documentary", "podcast-pro"].includes(id)) return { layout: "editorial", noBox: false, case: "none", tracking: "-.015em", radius: 20 };
  return { layout: "impact", noBox: false, case: template.family === "premium_cinematic" || template.family === "creator_talking_head" ? "none" : "upper", tracking: "-.045em", radius: 18 };
};
const emphasis = (word, index, words, template, activeIndex) => {
  const clean = String(word || "").replace(/[^a-z0-9]/gi, "");
  if (template.activeWordBehavior === "karaoke") return index === activeIndex;
  if (template.emphasisRule === "first_phrase") return index === 0;
  if (template.emphasisRule === "final_word") return index === words.length - 1;
  if (template.emphasisRule === "high_energy") return index === activeIndex || clean.length >= 7;
  if (template.emphasisRule === "keywords") return index === activeIndex || clean.length >= 7;
  return false;
};
const CaptionMaster = ({ backgroundVideoUrl = "", captionSegments = [], captionStyle = "founder", captionPlacement = "adaptive", captionSafeZone = "platform_safe", captionPlatformProfile = "creatorvault", captionFocusRegions = [], captionTypography = {} }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const seconds = frame / fps; const template = templateFor(captionStyle); const groups = groupsFor(captionSegments, template);
  const active = groups.find((group) => seconds >= Number(group.start) && seconds <= Number(group.end)); const words = active ? active.words : []; const duration = active ? Math.max(.12, Number(active.end) - Number(active.start)) : 1;
  const progress = active ? clamp((seconds - Number(active.start)) / duration, 0, .999) : 0; const activeIndex = active ? Math.max(0, words.findIndex((word) => seconds >= word.start && seconds <= word.end)) : 0; const localFrame = active ? Math.max(0, frame - Math.round(Number(active.start) * fps)) : 0; const entrance = motion(template.entryMotion, localFrame, fps);
  const safe = profileFor(captionPlatformProfile, captionSafeZone, width, height); const skin = skinFor(template); const focusRegions = Array.isArray(captionFocusRegions) ? captionFocusRegions : []; const captionRect = (placement) => placement === "top" ? { x: safe.left, y: safe.top, width: 1 - safe.left - safe.right, height: .18 } : placement === "center" ? { x: safe.left, y: .41, width: 1 - safe.left - safe.right, height: .18 } : { x: safe.left, y: 1 - safe.bottom - .18, width: 1 - safe.left - safe.right, height: .18 }; const collides = (placement) => { const rect = captionRect(placement); return focusRegions.some((focus) => rect.x < Number(focus.x) + Number(focus.width) && rect.x + rect.width > Number(focus.x) && rect.y < Number(focus.y) + Number(focus.height) && rect.y + rect.height > Number(focus.y)); }; const desiredPlacement = captionPlacement === "adaptive" ? safe.preferred : captionPlacement; const selectedPlacement = captionPlacement === "adaptive" ? [desiredPlacement, "top", "center", "lower"].find((candidate, index, all) => all.indexOf(candidate) === index && !collides(candidate)) || desiredPlacement : desiredPlacement; const position = selectedPlacement === "top" ? { top: height * safe.top } : selectedPlacement === "center" ? { top: height * .5, transform: "translateY(-50%)" } : { bottom: height * safe.bottom };
  const fontSize = Math.min(width * .075 * Number(captionTypography.size || template.size || 1), height * .064 * Number(captionTypography.size || template.size || 1)); const color = captionTypography.color || template.color; const highlight = captionTypography.highlightColor || template.highlightColor; const background = captionTypography.background || template.background;
  const sweep = template.activeWordBehavior === "light_sweep" ? "linear-gradient(90deg, " + color + " 0%, " + highlight + " " + Math.round(progress * 100) + "%, " + color + " 100%)" : color;
  const card = { maxWidth: width * (1 - safe.left - safe.right), padding: skin.noBox ? 0 : Math.max(14, width * .022) + "px " + Math.max(18, width * .032) + "px", borderRadius: skin.radius, textAlign: skin.layout === "lowerThird" ? "left" : "center", fontFamily: captionTypography.font || template.font, fontWeight: captionTypography.weight || template.weight, textTransform: skin.case === "upper" ? "uppercase" : "none", background: skin.noBox ? "transparent" : background, color, border: skin.noBox ? "0" : template.stroke, boxShadow: skin.noBox ? "none" : template.shadow, letterSpacing: skin.tracking, fontSize, lineHeight: skin.layout === "film" ? 1.08 : .9, opacity: entrance.opacity, transform: (position.transform ? position.transform + " " : "") + "translateY(" + entrance.y + "px) scale(" + entrance.scale + ")" };
  return <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
    {backgroundVideoUrl ? <Video src={backgroundVideoUrl} style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000000" }} /> : null}
    {active ? <div style={{ position: "absolute", left: width * safe.left, right: width * safe.right, display: "flex", justifyContent: skin.layout === "lowerThird" ? "flex-start" : "center", ...position }}><div style={card}>{active.speaker ? <div style={{ marginBottom: 8, color: active.speaker === "Voice B" ? "#00D9FF" : highlight, fontSize: Math.max(14, fontSize * .34), letterSpacing: ".12em", textTransform: "uppercase" }}>{active.speaker}</div> : null}{words.map((word, index) => <span key={index} style={{ color: emphasis(word.text, index, words.map((item) => item.text), template, activeIndex) ? highlight : sweep, display: "inline-block", marginRight: "0.24em", transform: template.activeWordBehavior === "keyword_blast" && emphasis(word.text, index, words.map((item) => item.text), template, activeIndex) ? "scale(1.12)" : "scale(1)", transition: "transform 90ms linear" }}>{word.text}</span>)}</div></div> : null}
  </AbsoluteFill>;
};
const Root = () => <Composition id="CreatorVaultRuntimeCaptionStage" component={CaptionMaster} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{}} />;
registerRoot(Root);`

async function getOrCreateBundle(contract: RenderContract): Promise<string> {
  const isRuntimeFlyer = contract.mode === "flyer";
  const isRuntimeCaption = contract.mode === "caption_stage";
  const now = Date.now();
  const cached = isRuntimeFlyer ? flyerBundleCache : isRuntimeCaption ? captionBundleCache : bundleCache;
  if (cached && now - cached.timestamp < BUNDLE_TTL_MS && fs.existsSync(cached.bundleDir)) return cached.bundleDir;

  if (isRuntimeFlyer) await fs.promises.writeFile(RUNTIME_FLYER_ENTRY, RUNTIME_FLYER_SOURCE, "utf8");
  if (isRuntimeCaption) await fs.promises.writeFile(RUNTIME_CAPTION_ENTRY, RUNTIME_CAPTION_SOURCE, "utf8");
  console.log("[RemotionRender] Bundling compositions...");
  const { bundle } = await import("@remotion/bundler");
  const bundleDir = await bundle({
    entryPoint: isRuntimeFlyer ? RUNTIME_FLYER_ENTRY : isRuntimeCaption ? RUNTIME_CAPTION_ENTRY : REMOTION_ROOT,
    onProgress: (p) => { if (p % 20 === 0) console.log(`[RemotionRender] Bundle progress: ${p}%`); },
  });

  const nextCache = { bundleDir, timestamp: now };
  if (isRuntimeFlyer) flyerBundleCache = nextCache; else if (isRuntimeCaption) captionBundleCache = nextCache; else bundleCache = nextCache;
  console.log("[RemotionRender] Bundle ready:", bundleDir);
  return bundleDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RENDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export type SourceVideoInspection = {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
};

function parseFrameRate(value: unknown): number {
  const [numerator, denominator] = String(value || "").split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

/** Technical source read only. No frames are edited, generated, or persisted. */
export async function inspectSourceVideoForRemotion(sourceVideoUrl: string): Promise<SourceVideoInspection> {
  if (!/^https:\/\//i.test(String(sourceVideoUrl || ""))) {
    throw new Error("CreatorVault requires a secure approved source URL before it can inspect a video.");
  }
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate:format=duration",
    "-of", "json",
    sourceVideoUrl,
  ], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number; r_frame_rate?: string }>; format?: { duration?: string } };
  const stream = parsed.streams?.[0];
  const durationSeconds = Number(parsed.format?.duration || 0);
  const fps = parseFrameRate(stream?.r_frame_rate);
  const width = Number(stream?.width || 0);
  const height = Number(stream?.height || 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || !Number.isFinite(fps) || fps <= 0) {
    throw new Error("CreatorVault could not verify the source video’s duration, frame size, and frame rate.");
  }
  return { durationSeconds, width, height, fps };
}

export type SourcePreservingMasterRequest = {
  jobId: string;
  sourceVideoUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps?: number;
  preserveSourceAudio?: boolean;
};

function assertSourcePreservingMasterRequest(input: SourcePreservingMasterRequest): void {
  if (!/^https:\/\//i.test(String(input.sourceVideoUrl || ""))) {
    throw new Error("CreatorVault Source-Preserving Master requires a secure approved source URL.");
  }
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error("CreatorVault Source-Preserving Master requires the verified source duration.");
  }
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new Error("CreatorVault Source-Preserving Master requires valid output dimensions.");
  }
}

/**
 * Packages an existing CreatorVault video as a durable source-preserving MP4.
 * It is intentionally not a synthetic creation route and accepts no creative props.
 */
export async function renderSourcePreservingMaster(input: SourcePreservingMasterRequest): Promise<RenderResult> {
  assertSourcePreservingMasterRequest(input);
  return renderWithRemotion({
    jobId: input.jobId,
    mode: "source_preserving_master",
    baseImagePath: "",
    baseImageUrl: "",
    sourceVideoUrl: input.sourceVideoUrl,
    width: input.width,
    height: input.height,
    fps: input.fps || 30,
    durationSeconds: input.durationSeconds,
    motionPreset: "neon_pulse",
    premiumMode: false,
    cinematicMode: false,
    artistName: "",
    songTitle: "",
    subtitle: "",
    textPreset: "none",
    accentColor: "",
    textColor: "",
    fontFamily: "",
    preserveSourceAudio: input.preserveSourceAudio !== false,
  });
}

export async function renderVerifiedSourcePreservingMaster(input: {
  jobId: string;
  sourceVideoUrl: string;
  preserveSourceAudio?: boolean;
}): Promise<{ source: SourceVideoInspection; render: RenderResult }> {
  const source = await inspectSourceVideoForRemotion(input.sourceVideoUrl);
  const render = await renderSourcePreservingMaster({
    jobId: input.jobId,
    sourceVideoUrl: input.sourceVideoUrl,
    durationSeconds: source.durationSeconds,
    width: source.width,
    height: source.height,
    fps: source.fps,
    preserveSourceAudio: input.preserveSourceAudio !== false,
  });
  return { source, render };
}

export async function renderWithRemotion(contract: RenderContract & { sourceVideoUrl?: string; preserveSourceAudio?: boolean }): Promise<RenderResult> {
  const startMs = Date.now();
  const { jobId, width, height, fps, durationSeconds, motionPreset } = contract;

  console.log(`[RemotionRender] Starting job ${jobId}: ${motionPreset} ${width}x${height} ${durationSeconds}s`);

  // Remotion renders in a browser context. Preserve an intentionally empty still-image
  // source for motion-first flyers rather than fabricating a broken /uploads/ request.
  const imageFilename = contract.baseImagePath ? path.basename(contract.baseImagePath) : "";
  const imageUrl = imageFilename ? `http://localhost:${process.env.PORT || 3000}/uploads/${imageFilename}` : "";

  const tmpDir = os.tmpdir();
  const rawVideoPath = path.join(tmpDir, `remotion-raw-${jobId}.mp4`);
  const finalVideoPath = path.join(UPLOADS_DIR, `motion-${jobId}.mp4`);
  const thumbnailPath = path.join(UPLOADS_DIR, `motion-thumb-${jobId}.jpg`);

  try {
    // 1. Get or create bundle
    const bundleDir = await getOrCreateBundle(contract);

    // 2. Prepare render props
    const renderProps: RenderContract = {
      ...contract,
      baseImageUrl: imageUrl,
    };

    // 3. Render with Remotion
    // For 3D empire compositions, parse vibe JSON as inputProps
    let finalInputProps: any = renderProps;
    if ((contract.mode === "episode_trailer" || contract.mode === "empire_map_snapshot") && contract.vibe) {
      try {
        const vibeData = JSON.parse(contract.vibe);
        finalInputProps = { ...vibeData };
      } catch (_) {}
    }
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const compositionId = contract.mode === "flyer" ? "CreatorVaultRuntimeMotionFlyer" : contract.mode === "caption_stage" ? "CreatorVaultRuntimeCaptionStage" : getCompositionId(contract);
    const durationInFrames = Math.round(durationSeconds * fps);

    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: compositionId,
      inputProps: renderProps as unknown as Record<string, unknown>,
      browserExecutable: REMOTION_CHROMIUM_EXECUTABLE,
      chromiumOptions: {
        disableWebSecurity: true,
        headless: true,
      },
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
        width,
        height,
      },
      serveUrl: bundleDir,
      codec: "h264",
      outputLocation: rawVideoPath,
      inputProps: finalInputProps as unknown as Record<string, unknown>,
      browserExecutable: REMOTION_CHROMIUM_EXECUTABLE,
      chromiumOptions: {
        disableWebSecurity: true,
        headless: true,
      },
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) console.log(`[RemotionRender] ${jobId} render: ${pct}%`);
      },
      timeoutInMilliseconds: 300000, // 5 minutes max
      concurrency: 2,
      crf: 18,
      pixelFormat: "yuv420p",
    });

    // 4. FFmpeg post-processing: faststart + final encode
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", rawVideoPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      finalVideoPath,
    ]);

    // 5. Validate output
    await validateOutput(finalVideoPath, durationSeconds);

    // 6. Extract thumbnail
    try {
      await extractThumbnail(finalVideoPath, thumbnailPath);
    } catch (thumbErr) {
      console.warn("[RemotionRender] Thumbnail extraction failed:", thumbErr);
    }

    // 7. Cleanup temp
    try { fs.unlinkSync(rawVideoPath); } catch {}

    const renderMs = Date.now() - startMs;
    const videoUrl = `/uploads/motion-${jobId}.mp4`;
    const thumbUrl = fs.existsSync(thumbnailPath) ? `/uploads/motion-thumb-${jobId}.jpg` : undefined;

    console.log(`[RemotionRender] Job ${jobId} complete in ${(renderMs / 1000).toFixed(1)}s → ${videoUrl}`);

    return {
      jobId,
      success: true,
      videoPath: finalVideoPath,
      videoUrl,
      thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : undefined,
      thumbnailUrl: thumbUrl,
      engine: "remotion",
      durationSeconds,
      width,
      height,
      preset: motionPreset,
      renderMs,
    };

  } catch (err: any) {
    // Cleanup on failure
    try { fs.unlinkSync(rawVideoPath); } catch {}
    try { fs.unlinkSync(finalVideoPath); } catch {}

    console.error(`[RemotionRender] Job ${jobId} FAILED:`, err.message);

    return {
      jobId,
      success: false,
      videoPath: "",
      videoUrl: "",
      engine: "remotion",
      durationSeconds,
      width,
      height,
      preset: motionPreset,
      renderMs: Date.now() - startMs,
      error: err.message,
    };
  }
}


/**
 * Renders one deliberate editorial frame from the same source-driven Marketing Maker
 * composition. This is a real PNG export, not a screenshot or synthetic placeholder.
 */
export async function renderMarketingStill(contract: RenderContract & {
  format: "editorial_flyer" | "motion_flyer" | "motion_mixtape_cover";
  sourceMediaUrl?: string;
  sourceMediaType?: "image" | "video";
}): Promise<RenderResult> {
  const startMs = Date.now();
  const { jobId, width, height } = contract;
  const finalImagePath = path.join(UPLOADS_DIR, `marketing-${jobId}.png`);

  try {
    const bundleDir = await getOrCreateBundle({ ...contract, mode: "flyer" });
    const { renderStill, selectComposition } = await import("@remotion/renderer");
    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: "CreatorVaultRuntimeMotionFlyer",
      inputProps: contract as unknown as Record<string, unknown>,
      browserExecutable: REMOTION_CHROMIUM_EXECUTABLE,
      chromiumOptions: { disableWebSecurity: true, headless: true },
    });

    await renderStill({
      composition: { ...composition, width, height, fps: contract.fps, durationInFrames: Math.round(contract.durationSeconds * contract.fps) },
      serveUrl: bundleDir,
      output: finalImagePath,
      frame: Math.max(1, Math.round(contract.fps * 1.6)),
      imageFormat: "png",
      inputProps: contract as unknown as Record<string, unknown>,
      browserExecutable: REMOTION_CHROMIUM_EXECUTABLE,
      chromiumOptions: { disableWebSecurity: true, headless: true },
      timeoutInMilliseconds: 300000,
    });

    if (!fs.existsSync(finalImagePath) || fs.statSync(finalImagePath).size < 10_000) {
      throw new Error("Marketing Maker did not produce a valid still export.");
    }

    const imageUrl = `/uploads/marketing-${jobId}.png`;
    return {
      jobId,
      success: true,
      imagePath: finalImagePath,
      imageUrl,
      outputPath: finalImagePath,
      outputUrl: imageUrl,
      width,
      height,
      engine: "remotion",
      renderMs: Date.now() - startMs,
    };
  } catch (err: any) {
    try { fs.unlinkSync(finalImagePath); } catch {}
    console.error(`[RemotionRender] Marketing still ${jobId} FAILED:`, err.message);
    return {
      jobId,
      success: false,
      imagePath: "",
      imageUrl: "",
      width,
      height,
      engine: "remotion",
      renderMs: Date.now() - startMs,
      error: err.message,
    };
  }
}
