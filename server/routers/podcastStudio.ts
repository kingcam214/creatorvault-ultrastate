import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const podcastStudio = router({
  setupStudio: protectedProcedure.input(z.object({ showName: z.string(), format: z.string(), frequency: z.string() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), showName: input.showName, format: input.format, frequency: input.frequency, userId: ctx.user.id })),
  generateEpisode: protectedProcedure.input(z.object({ topic: z.string(), duration: z.string(), guests: z.array(z.string()).optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Plan a ${input.duration} podcast episode about "${input.topic}"${input.guests?.length ? ` with guests: ${input.guests.join(", ")}` : ""}.

Create: intro, segment breakdown, key questions, and outro.` }], max_tokens: 600 });
    return { episode: c.choices[0].message.content };
  }),
  getStudioSettings: protectedProcedure.query(async ({ ctx }) => ({ settings: { format: "interview", frequency: "weekly", autoPublish: false }, userId: ctx.user.id })),
  getEpisodes: protectedProcedure.input(z.object({ showId: z.string().optional() })).query(async ({ ctx }) => []),
  createShow: protectedProcedure.input(z.object({ title: z.string(), description: z.string(), category: z.string().default("business") })).mutation(async ({ ctx, input }) => {
    return { id: `show-${Date.now()}`, title: input.title, description: input.description, userId: ctx.user.id };
  }),
  getMyShows: protectedProcedure.query(async ({ ctx }) => {
    return [];
  }),
  createEpisode: protectedProcedure.input(z.object({ showId: z.string(), title: z.string(), audioUrl: z.string().optional() })).mutation(async ({ ctx, input }) => {
    return { id: `ep-${Date.now()}`, showId: input.showId, title: input.title, userId: ctx.user.id };
  }),
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    return { totalListens: 0, totalEpisodes: 0, avgListenTime: 0, subscribers: 0, revenue: 0, userId: ctx.user.id };
  }),
  submitToApple: protectedProcedure.input(z.object({ showId: z.string() })).mutation(async ({ input }) => {
    return { showId: input.showId, status: "submitted", platform: "apple_podcasts" };
  }),
  submitToSpotify: protectedProcedure.input(z.object({ showId: z.string() })).mutation(async ({ input }) => {
    return { showId: input.showId, status: "submitted", platform: "spotify" };
  })
});
export const podcastStudioRouter = podcastStudio;
