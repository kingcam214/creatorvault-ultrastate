import fs from "fs";
import path from "path";
import { renderWithRemotion } from "../server/remotion/remotionRenderService";

const outputDir = process.env.STORAGE_DIR || path.join(process.cwd(), ".caption-stage-render-proof");
fs.mkdirSync(outputDir, { recursive: true });

const result = await renderWithRemotion({
  jobId: "caption-stage-runtime-proof",
  mode: "caption_stage",
  baseImagePath: "",
  baseImageUrl: "",
  backgroundVideoUrl: "",
  width: 540,
  height: 960,
  fps: 30,
  durationSeconds: 2,
  motionPreset: "royal_purple",
  premiumMode: true,
  cinematicMode: true,
  artistName: "CreatorVault",
  songTitle: "Caption Stage Runtime Proof",
  subtitle: "",
  textPreset: "caption-stage",
  accentColor: "E8D2FF",
  textColor: "FFFFFF",
  fontFamily: "Montserrat",
  captionSegments: [{ start: 0.15, end: 1.75, text: "REAL TIMED WORDS" }],
  captionStyle: "command",
  captionPlacement: "lower",
  captionSafeZone: "vertical",
});

if (!result.success || !result.videoPath || !fs.existsSync(result.videoPath)) {
  throw new Error(String(result.error || "Caption Stage runtime render did not produce a video."));
}
console.log(JSON.stringify({ success: result.success, videoPath: result.videoPath, videoUrl: result.videoUrl, durationSeconds: result.durationSeconds }));
