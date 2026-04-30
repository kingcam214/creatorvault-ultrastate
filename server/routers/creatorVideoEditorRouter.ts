/**
 * creatorVideoEditorRouter — Production Video Editor Router
 * Real DB queries for asset persistence and render history.
 * AI text generation via OpenAI for scripts, transitions, captions.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Raw query helper (same pattern as messageRouter)
async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    const [rows] = await conn.query(query, params);
    return rows as any[];
  }
  const result = await (db as any).execute(sql.raw(query));
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    const [result] = await conn.query(query, params);
    return result;
  }
  return (db as any).execute(sql.raw(query));
}

export const creatorVideoEditorRouter = router({

  // ─── Asset Management ────────────────────────────────────────────────────
  createAsset: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      assetType: z.enum(["video", "image", "audio", "thumbnail", "output"]),
      filename: z.string(),
      fileSizeBytes: z.number().optional(),
      durationSeconds: z.number().optional(),
      mimeType: z.string().optional(),
    // @ts-ignore
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await rawExec(
        `INSERT INTO editor_assets
         (id, user_id, file_url, asset_type, filename, file_size_bytes, duration_seconds, mime_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          ctx.user.id,
          input.fileUrl,
          input.assetType,
          input.filename,
          input.fileSizeBytes || 0,
          input.durationSeconds || null,
          input.mimeType || null,
          JSON.stringify(input.metadata || {}),
        ]
      );
      return { id, fileUrl: input.fileUrl, assetType: input.assetType, filename: input.filename };
    }),

  getAssets: protectedProcedure
    .input(z.object({
      assetType: z.enum(["video", "image", "audio", "thumbnail", "output", "all"]).default("all"),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const typeFilter = input.assetType === "all" ? "" : "AND asset_type = ?";
      const params: any[] = input.assetType === "all"
        ? [ctx.user.id, input.limit]
        : [ctx.user.id, input.assetType, input.limit];
      const rows = await rawQuery(
        `SELECT * FROM editor_assets WHERE user_id = ? ${typeFilter} ORDER BY created_at DESC LIMIT ?`,
        params
      );
      return rows;
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        "DELETE FROM editor_assets WHERE id = ? AND user_id = ?",
        [input.assetId, ctx.user.id]
      );
      return { deleted: true };
    }),

  // ─── Render History ──────────────────────────────────────────────────────
  getRenders: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        `SELECT * FROM editor_renders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [ctx.user.id, input.limit]
      );
      return rows;
    }),

  saveRender: protectedProcedure
    .input(z.object({
      outputUrl: z.string().url(),
      sourceAssetIds: z.array(z.string()).optional(),
      operationsApplied: z.array(z.string()).optional(),
      durationSeconds: z.number().optional(),
      fileSizeBytes: z.number().optional(),
      renderLabel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await rawExec(
        `INSERT INTO editor_renders
         (id, user_id, output_url, source_asset_ids, operations_applied, duration_seconds, file_size_bytes, render_label, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          ctx.user.id,
          input.outputUrl,
          JSON.stringify(input.sourceAssetIds || []),
          JSON.stringify(input.operationsApplied || []),
          input.durationSeconds || null,
          input.fileSizeBytes || null,
          input.renderLabel || null,
        ]
      );
      return { id, outputUrl: input.outputUrl };
    }),

  // ─── AI Script Generation ────────────────────────────────────────────────
  generateEditingScript: protectedProcedure
    .input(z.object({
      videoDescription: z.string(),
      targetLength: z.number(),
      style: z.enum(["fast_paced", "cinematic", "educational", "vlog", "documentary"]),
      platform: z.string(),
    }))
    .mutation(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Create a video editing script/shot list:
Video: ${input.videoDescription}
Target Length: ${input.targetLength} seconds
Style: ${input.style}
Platform: ${input.platform}
Provide: 1) Opening hook (0-3s), 2) Scene breakdown with timestamps, 3) B-roll suggestions, 4) Music mood, 5) Text overlay suggestions, 6) Closing CTA.`,
        }],
        max_tokens: 600,
      });
      return { script: completion.choices[0].message.content };
    }),

  suggestTransitions: protectedProcedure
    .input(z.object({
      scenes: z.array(z.string()),
      style: z.string(),
    }))
    .mutation(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Suggest transitions between these scenes for a ${input.style} video:
${input.scenes.map((s, i) => `Scene ${i + 1}: ${s}`).join("\n")}
For each transition, suggest: type (cut, dissolve, wipe, etc.), timing, and any visual effects.`,
        }],
        max_tokens: 400,
      });
      return { transitions: completion.choices[0].message.content };
    }),

  generateCaptions: protectedProcedure
    .input(z.object({
      transcript: z.string(),
      style: z.enum(["standard", "bold", "minimal", "animated"]),
      platform: z.string(),
    }))
    .mutation(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Format these captions for ${input.platform} in ${input.style} style:
${input.transcript}
Break into short, readable segments. Highlight key words. Format for maximum readability on mobile.`,
        }],
        max_tokens: 500,
      });
      return { captions: completion.choices[0].message.content };
    }),
});
