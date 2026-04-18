import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const flyerBatchExportRouter = router({
  exportBatch: protectedProcedure.input(z.object({ flyerIds: z.array(z.string()), format: z.enum(["png", "jpg", "pdf", "zip"]) })).mutation(async ({ input }) => ({ exportId: Date.now().toString(), flyerCount: input.flyerIds.length, format: input.format, status: "processing", estimatedTime: "30 seconds" })),
  getExportStatus: protectedProcedure.input(z.object({ exportId: z.string() })).query(async ({ input }) => ({ exportId: input.exportId, status: "ready", downloadUrl: null })),
  getExportHistory: protectedProcedure.query(async ({ ctx }) => ({ exports: [], userId: ctx.user.id })),
});