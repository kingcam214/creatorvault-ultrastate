#!/usr/bin/env node
/**
 * CreatorVault platform-native VaultX homepage trailer renderer.
 *
 * This renderer composes a production homepage trailer from a real clip generated
 * through CreatorVault's own KingCam AI service plus verified KingCam project media.
 * It does not use Manus media generation or off-platform placeholder assets.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const publicDir = path.join(root, "client/public");
const videoDir = path.join(publicDir, "videos");
const renderDir = path.join(publicDir, "uploads/vaultx/homepage-trailer");
fs.mkdirSync(renderDir, { recursive: true });

const sources = {
  platformNativeAI: path.join(renderDir, "platform_native_pollo_kling3_latest.mp4"),
  platformNativeAIMeta: path.join(renderDir, "platform_native_pollo_kling3_latest.json"),
  cloneWide: path.join(videoDir, "kingcam-clone-1.mp4"),
  cloneSquare: path.join(videoDir, "kingcam-clone-2.mp4"),
  heroVertical: path.join(videoDir, "kingcam-hero-cam.mp4"),
};

for (const [name, file] of Object.entries(sources)) {
  if (!fs.existsSync(file)) throw new Error(`Missing required CreatorVault trailer asset: ${name} -> ${file}`);
}

const aiClipMeta = JSON.parse(fs.readFileSync(sources.platformNativeAIMeta, "utf8"));
const w = 1920;
const h = 1080;
const fps = 30;
const generatedAt = new Date().toISOString();

const segments = [
  {
    id: "shot01_platform_native_ai",
    label: "Platform-native KingCam AI hero movement",
    source: sources.platformNativeAI,
    ss: 0.0,
    duration: 5,
    filter: `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=${fps},eq=contrast=1.08:brightness=-0.025:saturation=1.04,colorbalance=rs=.05:gs=.025:bs=-.035,fade=t=in:st=0:d=0.16`,
  },
  {
    id: "shot02_verified_stride",
    label: "Verified KingCam stride / gold light",
    source: sources.cloneSquare,
    ss: 2.2,
    duration: 2,
    filter: `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},zoompan=z='1.18':x='iw/2-(iw/zoom/2)':y='ih*0.38':d=${2 * fps}:s=${w}x${h}:fps=${fps},eq=contrast=1.18:brightness=-0.05:saturation=1.05,colorbalance=rs=.10:gs=.04:bs=-.06`,
  },
  {
    id: "shot03_verified_chest_hero",
    label: "Verified KingCam chest-up hero cut",
    source: sources.heroVertical,
    ss: 0.3,
    duration: 2,
    filter: `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-${w})/2':y='(ih-${h})*0.18',eq=contrast=1.16:brightness=-0.035:saturation=.94,colorbalance=rs=.07:gs=.025:bs=-.04`,
  },
  {
    id: "shot04_verified_platform_world",
    label: "Verified KingCam wide / platform-world cut",
    source: sources.cloneWide,
    ss: 2.6,
    duration: 2,
    filter: `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},eq=contrast=1.25:brightness=-0.075:saturation=.82,vignette=PI/5`,
  },
  {
    id: "shot05_verified_closeup",
    label: "Verified KingCam close-up before CTA hit",
    source: sources.heroVertical,
    ss: 1.1,
    duration: 2,
    filter: `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-${w})/2':y='(ih-${h})*0.05',zoompan=z='1.36':x='iw/2-(iw/zoom/2)':y='ih*0.18':d=${2 * fps}:s=${w}x${h}:fps=${fps},eq=contrast=1.20:brightness=-0.06:saturation=.88,vignette=PI/4`,
  },
];

function run(cmd, args, description) {
  console.log(`\n[CreatorVault render] ${description}`);
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${description} failed with exit code ${result.status}`);
}

const renderedSegments = [];
for (const seg of segments) {
  const out = path.join(renderDir, `${seg.id}.mp4`);
  renderedSegments.push(out);
  run("ffmpeg", [
    "-y",
    "-ss", String(seg.ss),
    "-i", seg.source,
    "-t", String(seg.duration),
    "-vf", `${seg.filter},format=yuv420p`,
    "-an",
    "-r", String(fps),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "16",
    out,
  ], `Render ${seg.id}: ${seg.label}`);
}

const concatList = path.join(renderDir, "segments.txt");
fs.writeFileSync(concatList, renderedSegments.map((f) => `file '${f.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
const broll = path.join(renderDir, "kingcam_broll_13s.mp4");
run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", broll], "Concatenate AI-generated and verified KingCam B-roll shots");

const logo = path.join(renderDir, "creatorvault_logo_hold.mp4");
const logoFilter = [
  `color=c=#050505:s=${w}x${h}:d=2:r=${fps}`,
  `drawbox=x=0:y=0:w=iw:h=ih:color=#050505:t=fill`,
  `drawtext=text='C R E A T O R V A U L T':fontcolor=#f3d68b:fontsize=92:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2-34`,
  `drawtext=text='V A U L T X   B O D Y   C I N E M A':fontcolor=#ffffffcc:fontsize=24:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:x=(w-text_w)/2:y=(h/2)+70`,
  `fade=t=in:st=0:d=0.22`,
].join(",");
run("ffmpeg", ["-y", "-f", "lavfi", "-i", logoFilter, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", logo], "Render CreatorVault logo choir-hit hold");

const cta = path.join(renderDir, "creatorvault_cta_hold.mp4");
const ctaFilter = [
  `color=c=#050505:s=${w}x${h}:d=3:r=${fps}`,
  `drawtext=text='C R E A T O R V A U L T':fontcolor=#f3d68b:fontsize=84:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2-88`,
  `drawtext=text='[ Join as Creator ]        [ Explore as Fan ]':fontcolor=#ffffff:fontsize=42:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h/2)+58`,
  `drawtext=text='Body Cinema preview-led monetization, powered by VaultX':fontcolor=#ffffff99:fontsize=26:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:x=(w-text_w)/2:y=(h/2)+132`,
  `fade=t=in:st=0:d=0.35`,
  `fade=t=out:st=2.45:d=0.55`,
].join(",");
run("ffmpeg", ["-y", "-f", "lavfi", "-i", ctaFilter, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", cta], "Render CTA fade hold");

const finalList = path.join(renderDir, "final_segments.txt");
fs.writeFileSync(finalList, [broll, logo, cta].map((f) => `file '${f.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
const silentVideo = path.join(renderDir, "vaultx_homepage_kingcam_trailer_silent.mp4");
run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", finalList, "-c", "copy", silentVideo], "Concatenate B-roll, logo, and CTA timeline");

const finalOut = path.join(videoDir, "vaultx-homepage-kingcam-trailer.mp4");
run("ffmpeg", [
  "-y",
  "-i", silentVideo,
  "-f", "lavfi",
  "-i", "sine=frequency=52:duration=18:sample_rate=48000",
  "-filter_complex", "[1:a]volume=0.055,afade=t=in:st=0:d=0.6,afade=t=out:st=17.1:d=0.9[a]",
  "-map", "0:v:0",
  "-map", "[a]",
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "128k",
  "-movflags", "+faststart",
  finalOut,
], "Mux platform-owned low-rumble timing bed");

const poster = path.join(videoDir, "vaultx-homepage-kingcam-trailer-poster.jpg");
run("ffmpeg", ["-y", "-ss", "2.4", "-i", finalOut, "-frames:v", "1", "-q:v", "2", poster], "Extract homepage trailer poster from platform-native AI hero shot");

const provenance = {
  generatedAt,
  policy: "CreatorVault platform-native only; the lead shot was generated through CreatorVault's own KingCam AI service using the production Pollo/Kling provider. No Manus media generation was used.",
  output: {
    mp4: "/videos/vaultx-homepage-kingcam-trailer.mp4",
    poster: "/videos/vaultx-homepage-kingcam-trailer-poster.jpg",
    durationSeconds: 18,
    dimensions: `${w}x${h}`,
  },
  platformNativeGeneration: {
    provider: aiClipMeta.provider,
    model: aiClipMeta.model,
    vertical: aiClipMeta.vertical,
    servicePath: aiClipMeta.servicePath,
    sourceAsset: path.relative(root, sources.platformNativeAI),
    sourceUrl: aiClipMeta.output?.redactedSourceUrl,
  },
  sourceAssets: {
    platformNativeAI: path.relative(root, sources.platformNativeAI),
    cloneWide: path.relative(root, sources.cloneWide),
    cloneSquare: path.relative(root, sources.cloneSquare),
    heroVertical: path.relative(root, sources.heroVertical),
  },
  cutSheet: [
    "0:00-0:05 CreatorVault-native KingCam AI hero movement via Pollo/Kling 3.0",
    "0:05-0:07 verified KingCam stride crop with gold grade",
    "0:07-0:09 verified KingCam chest/face-forward hero footage",
    "0:09-0:11 verified KingCam wide/platform-world cut",
    "0:11-0:13 verified KingCam close-up hold before hit",
    "0:13-0:15 CreatorVault gold logo hold",
    "0:15-0:18 CTA fade: Join as Creator / Explore as Fan",
  ],
  audio: "Commercial reference track not embedded because no licensed file was supplied; included only a platform-owned low-rumble timing bed suitable for muted homepage autoplay.",
};
fs.writeFileSync(path.join(renderDir, "vaultx_homepage_kingcam_trailer_provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log("\n[CreatorVault render] Complete:");
console.log(`  ${finalOut}`);
console.log(`  ${poster}`);
