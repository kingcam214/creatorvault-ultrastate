import { TRPCError } from "@trpc/server";
import {bodyCinemaHdGetSchema,bodyCinemaHdPrepareSchema,bodyCinemaHdExecuteSchema} from "../../shared/bodyCinemaHd";
import {
  bodyDirectedAnalyzeInputSchema,
  bodyDirectedFreezeInputSchema,
  bodyDirectedQualifyInputSchema,
  bodyDirectedRecommendInputSchema,
  bodyCinemaLifecycleAttachInputSchema,
  bodyCinemaLifecycleBeginReviewInputSchema,
  bodyCinemaLifecycleDecideInputSchema,
  bodyCinemaLifecycleFreezeInputSchema,
  bodyCinemaLifecycleGetHandoffInputSchema,
  bodyCinemaLifecycleGetMineInputSchema,
  bodyCinemaLifecycleHandoffInputSchema,
  bodyCinemaLifecycleListMineInputSchema,
  bodyCinemaLifecycleQualifyInputSchema,
  bodyCinemaLifecycleReserveInputSchema,
} from "../../shared/bodyCinemaCandidateLifecycle";
import { protectedProcedure, router } from "../_core/trpc";
import {
  BodyCinemaLifecycleError,
  getBodyCinemaCandidateLifecycleService,
} from "../services/bodyCinemaCandidateLifecycle";
import {
  BODY_FOCUS_LIBRARY, BODY_FOCUS_TREATMENTS, BODY_VISUAL_IDENTITIES,
} from "../../shared/bodyCinemaBodyDirection";

function lifecycleError(error: unknown): TRPCError {
  if (error instanceof BodyCinemaLifecycleError) {
    if (error.code === "not_found") {
      return new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (error.code === "forbidden") {
      return new TRPCError({ code: "FORBIDDEN", message: error.message });
    }
    if (error.code === "conflict") {
      return new TRPCError({ code: "CONFLICT", message: error.message });
    }
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: error.message,
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      "CreatorVault could not complete this Body Cinema lifecycle action.",
  });
}

