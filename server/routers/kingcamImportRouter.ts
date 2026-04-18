import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
export const kingcamImportRouter = router({
  importContent: protectedProcedure.input(z.object({ source: z.string(), data: z.array(z.record(z.unknown())), type: z.string() })).mutation(async ({ ctx, input }) => {
    const imported = await Promise.all(input.data.slice(0, 50).map(async (item) => {
      const [content] = await db.db.insert(db.schema.content).values({ userId: ctx.user.id, type: input.type, body: JSON.stringify(item), platform: input.source, status: "imported", createdAt: new Date() }).$returningId();
      return content.id;
    }));
    return { imported: imported.length, source: input.source };
  }),
  getImportHistory: protectedProcedure.query(async ({ ctx }) => ({ imports: [], userId: ctx.user.id })),
  validateImport: protectedProcedure.input(z.object({ data: z.array(z.record(z.unknown())), type: z.string() })).mutation(async ({ input }) => ({ valid: true, count: input.data.length, warnings: [] })),
});