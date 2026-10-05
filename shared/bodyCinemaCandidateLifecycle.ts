import { z } from "zod";

export const BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION =
  "body_cinema.crown_reveal.v1" as const;
export const BODY_CINEMA_CREATOR_ASSERTION_VERSION =
  "body_cinema.creator_assertion.v1" as const;
export const BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION =
  "body_cinema.future_attachment_grant.v1" as const;

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
export const lifecycleIdSchema = z.string().uuid();
export const mediaAssetIdSchema = z.string().min(1).max(191);

export const bodyCinemaLifecycleStateSchema = z.enum([
  "qualified",
  "frozen",
  "awaiting_candidate",
  "candidate_attached",
  "review_in_progress",
  "rejected",
  "accepted",
  "handoff_ready",
]);
export type BodyCinemaLifecycleState = z.infer<
  typeof bodyCinemaLifecycleStateSchema
>;

/**
 * This is a creator self-attestation. It deliberately does not assert independent
 * verification of age, identity, ownership, or legal rights.
 */
export const bodyCinemaCreatorRightsInputSchema = z
  .object({
    version: z.literal(BODY_CINEMA_CREATOR_ASSERTION_VERSION),
    ownSource: z.literal(true),
    performerLikenessConsent: z.literal(true),
    treatmentScope: z.literal("crown_reveal_candidate_review"),
    intendedUse: z.enum([
      "private_candidate_review",
      "accepted_master_and_trailer_plan",
    ]),
    acknowledgesNoIndependentVerification: z.literal(true),
  })
  .strict();
export type BodyCinemaCreatorRightsInput = z.infer<
  typeof bodyCinemaCreatorRightsInputSchema
>;

export const bodyCinemaCreatorRightsSnapshotSchema =
  bodyCinemaCreatorRightsInputSchema.extend({
    verificationStatus: z.literal(
      "creator_asserted_not_independently_verified"
    ),
    assertedAt: z.string().datetime(),
  });
export type BodyCinemaCreatorRightsSnapshot = z.infer<
  typeof bodyCinemaCreatorRightsSnapshotSchema
>;

