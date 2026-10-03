import { and, asc, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { videoGenerationChains } from "../../drizzle/schema-persona-vaults";
import { getPersonaVaultDb } from "../db";
import { processVideoChain } from "./videoChainedContinuity";

/** Owner grants and the existing governed provider freeze are separate gates. */
export function startPersonaContinuityWorker(): (() => void) | null {
  if (
    process.env.CREATORVAULT_PERSONA_CHAIN_AUTORUN !== "true" ||
    process.env.CREATORVAULT_GOVERNED_MEDIA_AUTORUN !== "enabled"
  )
    return null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick(): Promise<void> {
    if (stopped) return;
    try {
      const database = await getPersonaVaultDb();
      const chains = await database
        .select({
          id: videoGenerationChains.id,
          userId: videoGenerationChains.userId,
        })
        .from(videoGenerationChains)
        .where(
          and(
            inArray(videoGenerationChains.chainStatus, [
              "pending",
              "generating",
            ]),
            isNotNull(videoGenerationChains.authorization),
            isNull(videoGenerationChains.authorizationClosedAt),
            or(
              isNull(videoGenerationChains.leaseExpiresAt),
              lte(videoGenerationChains.leaseExpiresAt, new Date())
            ),
            lte(videoGenerationChains.nextProcessAt, new Date())
          )
        )
        .orderBy(asc(videoGenerationChains.nextProcessAt))
        .limit(4);
      for (const chain of chains) {
        if (stopped) break;
        await processVideoChain(chain.userId, chain.id);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
              .replace(/x-api-key\s*[:=]\s*[^\s,]+/gi, "x-api-key=[redacted]")
              .slice(0, 300)
          : "Worker database or processing failure";
      console.error("[PersonaContinuity]", message);
    } finally {
      if (!stopped) {
        timer = setTimeout(() => {
          void tick();
        }, 5000);
        timer.unref();
      }
    }
  }
  timer = setTimeout(() => {
    void tick();
  }, 0);
  timer.unref();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
