import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addMemory,
  archiveMemory,
  getMemories,
  getPassport,
  searchMemory,
  upsertPassport,
} from "../services/clonePassportService";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const passportStatusSchema = z.enum(["draft", "active", "archived"]);
const memoryTypeSchema = z.enum([
  "fact",
  "preference",
  "event",
  "instruction",
  "interaction",
  "asset",
  "attribution",
  "system",
]);

export const clonePassportRouter = router({
  getPassport: protectedProcedure
    .input(z.object({ cloneKey: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getPassport(ctx.user.id, input?.cloneKey);
    }),

  upsertPassport: protectedProcedure
    .input(z.object({
      cloneKey: z.string().optional(),
      displayName: z.string().min(1).max(255).optional(),
      identityProfile: jsonRecordSchema.optional(),
      voiceProfile: jsonRecordSchema.nullable().optional(),
      visualProfile: jsonRecordSchema.nullable().optional(),
      behavioralProfile: jsonRecordSchema.nullable().optional(),
      operatingRules: jsonRecordSchema.nullable().optional(),
      sourceRefs: jsonRecordSchema.nullable().optional(),
      status: passportStatusSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertPassport({
        userId: ctx.user.id,
        cloneKey: input.cloneKey,
        displayName: input.displayName,
        identityProfile: input.identityProfile,
        voiceProfile: input.voiceProfile,
        visualProfile: input.visualProfile,
        behavioralProfile: input.behavioralProfile,
        operatingRules: input.operatingRules,
        sourceRefs: input.sourceRefs,
        status: input.status,
      });
    }),

  addMemory: protectedProcedure
    .input(z.object({
      passportId: z.number().int().positive().optional(),
      cloneKey: z.string().optional(),
      memoryType: memoryTypeSchema.default("fact"),
      source: z.string().max(120).nullable().optional(),
      sourceId: z.string().max(191).nullable().optional(),
      importance: z.number().min(0).max(100).optional(),
      confidence: z.number().min(0).max(1).optional(),
      content: z.string().min(1),
      metadata: jsonRecordSchema.nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return addMemory({
        userId: ctx.user.id,
        passportId: input.passportId,
        cloneKey: input.cloneKey,
        memoryType: input.memoryType,
        source: input.source,
        sourceId: input.sourceId,
        importance: input.importance,
        confidence: input.confidence,
        content: input.content,
        metadata: input.metadata,
      });
    }),

  getMemories: protectedProcedure
    .input(z.object({
      passportId: z.number().int().positive().optional(),
      cloneKey: z.string().optional(),
      memoryType: memoryTypeSchema.optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).max(10000).optional(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getMemories({
        userId: ctx.user.id,
        passportId: input?.passportId,
        cloneKey: input?.cloneKey,
        memoryType: input?.memoryType,
        limit: input?.limit,
        offset: input?.offset,
        includeArchived: input?.includeArchived,
      });
    }),

  searchMemory: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      passportId: z.number().int().positive().optional(),
      cloneKey: z.string().optional(),
      memoryType: memoryTypeSchema.optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).max(10000).optional(),
      includeArchived: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return searchMemory({
        userId: ctx.user.id,
        query: input.query,
        passportId: input.passportId,
        cloneKey: input.cloneKey,
        memoryType: input.memoryType,
        limit: input.limit,
        offset: input.offset,
        includeArchived: input.includeArchived,
      });
    }),

  archiveMemory: protectedProcedure
    .input(z.object({ memoryId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await archiveMemory(ctx.user.id, input.memoryId);
      return { archived: true };
    }),
});
