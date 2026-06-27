/**
 * Compliance tRPC Router — consent, age verification, 2257, audit logs
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { complianceVault } from "../services/complianceVault";

export const complianceRouter = router({
  checkEligibility: protectedProcedure.input(z.object({
    jurisdiction: z.enum(["US", "UK", "EU", "CA", "AU", "GLOBAL"]).default("GLOBAL"),
  })).query(({ ctx, input }) => {
    return complianceVault.checkGenerationEligibility(String(ctx.user.id), input.jurisdiction);
  }),

  getReport: protectedProcedure.query(({ ctx }) => {
    return complianceVault.generateComplianceReport(String(ctx.user.id));
  }),

  // One-shot: creator confirms 18+ and ownership → records age attestation + all
  // consents so launch is never blocked. This is what the consent checkbox calls.
  confirmEligibility: protectedProcedure.mutation(async ({ ctx }) => {
    return complianceVault.confirmCreatorEligibility(String(ctx.user.id));
  }),

  recordConsent: protectedProcedure.input(z.object({
    scope: z.array(z.enum(["generation", "distribution", "monetization", "ai_training", "likeness_use", "third_party_platform"])),
    consentVersion: z.string().default("1.0"),
  })).mutation(async ({ ctx, input }) => {
    return complianceVault.recordConsent(
      String(ctx.user.id),
      "CreatorVault Platform",
      input.scope,
      "I consent to the use of my likeness and content for the specified purposes on the CreatorVault platform.",
      input.consentVersion,
      "click_accept",
      "0.0.0.0",
      "server",
      "GLOBAL"
    );
  }),

  getAuditLog: protectedProcedure.input(z.object({
    since: z.string().optional(),
  }).optional()).query(({ ctx, input }) => {
    return complianceVault.getAuditLog({ userId: String(ctx.user.id), since: input?.since });
  }),
});
