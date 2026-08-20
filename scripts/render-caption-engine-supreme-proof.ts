import fs from "fs";
import path from "path";
import { renderWithRemotion } from "../server/remotion/remotionRenderService";

const sourcePath = "/home/ubuntu/upload/VID_20260617_172022.mp4";
const outputDir = process.env.CAPTION_SUPREME_PROOF_DIR || "/tmp/caption-engine-supreme-proof";
if (!fs.existsSync(sourcePath)) throw new Error("The owner-supplied proof source is no longer available.");
fs.mkdirSync(outputDir, { recursive: true });

const timedPayload = JSON.parse(fs.readFileSync("/tmp/creatorvault_caption_timed_words.json", "utf8"));
const timedSource = timedPayload.result.data.json;
const segments = timedSource.segments;
if (!Array.isArray(segments) || !segments.length) throw new Error("CreatorVault timed words are unavailable for this proof source.");

const result = await renderWithRemotion({
  jobId: "caption-engine-supreme-real-source-tiktok",
  mode: "caption_stage",
  baseImagePath: "",
  baseImageUrl: "",
  backgroundVideoUrl: "http://127.0.0.1:4174/VID_20260617_172022.mp4",
  width: 1080,
  height: 1920,
  fps: 30,
  durationSeconds: 12,
  motionPreset: "royal_purple",
  premiumMode: true,
  cinematicMode: true,
  artistName: "CreatorVault",
  songTitle: "Real Source Caption Proof",
  subtitle: "",
  textPreset: "caption-stage",
  accentColor: "E8D2FF",
  textColor: "FFFFFF",
  fontFamily: "Montserrat",
  outputPath: path.join(outputDir, "caption-engine-supreme-real-source-tiktok.mp4"),
  captionSegments: segments,
  captionStyle: "founder",
  captionPlacement: "adaptive",
  captionSafeZone: "platform_safe",
  captionPlatformProfile: "tiktok",
  captionQualityMode: "strict",
  captionFocusRegions: [{ id: "speaker-middle", x: .16, y: .37, width: .68, height: .30, label: "Person in middle", source: "creator_marked" }],
  captionTypography: { size: 1, color: "#FFFFFF", highlightColor: "#E8D2FF", background: "#0A0A0A" },
});
if (!result.success || !result.videoPath || !fs.existsSync(result.videoPath)) throw new Error(String(result.error || "No playable real-source proof was produced."));
console.log(JSON.stringify(result, null, 2));