export const bodyCinemaCandidateLifecycleRouter = router({
  getHdRender: protectedProcedure
    .input(bodyCinemaHdGetSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).getHdRender(Number(ctx.user.id), input.id);
      } catch (error) {
        throw lifecycleError(error);
      }
    }),
  prepareHdRender: protectedProcedure
    .input(bodyCinemaHdPrepareSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).prepareHdRender({ creatorId: Number(ctx.user.id), ...input });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),
  executeHdRender: protectedProcedure
    .input(bodyCinemaHdExecuteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).executeHdRender({ creatorId: Number(ctx.user.id), ...input });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  bodyDirectionLibrary: protectedProcedure.query(() => ({
    focuses: BODY_FOCUS_LIBRARY,
    treatments: BODY_FOCUS_TREATMENTS,
    visualIdentities: BODY_VISUAL_IDENTITIES,
  })),

  listBodyDirected: protectedProcedure.input(bodyCinemaLifecycleListMineInputSchema)
    .query(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).listBodyDirected(Number(ctx.user.id), input.limit); }
      catch (error) { throw lifecycleError(error); }
    }),

  getBodyDirected: protectedProcedure.input(bodyCinemaLifecycleGetMineInputSchema)
    .query(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).getBodyDirected(Number(ctx.user.id), input.id); }
      catch (error) { throw lifecycleError(error); }
    }),

  qualifyBodyDirected: protectedProcedure.input(bodyDirectedQualifyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).qualifyBodyDirected({creatorId:Number(ctx.user.id), ...input}); }
      catch (error) { throw lifecycleError(error); }
    }),

  analyzeBodyDirected: protectedProcedure.input(bodyDirectedAnalyzeInputSchema)
    .mutation(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).analyzeBodyDirected({creatorId:Number(ctx.user.id), ...input}); }
      catch (error) { throw lifecycleError(error); }
    }),

  recommendBodyDirected: protectedProcedure.input(bodyDirectedRecommendInputSchema)
    .query(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).recommendBodyDirected({creatorId:Number(ctx.user.id), ...input}); }
      catch (error) { throw lifecycleError(error); }
    }),

  freezeBodyDirected: protectedProcedure.input(bodyDirectedFreezeInputSchema)
    .mutation(async ({ ctx, input }) => {
      try { return await (await getBodyCinemaCandidateLifecycleService()).freezeBodyDirected({creatorId:Number(ctx.user.id), ...input}); }
      catch (error) { throw lifecycleError(error); }
    }),

  listMine: protectedProcedure
    .input(bodyCinemaLifecycleListMineInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).listMine(Number(ctx.user.id), input.limit);
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  getMine: protectedProcedure
    .input(bodyCinemaLifecycleGetMineInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const record = await (
          await getBodyCinemaCandidateLifecycleService()
        ).getMine(Number(ctx.user.id), input.id);
        if (!record) {
          throw new BodyCinemaLifecycleError(
            "not_found",
            "This Body Cinema lifecycle is unavailable."
          );
        }
        return record;
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  getHandoff: protectedProcedure
    .input(bodyCinemaLifecycleGetHandoffInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).getHandoff({
          creatorId: Number(ctx.user.id),
          handoffId: input.handoffId,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  getPlaybackAccess: protectedProcedure
    .input(bodyCinemaLifecycleGetMineInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = await getBodyCinemaCandidateLifecycleService();
        const creatorId = Number(ctx.user.id);
        const record = await service.getMine(creatorId, input.id);
        if (!record)
          throw new BodyCinemaLifecycleError(
            "not_found",
            "This Body Cinema lifecycle is unavailable."
          );
        const source = await service.openPlayback({
          creatorId,
          id: input.id,
          artifact: "source",
        });
        await source.handle.close();
        const sourceUrl = `/api/body-cinema/lifecycle/${encodeURIComponent(input.id)}/source`;
        let candidateUrl: string | null = null;
        let downloadUrl: string | null = null;
        let unavailableReason: string | null = null;
        if (record.candidate) {
          try {
            const candidate = await service.openPlayback({
              creatorId,
              id: input.id,
              artifact: "candidate",
            });
            await candidate.handle.close();
            candidateUrl = `/api/body-cinema/lifecycle/${encodeURIComponent(input.id)}/candidate`;
            if (record.state === "accepted" || record.state === "handoff_ready")
              downloadUrl = `${candidateUrl}?download=1`;
          } catch (error) {
            if (!(error instanceof BodyCinemaLifecycleError)) throw error;
            unavailableReason =
              "The attached candidate is not currently accessible with its verified byte identity. Review, decision and download remain blocked.";
          }
        }
        return { sourceUrl, candidateUrl, downloadUrl, unavailableReason };
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  qualify: protectedProcedure
    .input(bodyCinemaLifecycleQualifyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).qualify({
          creatorId: Number(ctx.user.id),
          sourceAssetId: input.sourceAssetId,
          rights: input.rights,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  freeze: protectedProcedure
    .input(bodyCinemaLifecycleFreezeInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).freeze({
          creatorId: Number(ctx.user.id),
          id: input.id,
          treatment: input.treatment,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  reserve: protectedProcedure
    .input(bodyCinemaLifecycleReserveInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).reserve({
          creatorId: Number(ctx.user.id),
          id: input.id,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  attach: protectedProcedure
    .input(bodyCinemaLifecycleAttachInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).attach({
          creatorId: Number(ctx.user.id),
          id: input.id,
          candidateAssetId: input.candidateAssetId,
          provenanceReference: input.provenanceReference,
          expectedSha256: input.expectedSha256,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  beginReview: protectedProcedure
    .input(bodyCinemaLifecycleBeginReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).beginReview({
          creatorId: Number(ctx.user.id),
          id: input.id,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  decide: protectedProcedure
    .input(bodyCinemaLifecycleDecideInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).decide({
          creatorId: Number(ctx.user.id),
          id: input.id,
          reviewId: input.reviewId,
          candidateSha256: input.candidateSha256,
          decision: input.decision,
          reason: input.reason,
          watchedEntireCandidate: input.watchedEntireCandidate,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),

  handoff: protectedProcedure
    .input(bodyCinemaLifecycleHandoffInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await (
          await getBodyCinemaCandidateLifecycleService()
        ).handoff({
          creatorId: Number(ctx.user.id),
          id: input.id,
        });
      } catch (error) {
        throw lifecycleError(error);
      }
    }),
});
