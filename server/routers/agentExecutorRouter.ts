import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

export const agentExecutorRouter = router({
  getStatus: protectedProcedure.query(async () => {
    return { status: "idle", activeAgents: 0 };
  }),
  listJobs: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async () => {
      return { jobs: [] };
    }),
});
