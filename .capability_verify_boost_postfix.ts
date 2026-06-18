import fs from "node:fs/promises";
import { runBoostDrop } from "./server/services/kingcamMediaFactory.ts";

const output = "/root/creatorvault_capability_test_output/boost_factory_capability_postfix.json";
const startedAt = new Date().toISOString();
try {
  const result = await runBoostDrop({
    topic: "CreatorVault proof drop: turn one mobile creator idea into a paid VIP content asset in under one hour",
    userId: 1,
    vertical: "clone_lab",
    suitColor: "midnight black suit with gold CreatorVault accents",
  });
  const proof = {
    generatedAt: new Date().toISOString(),
    startedAt,
    ok: result.status !== "failed" && Boolean(result.scriptText) && Boolean(result.imageUrl) && Boolean(result.dbRows.cloneVideoId),
    status: result.status,
    scriptLength: result.scriptText?.length ?? 0,
    scriptPreview: (result.scriptText ?? "").slice(0, 700),
    hasAudio: Boolean(result.audioUrl),
    hasImage: Boolean(result.imageUrl),
    hasVideo: Boolean(result.videoUrl),
    hasCloneVideoDbRow: Boolean(result.dbRows.cloneVideoId),
    dbRows: result.dbRows,
    provider: result.provider,
    audioUrl: result.audioUrl,
    imageUrl: result.imageUrl,
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    errors: result.errors,
  };
  await fs.writeFile(output, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  process.exit(proof.ok ? 0 : 2);
} catch (error: any) {
  const proof = { generatedAt: new Date().toISOString(), startedAt, ok: false, thrown: error?.message || String(error), stack: error?.stack?.split("\n").slice(0, 8) };
  await fs.writeFile(output, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  process.exit(1);
}
