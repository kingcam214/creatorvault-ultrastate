import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const multiTenant = router({
  getTenants: protectedProcedure.query(async ({ ctx }) => ({ tenants: [], userId: ctx.user.id })),
  createTenant: protectedProcedure.input(z.object({ name: z.string(), domain: z.string().optional() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), name: input.name, domain: input.domain, userId: ctx.user.id })),
  switchTenant: protectedProcedure.input(z.object({ tenantId: z.number() })).mutation(async ({ input }) => ({ switched: true, tenantId: input.tenantId })),
  getTenantSettings: protectedProcedure.query(async ({ ctx }) => ({ settings: {}, userId: ctx.user.id })),
});
export const multiTenantRouter = multiTenant;
