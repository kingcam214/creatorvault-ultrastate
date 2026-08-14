import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const BRAND_DNA_HELD_MESSAGE =
  "Brand DNA recovery is anchored to the owner-authored CreatorVault visual law and verified creator material. The old tool could invent a generic profile or call an ungoverned model, so it is held until real saved style evidence is connected.";

function held(): never {
  throw new Error(BRAND_DNA_HELD_MESSAGE);
}

/**
 * Truth boundary for the legacy Brand DNA router.
 *
 * The actual governing visual direction remains in BRAND_DNA_QUALITY_LAW.md.
 * This old route is not a source of truth because it returned a hardcoded,
 * generic profile and could create unsupervised model output.
 */
export const brandDNARouter = router({
  extractBrandDNA: protectedProcedure
    .input(z.object({
      brandName: z.string(),
      description: z.string(),
      existingContent: z.array(z.string()).optional(),
      competitors: z.array(z.string()).optional(),
    }))
    .mutation(async (): Promise<{ dna: string }> => held()),

  applyBrandDNA: protectedProcedure
    .input(z.object({
      content: z.string(),
      brandDNA: z.string(),
      contentType: z.string(),
    }))
    .mutation(async (): Promise<{ rewritten: string }> => held()),

  getBrandProfile: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async (): Promise<{ brandId: string; name: string; colors: string[]; fonts: string[]; voice: string; mission: string; values: string[]; targetAudience: string }> => held()),
});
