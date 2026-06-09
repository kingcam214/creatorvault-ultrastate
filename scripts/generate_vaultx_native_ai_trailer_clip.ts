import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { generateKingCamVideo } from "../server/services/kingcamAI";

const root = process.cwd();
const outDir = path.join(root, "client/public/uploads/vaultx/homepage-trailer");
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/g, "-");
const outputPath = path.join(outDir, `platform_native_pollo_kling3_${stamp}.mp4`);
const metaPath = path.join(outDir, `platform_native_pollo_kling3_${stamp}.json`);
const latestPath = path.join(outDir, "platform_native_pollo_kling3_latest.mp4");
const latestMetaPath = path.join(outDir, "platform_native_pollo_kling3_latest.json");

function redactUrl(raw: string) {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname.split("/").slice(0, 4).join("/")}/...`;
  } catch {
    return raw.slice(0, 90);
  }
}

async function downloadToFile(url: string, filePath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
}

async function main() {
  if (!process.env.POLLO_API_KEY) throw new Error("POLLO_API_KEY not configured");
  await fs.mkdir(outDir, { recursive: true });

  const prompt = [
    "KingCam walks through a luxury CreatorVault VaultX studio like a high-value founder and creator magnet,",
    "cinematic dark black and gold environment, confident eye contact, body cinema energy,",
    "premium platform launch trailer, modern adult creator monetization brand, no text overlays, no watermark,",
    "clean camera push-in, dramatic practical lights, premium commercial look"
  ].join(" ");

  const result = await generateKingCamVideo({
    prompt,
    model: "kling-3.0",
    injectDNA: true,
    aspectRatio: "16:9",
    duration: 5,
    mode: "pro",
    vertical: "vaultx"
  });

  await downloadToFile(result.url, outputPath);
  await fs.copyFile(outputPath, latestPath);

  const meta = {
    ok: true,
    generatedAt,
    policy: "Generated through CreatorVault platform-native KingCam AI service using the configured production Pollo provider; no Manus media generation used.",
    servicePath: "generateKingCamVideo -> polloGenerate -> Pollo generation API",
    provider: result.provider,
    model: result.model,
    vertical: result.vertical,
    promptPreview: prompt.slice(0, 260),
    output: {
      relativePath: path.relative(root, outputPath),
      latestRelativePath: path.relative(root, latestPath),
      redactedSourceUrl: redactUrl(result.url)
    }
  };
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
  await fs.copyFile(metaPath, latestMetaPath);
  console.log(JSON.stringify({
    ok: true,
    provider: result.provider,
    model: result.model,
    vertical: result.vertical,
    output: path.relative(root, outputPath),
    latest: path.relative(root, latestPath),
    meta: path.relative(root, metaPath),
    redactedSourceUrl: redactUrl(result.url)
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exitCode = 1;
});
