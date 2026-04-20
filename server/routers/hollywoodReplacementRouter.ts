import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import OpenAI from "openai";
import {
  HOLLYWOOD_CAPABILITIES,
  HOLLYWOOD_REPLACEMENT_VALUE_PROP,
  generateProjectEstimate,
} from "../services/hollywoodReplacement";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const projectTypeSchema = z.enum([
  "short_film",
  "series",
  "documentary",
  "commercial",
  "music_video",
]);
const qualitySchema = z.enum(["1080p", "4K", "8K"]);

export const hollywoodReplacementRouter = router({
  // ============ INFORMATIONAL (public, read-only) ============

  getCapabilities: publicProcedure.query(() => HOLLYWOOD_CAPABILITIES),

  getValueProp: publicProcedure.query(() => HOLLYWOOD_REPLACEMENT_VALUE_PROP),

  generateProjectEstimate: publicProcedure
    .input(
      z.object({
        projectType: projectTypeSchema,
        targetLength: z.number().min(1).max(600),
        quality: qualitySchema,
        includeMusic: z.boolean(),
        includeVoiceover: z.boolean(),
      })
    )
    .query(({ input }) => generateProjectEstimate(input)),

  // ============ GENERATIVE (authenticated) ============

  createProductionPlan: protectedProcedure
    .input(
      z.object({
        projectType: z.string(),
        budget: z.number(),
        timeline: z.string(),
        concept: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create a Hollywood-level production plan for indie creators:
Project: ${input.projectType}
Budget: $${input.budget}
Timeline: ${input.timeline}
Concept: ${input.concept}

Provide: pre-production checklist, production schedule, post-production workflow, and distribution strategy.`,
          },
        ],
        max_tokens: 700,
      });
      return { plan: c.choices[0].message.content };
    }),

  generateScript: protectedProcedure
    .input(
      z.object({
        genre: z.string(),
        concept: z.string(),
        length: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Write a ${input.length} ${input.genre} script outline:
Concept: ${input.concept}

Include: logline, character descriptions, act structure, and key scenes.`,
          },
        ],
        max_tokens: 700,
      });
      return { script: c.choices[0].message.content };
    }),

  getCastingIdeas: protectedProcedure
    .input(
      z.object({
        roles: z.array(z.string()),
        budget: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Casting strategy for ${input.budget} budget production with roles: ${input.roles.join(", ")}. Include: where to find talent, audition process, and rate expectations.`,
          },
        ],
        max_tokens: 400,
      });
      return { casting: c.choices[0].message.content };
    }),
});
