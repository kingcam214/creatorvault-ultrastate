
import { runBoostDrop } from "../server/services/kingcamMediaFactory.ts";
function safeUrl(url){ if(!url) return null; try { const u = new URL(url); return u.origin + u.pathname.split("/").slice(0,5).join("/") + "/..."; } catch { return String(url).slice(0,120); } }
async function main(){
  const result = await runBoostDrop({ userId: 1, vertical: "clone_lab", suitColor: "jet black velvet with gold trim", topic: "CreatorVault proof drop: turn one mobile creator idea into a paid VIP content asset in under one hour" });
  const safe = { ...result, audioUrl: safeUrl(result.audioUrl), imageUrl: safeUrl(result.imageUrl), videoUrl: safeUrl(result.videoUrl), thumbnailUrl: safeUrl(result.thumbnailUrl), scriptPreview: result.scriptText.slice(0,900), scriptLength: result.scriptText.length };
  delete safe.scriptText;
  console.log(JSON.stringify(safe, null, 2));
}
main().catch(err => { console.error(err?.stack || String(err)); process.exit(1); });
