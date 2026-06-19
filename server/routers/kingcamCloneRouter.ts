import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { and, eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type KingCamCloneProfile = {
  schema: "kingcam_clone_profile_v1";
  name: string;
  style: string;
  platforms: string[];
  aiProfile: string;
  trainingSessions: Array<{
    trainedAt: string;
    contentCharacters: number;
    styleGuide: string;
  }>;
};

function parseCloneProfile(raw: unknown): KingCamCloneProfile | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KingCamCloneProfile>;
    if (parsed?.schema !== "kingcam_clone_profile_v1") return null;
    return {
      schema: "kingcam_clone_profile_v1",
      name: String(parsed.name || "KingCam Clone"),
      style: String(parsed.style || "Luxury"),
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map(String) : [],
      aiProfile: String(parsed.aiProfile || ""),
      trainingSessions: Array.isArray(parsed.trainingSessions) ? parsed.trainingSessions : [],
    };
  } catch {
    return null;
  }
}

function toClientClone(row: any) {
  const profile = parseCloneProfile(row.platforms);
  return {
    ...row,
    name: profile?.name || row.creatorType || "KingCam Clone",
    style: profile?.style || row.creatorType || "Luxury",
    platforms: profile?.platforms || [],
    aiProfile: profile?.aiProfile || "",
    trainingSessions: profile?.trainingSessions || [],
    trainingSessionCount: profile?.trainingSessions.length || 0,
  };
}

export const kingcamCloneRouter = router({
  getKingcamClones: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db
      .select()
      .from(db.schema.creators)
      .where(eq(db.schema.creators.userId, ctx.user.id))
      .limit(10);

    return { clones: clones.map(toClientClone) };
  }),

  createKingcamClone: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        style: z.string().min(1).max(120),
        platforms: z.array(z.string().min(1).max(80)).min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You create production KingCam clone operating profiles. Be specific, premium, platform-aware, and truthful. Do not claim fine-tuning, model training, or autonomous posting unless explicitly backed by a real integration.",
          },
          {
            role: "user",
            content: `Create a KingCam AI clone operating profile:\nName: ${input.name}\nStyle: ${input.style}\nPlatforms: ${input.platforms.join(", ")}\n\nDefine: personality, content approach, posting schedule, monetization strategy, visual identity rules, and safety constraints.`,
          },
        ],
        max_tokens: 700,
      });

      const aiProfile = completion.choices[0]?.message?.content || "";
      const profile: KingCamCloneProfile = {
        schema: "kingcam_clone_profile_v1",
        name: input.name,
        style: input.style,
        platforms: input.platforms,
        aiProfile,
        trainingSessions: [],
      };

      const [clone] = await db.db
        .insert(db.schema.creators)
        .values({
          userId: ctx.user.id,
          creatorType: input.style,
          platforms: JSON.stringify(profile),
          status: "active",
          onboardedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      const cloneId = (clone as any)?.id;
      return {
        id: cloneId,
        profile: aiProfile,
        clone: {
          id: cloneId,
          name: input.name,
          style: input.style,
          platforms: input.platforms,
          status: "active",
          aiProfile,
          trainingSessions: [],
          trainingSessionCount: 0,
        },
        profilePersisted: true,
      };
    }),

  trainKingcamClone: protectedProcedure
    .input(
      z.object({
        cloneId: z.union([z.string().min(1), z.number()]),
        content: z.string().min(1).max(20000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cloneId = String(input.cloneId);
      const rows = await db.db
        .select()
        .from(db.schema.creators)
        .where(and(eq(db.schema.creators.id, cloneId), eq(db.schema.creators.userId, ctx.user.id)))
        .limit(1);

      const existing = rows[0] as any;
      if (!existing) {
        throw new Error("KingCam clone not found for this user.");
      }

      const currentProfile = parseCloneProfile(existing.platforms) || {
        schema: "kingcam_clone_profile_v1" as const,
        name: existing.creatorType || "KingCam Clone",
        style: existing.creatorType || "Luxury",
        platforms: [],
        aiProfile: "",
        trainingSessions: [],
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract a practical creator voice/style guide from the supplied content. This is persisted as clone operating memory; do not claim actual model fine-tuning. Include tone, vocabulary, pacing, visual rules, offers, CTAs, do/don't rules, and production notes.",
          },
          {
            role: "user",
            content: `Existing clone profile:\n${currentProfile.aiProfile}\n\nNew training content:\n${input.content}`,
          },
        ],
        max_tokens: 700,
      });

      const styleGuide = completion.choices[0]?.message?.content || "";
      const updatedProfile: KingCamCloneProfile = {
        ...currentProfile,
        trainingSessions: [
          ...currentProfile.trainingSessions,
          {
            trainedAt: new Date().toISOString(),
            contentCharacters: input.content.length,
            styleGuide,
          },
        ],
      };

      await db.db
        .update(db.schema.creators)
        .set({
          platforms: JSON.stringify(updatedProfile),
          status: "active",
          updatedAt: new Date(),
        })
        .where(and(eq(db.schema.creators.id, cloneId), eq(db.schema.creators.userId, ctx.user.id)));

      return {
        cloneId,
        profilePersisted: true,
        trainingState: "style_guide_persisted",
        trainingSessionCount: updatedProfile.trainingSessions.length,
        styleGuide,
      };
    }),
});
