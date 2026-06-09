import "dotenv/config";

import {
  FLUXDEVCAM,
  generateFullBodyCloneVideo,
  generateKingCamImage,
  injectKingCamDNA,
} from "../server/services/kingcamAI";

const mode = process.argv[2] ?? "env";

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.split("/").slice(0, 4).join("/")}/...`;
  } catch {
    return url.slice(0, 80);
  }
}

async function main() {
  const hasReplicate = Boolean(process.env.REPLICATE_API_TOKEN);
  const hasPollo = Boolean(process.env.POLLO_API_KEY);

  const summary = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV ?? null,
    replicateConfigured: hasReplicate,
    polloConfigured: hasPollo,
    model: FLUXDEVCAM.model,
    triggerWord: FLUXDEVCAM.triggerWord,
    promptPreview: injectKingCamDNA(
      "VaultX native AI smoke test portrait, clean composition, no text",
      { suitColor: "jet black velvet with gold trim", styleLevel: "social" },
    ).slice(0, 260),
  };

  if (mode === "env") {
    console.log(JSON.stringify({ ok: hasReplicate && hasPollo, mode, summary }, null, 2));
    return;
  }

  if (mode === "image") {
    if (!hasReplicate) throw new Error("REPLICATE_API_TOKEN missing");
    const result = await generateKingCamImage({
      prompt: "VaultX native AI smoke test portrait, clean composition, no text, KingCam facing camera with confident creator monetization energy",
      injectDNA: true,
      suitColor: "jet black velvet with gold trim",
      styleLevel: "social",
      aspectRatio: "1:1",
      vertical: "clone_lab",
    });
    console.log(JSON.stringify({
      ok: true,
      mode,
      provider: result.provider,
      model: result.model,
      vertical: result.vertical,
      url: redactUrl(result.url),
    }, null, 2));
    return;
  }

  if (mode === "video") {
    if (!hasPollo) throw new Error("POLLO_API_KEY missing");
    const referenceImageUrl = process.argv[3];
    const result = await generateFullBodyCloneVideo({
      prompt: "KingCam steps forward in a luxury VaultX studio, points toward camera, cinematic creator monetization trailer motion, no text overlays",
      referenceImageUrl,
      model: "kling-3.0",
      duration: 5,
    });
    console.log(JSON.stringify({
      ok: true,
      mode,
      provider: result.provider,
      model: result.model,
      vertical: result.vertical,
      url: redactUrl(result.url),
    }, null, 2));
    return;
  }

  throw new Error(`Unknown mode: ${mode}. Use env, image, or video.`);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, mode, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exitCode = 1;
});
