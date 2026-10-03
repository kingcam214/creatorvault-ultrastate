import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  approveVideoChainSchema,
  createPersonaSchema,
  startVideoChainSchema,
  updatePersonaSchema,
} from "../services/personaVaultContracts";
import {
  createPersona,
  getPersona,
  getVideoChainStatus,
  startVideoChain,
  updatePersona,
} from "../services/personaVaultService";
import {
  approveVideoChain,
  retryVideoChain,
} from "../services/videoChainedContinuity";
import { reconcilePersonaContinuityReceipt } from "../services/personaVideoProvider";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (![6, 33].includes(ctx.user.id))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner authorization is required for paid chain operations",
    });
  return next({ ctx });
});
export const personaVaultRouter = router({
  createPersona: protectedProcedure
    .input(createPersonaSchema)
    .mutation(({ ctx, input }) => createPersona(ctx.user.id, input)),
  getPersona: protectedProcedure
    .input(z.strictObject({ personaId: z.string().uuid() }))
    .query(({ ctx, input }) => getPersona(ctx.user.id, input.personaId)),
  updatePersona: protectedProcedure
    .input(updatePersonaSchema)
    .mutation(({ ctx, input }) => updatePersona(ctx.user.id, input)),
  startVideoChain: protectedProcedure
    .input(startVideoChainSchema)
    .mutation(({ ctx, input }) => startVideoChain(ctx.user.id, input)),
  getVideoChainStatus: protectedProcedure
    .input(z.strictObject({ chainId: z.string().uuid() }))
    .query(({ ctx, input }) => getVideoChainStatus(ctx.user.id, input.chainId)),
  approveVideoChain: ownerProcedure
    .input(approveVideoChainSchema)
    .mutation(({ ctx, input }) => approveVideoChain(ctx.user.id, input)),
  retryVideoChain: protectedProcedure
    .input(
      z.strictObject({
        chainId: z.string().uuid(),
        expectedFailedSegmentId: z.string().uuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      retryVideoChain(ctx.user.id, input.chainId, input.expectedFailedSegmentId)
    ),
  reconcileVideoChainSegment: ownerProcedure
    .input(
      z.strictObject({
        creatorId: z.number().int().positive(),
        chainId: z.string().uuid(),
        segmentId: z.string().uuid(),
        providerTaskId: z
          .string()
          .min(1)
          .max(191)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
    )
    .mutation(({ ctx, input }) =>
      reconcilePersonaContinuityReceipt(ctx.user.id, input)
    ),
});
