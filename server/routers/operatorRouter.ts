import { router, publicProcedure } from "../_core/trpc";

export const operatorRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "operatorRouter" }; }),
});
