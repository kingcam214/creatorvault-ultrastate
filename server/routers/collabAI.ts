import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const collabAIRouter = router({
  findCollabMatches: protectedProcedure.input(z.object({
    yourNiche: z.string(),
    yourFollowers: z.number(),
    collabType: z.enum(["content", "product", "shoutout", "joint_venture"]),
    targetAudienceSize: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Find ideal collaboration matches for:
Niche: ${input.yourNiche}
Followers: ${input.yourFollowers.toLocaleString()}
Collab Type: ${input.collabType}
Target Partner Size: ${input.targetAudienceSize}

Suggest: 5 types of ideal collab partners, what to offer them, how to pitch, and expected outcome.`,
      }],
      max_tokens: 600,
    });
    return { matches: completion.choices[0].message.content };
  }),

  generateCollabPitch: protectedProcedure.input(z.object({
    partnerName: z.string(),
    partnerNiche: z.string(),
    yourValue: z.string(),
    proposedCollab: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write a collab pitch to ${input.partnerName} (${input.partnerNiche}):
What I bring: ${input.yourValue}
Proposed collab: ${input.proposedCollab}

Write a compelling, brief pitch that leads with value and makes it easy to say yes.`,
      }],
      max_tokens: 300,
    });
    return { pitch: completion.choices[0].message.content };
  }),
});
