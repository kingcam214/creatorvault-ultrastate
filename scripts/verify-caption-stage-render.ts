import fs from "fs";
import path from "path";
import { CAPTION_ENGINE_TEMPLATES } from "../shared/captionEngine";
import { renderWithRemotion } from "../server/remotion/remotionRenderService";

const outputDir = process.env.STORAGE_DIR || path.join(process.cwd(), ".caption-stage-render-proof");
const backgroundVideoUrl = process.env.CAPTION_PROOF_SOURCE_URL || "";
fs.mkdirSync(outputDir, { recursive: true });

const completed: Array<{ id: string; title: string; videoPath: string; videoUrl?: string; durationSeconds?: number }> = [];
for (const template of CAPTION_ENGINE_TEMPLATES) {
  const result = await renderWithRemotion({
    jobId: `caption-engine-proof-${template.id}`,
    mode: "caption_stage",
    baseImagePath: "",
    baseImageUrl: "",
    backgroundVideoUrl,
    width: 540,
    height: 960,
    fps: 30,
    durationSeconds: 2,
    motionPreset: "royal_purple",
    premiumMode: true,
    cinematicMode: true,
    artistName: "CreatorVault",
    songTitle: template.title,
    subtitle: "",
    textPreset: "caption-stage",
    accentColor: "E8D2FF",
    textColor: "FFFFFF",
    fontFamily: "Montserrat",
    captionSegments: [
      { start: 0.1, end: 0.85, text: "MAKE THE" },
      { start: 0.86, end: 1.82, text: "MOMENT LAND" },
    ],
    captionStyle: template.id,
    captionPlacement: "adaptive",
    captionSafeZone: "platform_safe",
  });
  if (!result.success || !result.videoPath || !fs.existsSync(result.videoPath)) {
    throw new Error(`${template.id}: ${String(result.error || "Caption Engine proof render did not produce a video.")}`);
  }
  completed.push({ id: template.id, title: template.title, videoPath: result.videoPath, videoUrl: result.videoUrl, durationSeconds: result.durationSeconds });
}

const manifestPath = path.join(outputDir, "caption-engine-proof-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify({ styleCount: CAPTION_ENGINE_TEMPLATES.length, backgroundVideoUrl: Boolean(backgroundVideoUrl), completed }, null, 2));
console.log(JSON.stringify({ success: true, styleCount: completed.length, manifestPath, completed }, null, 2));
