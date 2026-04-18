import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const eventBus = router({
  publishEvent: protectedProcedure.input(z.object({ type: z.string(), payload: z.record(z.unknown()), priority: z.string().default("normal") })).mutation(async ({ ctx, input }) => ({ published: true, eventId: Date.now(), type: input.type, userId: ctx.user.id })),
  subscribeToEvents: protectedProcedure.input(z.object({ eventTypes: z.array(z.string()) })).mutation(async ({ ctx, input }) => ({ subscribed: true, eventTypes: input.eventTypes, userId: ctx.user.id })),
  getEventHistory: protectedProcedure.query(async ({ ctx }) => ({ events: [], userId: ctx.user.id })),
  getEventStats: protectedProcedure.query(async () => ({ totalEvents: 0, byType: {}, lastHour: 0 })),
});
export const eventBusRouter = eventBus;
