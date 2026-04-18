import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const studioSlotsRouter = router({
  getAvailableSlots: protectedProcedure.input(z.object({ date: z.string(), studioType: z.string() })).query(async ({ input }) => ({ slots: [{ time: "9:00 AM", available: true }, { time: "11:00 AM", available: true }, { time: "2:00 PM", available: false }, { time: "4:00 PM", available: true }], date: input.date })),
  bookSlot: protectedProcedure.input(z.object({ date: z.string(), time: z.string(), studioType: z.string(), duration: z.number() })).mutation(async ({ ctx, input }) => ({ bookingId: Date.now(), ...input, userId: ctx.user.id, status: "confirmed" })),
  getMyBookings: protectedProcedure.query(async ({ ctx }) => ({ bookings: [], userId: ctx.user.id })),
  cancelBooking: protectedProcedure.input(z.object({ bookingId: z.number() })).mutation(async ({ input }) => ({ cancelled: true, bookingId: input.bookingId })),
});