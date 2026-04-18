import { router, publicProcedure } from "../_core/trpc";

export const courseVideoRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "courseVideoRouter" }; }),
});