export const bodyCinemaCropBoundarySchema = z
  .object({
    left: z.number().min(0).max(1),
    top: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict();

export const bodyCinemaCrownRevealTreatmentSchema = z
  .object({
    version: z.literal(BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION),
    treatmentName: z.literal("Crown Reveal"),
    feeling: z.string().trim().min(3).max(280),
    opening: z.string().trim().min(3).max(600),
    hook: z.string().trim().min(3).max(600),
    sourceMoment: z
      .object({
        startSeconds: z.number().min(0),
        endSeconds: z.number().positive(),
        rationale: z.string().trim().min(3).max(800),
      })
      .strict(),
    bodyFaceEmphasis: z
      .array(
        z.enum(["face", "shoulders", "torso", "hips", "legs", "full_body"])
      )
      .min(1)
      .max(6),
    cropBoundaries: bodyCinemaCropBoundarySchema,
    naturalRhythm: z.string().trim().min(3).max(600),
    originalAudio: z.literal("preserve_original_audio"),
    colorLight: z.string().trim().min(3).max(600),
    typography: z.string().trim().min(3).max(600),
    ending: z.string().trim().min(3).max(600),
    rejectionConditions: z
      .array(z.string().trim().min(3).max(400))
      .min(3)
      .max(16),
    proposedOutput: z
      .object({
        aspectRatio: z.literal("9:16"),
        width: z.number().int().min(240).max(2160),
        height: z.number().int().min(426).max(3840),
        durationSeconds: z.number().min(1).max(60),
        codec: z.literal("h264"),
        container: z.literal("mp4"),
      })
      .strict(),
    noUpscale: z.literal(true),
    noSyntheticRepeats: z.literal(true),
  })
  .strict();
export type BodyCinemaCrownRevealTreatment = z.infer<
  typeof bodyCinemaCrownRevealTreatmentSchema
>;

export const DEFAULT_CROWN_REVEAL_TREATMENT: Omit<
  BodyCinemaCrownRevealTreatment,
  "sourceMoment"
> = {
  version: BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
  treatmentName: "Crown Reveal",
  feeling: "Composed confidence with a measured, creator-led reveal.",
  opening:
    "Open on the selected natural source moment without a synthetic reset.",
  hook: "Let the source-supported pose and expression create the first-second pull.",
  bodyFaceEmphasis: ["face", "torso", "full_body"],
  cropBoundaries: { left: 0, top: 0, width: 1, height: 1 },
  naturalRhythm:
    "Preserve the source movement and breathing room; do not manufacture repeated beats.",
  originalAudio: "preserve_original_audio",
  colorLight:
    "Retain natural texture and source light with restrained contrast only.",
  typography:
    "Sparse, source-respecting typography that never covers the selected face or body emphasis.",
  ending:
    "Finish on a stable, natural held source moment rather than a synthetic loop.",
  rejectionConditions: [
    "Any source or candidate hash mismatch.",
    "Any anatomy, identity, continuity, or consent concern.",
    "Any synthetic repeat, upscale, inaccessible artifact, or treatment divergence.",
  ],
  proposedOutput: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationSeconds: 12,
    codec: "h264",
    container: "mp4",
  },
  noUpscale: true,
  noSyntheticRepeats: true,
};

export const bodyCinemaPublicAssetSnapshotSchema = z
  .object({
    assetId: mediaAssetIdSchema,
    fileName: z.string().min(1).max(512),
    sizeBytes: z.number().int().positive(),
    sha256: sha256Schema,
    mimeType: z.string().min(1).max(128),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationSeconds: z.number().positive(),
    receiptId: z.string().min(1).max(191),
    classification: z.string().min(1).max(96),
  })
  .strict();
export type BodyCinemaPublicAssetSnapshot = z.infer<
  typeof bodyCinemaPublicAssetSnapshotSchema
>;

export const bodyCinemaCandidateProvenanceSchema = z
  .object({
    provenanceReference: z.string().trim().min(8).max(512),
    sourceHash: sha256Schema,
    treatmentHash: sha256Schema,
    candidateHash: sha256Schema,
    attachmentAuthorizationRef: z.string().trim().min(8).max(512),
    attachedAt: z.string().datetime(),
  })
  .strict();

export const bodyCinemaReviewSchema = z
  .object({
    id: lifecycleIdSchema,
    startedAt: z.string().datetime(),
    sourceHash: sha256Schema,
    candidateHash: sha256Schema,
    source: bodyCinemaPublicAssetSnapshotSchema,
    candidate: bodyCinemaPublicAssetSnapshotSchema,
  })
  .strict();

export const bodyCinemaDecisionSchema = z
  .object({
    id: lifecycleIdSchema,
    decision: z.enum(["accept", "reject"]),
    reviewId: lifecycleIdSchema,
    reason: z.string().min(12).max(3000),
    candidateHash: sha256Schema,
    sourceHash: sha256Schema,
    decidedAt: z.string().datetime(),
  })
  .strict();

export const bodyCinemaHandoffSchema = z
  .object({
    trailerProjectId: lifecycleIdSchema,
    decisionId: lifecycleIdSchema,
    createdAt: z.string().datetime(),
    sourceAssetId: mediaAssetIdSchema,
    candidateAssetId: mediaAssetIdSchema,
    sourceHash: sha256Schema,
    candidateHash: sha256Schema,
    treatmentVersion: z.literal(BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION),
    teaserPlanSeconds: z.literal(8),
    reelPlanSeconds: z.literal(12),
    hooks: z.array(z.string().min(1).max(300)).length(3),
    captionDirection: z.string().min(1).max(1200),
    status: z.literal("planning_only"),
  })
  .strict();

export const bodyCinemaLifecycleRecordSchema = z
  .object({
    id: lifecycleIdSchema,
    projectId: lifecycleIdSchema,
    creatorId: z.number().int().positive(),
    state: bodyCinemaLifecycleStateSchema,
    source: bodyCinemaPublicAssetSnapshotSchema,
    rights: bodyCinemaCreatorRightsSnapshotSchema,
    treatment: bodyCinemaCrownRevealTreatmentSchema.nullable(),
    treatmentHash: sha256Schema.nullable(),
    candidate: bodyCinemaPublicAssetSnapshotSchema.nullable(),
    candidateProvenance: bodyCinemaCandidateProvenanceSchema.nullable(),
    review: bodyCinemaReviewSchema.nullable(),
    decision: bodyCinemaDecisionSchema.nullable(),
    handoff: bodyCinemaHandoffSchema.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type BodyCinemaLifecycleRecord = z.infer<
  typeof bodyCinemaLifecycleRecordSchema
>;

export const bodyCinemaLifecycleListMineInputSchema = z
  .object({ limit: z.number().int().min(1).max(100).default(30) })
  .default({ limit: 30 });
export const bodyCinemaLifecycleGetMineInputSchema = z.object({
  id: lifecycleIdSchema,
});
export const bodyCinemaLifecycleQualifyInputSchema = z.object({
  sourceAssetId: mediaAssetIdSchema,
  rights: bodyCinemaCreatorRightsInputSchema,
});
export const bodyCinemaLifecycleFreezeInputSchema = z.object({
  id: lifecycleIdSchema,
  treatment: bodyCinemaCrownRevealTreatmentSchema,
});
export const bodyCinemaLifecycleReserveInputSchema = z.object({
  id: lifecycleIdSchema,
});
export const bodyCinemaLifecycleAttachInputSchema = z.object({
  id: lifecycleIdSchema,
  candidateAssetId: mediaAssetIdSchema,
  provenanceReference: z.string().trim().min(8).max(512),
  expectedSha256: sha256Schema,
});
export const bodyCinemaLifecycleBeginReviewInputSchema = z.object({
  id: lifecycleIdSchema,
});
export const bodyCinemaLifecycleDecideInputSchema = z.object({
  id: lifecycleIdSchema,
  reviewId: lifecycleIdSchema,
  candidateSha256: sha256Schema,
  decision: z.enum(["accept", "reject"]),
  reason: z.string().trim().min(12).max(3000),
  watchedEntireCandidate: z.literal(true),
});
export const bodyCinemaLifecycleHandoffInputSchema = z.object({
  id: lifecycleIdSchema,
});
export const bodyCinemaLifecycleGetHandoffInputSchema = z.object({
  handoffId: lifecycleIdSchema,
});

export type BodyCinemaLifecycleQualifyInput = z.infer<
  typeof bodyCinemaLifecycleQualifyInputSchema
>;
export type BodyCinemaLifecycleFreezeInput = z.infer<
  typeof bodyCinemaLifecycleFreezeInputSchema
>;
export type BodyCinemaLifecycleAttachInput = z.infer<
  typeof bodyCinemaLifecycleAttachInputSchema
>;
export type BodyCinemaLifecycleDecideInput = z.infer<
  typeof bodyCinemaLifecycleDecideInputSchema
>;
