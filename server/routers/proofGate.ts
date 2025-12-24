import { publicProcedure, router } from "../_core/trpc";
import { getAllFeatures, getFeaturesByStatus, getFeatureStatus } from "../services/proofGate";
import { z } from "zod";

export const proofGateRouter = router({
  getAllFeatures: publicProcedure.query(() => {
    return getAllFeatures();
  }),

  getFeatureStatus: publicProcedure
    .input(z.object({ featureId: z.string() }))
    .query(({ input }) => {
      return getFeatureStatus(input.featureId);
    }),

  getFeaturesByStatus: publicProcedure
    .input(z.object({ status: z.enum(["REAL", "PARTIAL", "NOT_REAL"]) }))
    .query(({ input }) => {
      return getFeaturesByStatus(input.status);
    }),
});
