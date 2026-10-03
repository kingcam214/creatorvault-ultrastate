import { z } from "zod";
import { ownerProcedure, protectedProcedure, router } from "../_core/trpc";
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
    .mutation(({ ctx, input }) =>
      approveVideoChain({ id: ctx.user.id, role: ctx.user.role }, input)
    ),
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
      reconcilePersonaContinuityReceipt(
        { id: ctx.user.id, role: ctx.user.role },
        input
      )
    ),
});
