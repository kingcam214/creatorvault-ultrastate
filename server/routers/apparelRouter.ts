import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";

const HELD_MESSAGE = "Apparel Lab is held until CreatorVault has a verified design, production, and fulfillment lane. No concept, product, model shoot, file, or sales package has been created.";

function apparelCreationHeld(): never {
  throw new TRPCError({ code: "PRECONDITION_FAILED", message: HELD_MESSAGE });
}

/**
 * Legacy Apparel Lab containment boundary.
 *
 * The previous implementation mixed ungoverned language-model calls with
 * non-persistent project IDs, fabricated product prices, empty model shoots,
 * and nonexistent download URLs. Those paths must never be presented as real
 * creator work or allowed to make external calls. The route remains present
 * only to return a truthful held state until a separately authorized apparel
 * architecture exists.
 */
export const apparelRouter = router({
  getAvailability: protectedProcedure.query(() => ({
    state: "held" as const,
    message: HELD_MESSAGE,
    externalGenerationEnabled: false,
    fulfillmentEnabled: false,
    persistentProjectStorageEnabled: false,
  })),

  generateDesignConcept: protectedProcedure.input(z.object({
    brandName: z.string(),
    style: z.string(),
    targetAudience: z.string(),
    colorScheme: z.string().optional(),
    message: z.string().optional(),
  })).mutation(apparelCreationHeld),

  getProductCatalog: protectedProcedure.query(apparelCreationHeld),

  calculatePricing: protectedProcedure.input(z.object({
    productType: z.string(),
    quantity: z.number(),
    printColors: z.number().default(1),
  })).query(apparelCreationHeld),

  quickGenerate: protectedProcedure.input(z.object({ prompt: z.string(), style: z.string().default("streetwear") })).mutation(apparelCreationHeld),
  createProject: protectedProcedure.input(z.object({ name: z.string(), type: z.string().default("collection"), description: z.string().optional() })).mutation(apparelCreationHeld),
  generateMoodboard: protectedProcedure.input(z.object({ theme: z.string(), colors: z.array(z.string()).optional() })).mutation(apparelCreationHeld),
  generateColorways: protectedProcedure.input(z.object({ baseDesign: z.string(), count: z.number().default(3) })).mutation(apparelCreationHeld),
  generateTechPack: protectedProcedure.input(z.object({ designId: z.string(), garment: z.string() })).mutation(apparelCreationHeld),
  generateModelShoot: protectedProcedure.input(z.object({ designId: z.string(), modelType: z.string().default("diverse") })).mutation(apparelCreationHeld),
  generateDropCampaign: protectedProcedure.input(z.object({ collectionId: z.string(), dropDate: z.string() })).mutation(apparelCreationHeld),
  batchGenerateDesigns: protectedProcedure.input(z.object({ prompts: z.array(z.string()), style: z.string().default("streetwear") })).mutation(apparelCreationHeld),
  createCollection: protectedProcedure.input(z.object({ name: z.string(), season: z.string().optional(), theme: z.string().optional() })).mutation(apparelCreationHeld),
  getMyProjects: protectedProcedure.query(apparelCreationHeld),
  getMyOrders: protectedProcedure.query(apparelCreationHeld),
  saveBrandDNA: protectedProcedure.input(z.object({ brandName: z.string(), colors: z.array(z.string()).optional(), voice: z.string().optional() })).mutation(apparelCreationHeld),
});
