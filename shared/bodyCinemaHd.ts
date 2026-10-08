import { z } from "zod";

export const BODY_CINEMA_HD_VERSION = "body_cinema.hd_recipe.v1" as const;
export const bodyCinemaHdGradeSchema = z.enum([
  "obsidian",
  "la_reina",
  "golden_hour",
  "midnight_heat",
]);
export const bodyCinemaHdSegmentSchema = z
  .object({
    startMs: z.number().finite().min(0),
    endMs: z.number().finite().positive(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.endMs - v.startMs < 2000)
      c.addIssue({
        code: "custom",
        message:
          "Each native-source shot needs at least two seconds of breathing room.",
      });
  });
export const bodyCinemaHdRecipeSchema = z
  .object({
    version: z.literal(BODY_CINEMA_HD_VERSION),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/i),
    sourceAssetId: z.string().min(1).max(191),
    bodyFocusId: z.string().min(1),
    bodyFocusLabel: z.string().min(1),
    editStyleId: z.string().min(1),
    editStyleName: z.string().min(1),
    visualGradeId: bodyCinemaHdGradeSchema,
    segments: z.array(bodyCinemaHdSegmentSchema).min(3).max(6),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationSeconds: z.number().finite().min(10).max(15),
    framing: z.literal("complete_native_source"),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      ![
        [1920, 1080],
        [1080, 1920],
        [1080, 1080],
      ].some(([w, h]) => w === v.width && h === v.height)
    )
      c.addIssue({ code: "custom", message: "An HD canvas is required." });
    const duration = v.segments.reduce(
      (total, s) => total + (s.endMs - s.startMs) / 1000,
      0
    );
    if (Math.abs(duration - v.durationSeconds) > 0.001)
      c.addIssue({
        code: "custom",
        message: "The duration must match the exact saved source cuts.",
      });
    for (let i = 0; i < v.segments.length; i++)
      for (let j = i + 1; j < v.segments.length; j++) {
        if (
          v.segments[i].startMs < v.segments[j].endMs &&
          v.segments[j].startMs < v.segments[i].endMs
        )
          c.addIssue({
            code: "custom",
            message:
              "Repeated or overlapping source footage is not authorized.",
          });
      }
  });
export type BodyCinemaHdRecipe = z.infer<typeof bodyCinemaHdRecipeSchema>;
export const bodyCinemaHdJobSchema = z
  .object({
    version: z.literal("body_cinema.hd_job.v1"),
    id: z.string().uuid(),
    lifecycleId: z.string().uuid(),
    creatorId: z.number().int().positive(),
    treatmentHash: z.string().regex(/^[a-f0-9]{64}$/i),
    recipe: bodyCinemaHdRecipeSchema,
    recipeHash: z.string().regex(/^[a-f0-9]{64}$/i),
    status: z.enum(["prepared", "rendering", "ready", "failed"]),
    createdAt: z.string().datetime(),
    startedAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
    error: z.string().max(600).nullable(),
    candidate: z
      .object({
        assetId: z.string().min(1).max(191),
        sha256: z.string().regex(/^[a-f0-9]{64}$/i),
        sizeBytes: z.number().int().positive(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        durationSeconds: z.number().positive(),
        frameRate: z.number().positive(),
        frameCount: z.number().int().positive(),
        hasAudio: z.boolean(),
        gradeVersion: z.string().min(1),
      })
      .strict()
      .nullable(),
    ownerAcceptance: z.literal("not_reviewed"),
    externalCostUsd: z.literal(0),
    providerCallMade: z.literal(false),
  })
  .strict()
  .superRefine((v, c) => {
    if ((v.status === "ready") !== Boolean(v.candidate))
      c.addIssue({
        code: "custom",
        message: "Only a verified ready job may expose a candidate.",
      });
  });
export type BodyCinemaHdJob = z.infer<typeof bodyCinemaHdJobSchema>;
export const bodyCinemaHdGetSchema = z
  .object({ id: z.string().uuid() })
  .strict();
export const bodyCinemaHdPrepareSchema = z
  .object({
    id: z.string().uuid(),
    treatmentHash: z.string().regex(/^[a-f0-9]{64}$/i),
    segments: z.array(bodyCinemaHdSegmentSchema).min(3).max(6),
  })
  .strict();
export const bodyCinemaHdExecuteSchema = z
  .object({
    id: z.string().uuid(),
    jobId: z.string().uuid(),
    recipeHash: z.string().regex(/^[a-f0-9]{64}$/i),
    authorization: z
      .object({
        version: z.literal("body_cinema.hd_private_review_authorization.v1"),
        ownSource: z.literal(true),
        performerLikenessConsent: z.literal(true),
        watchedSelectedNativeRanges: z.literal(true),
        completeHeadAndChinVisible: z.literal(true),
        purpose: z.literal("private_hd_candidate_review"),
        externalCostCeilingUsd: z.literal(0),
        noPublication: z.literal(true),
        acknowledgesNoIndependentVerification: z.literal(true),
      })
      .strict(),
  })
  .strict();
