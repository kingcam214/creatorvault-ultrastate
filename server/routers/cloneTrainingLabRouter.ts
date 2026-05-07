/**
 * CLONE TRAINING LAB ROUTER
 * All tRPC procedures for the KingCam Clone Training Lab.
 * Covers: upload, frame extraction, quality scoring, dataset building,
 *         training jobs, model registry, evaluation arena, production promotion.
 */
import { z } from "zod";
import path from "path";
import fs from "fs";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { getLabStats, getCloneLabPaths, CLONE_LAB_BASE, ensureDir } from "../services/cloneTrainingLab";
import { extractFramesFromVideo } from "../services/cloneFrameExtractor";
import { scoreAsset, scoreAndUpdateFrame } from "../services/cloneAssetQualityScorer";
import { generateCaption, generateCaptionsForDataset } from "../services/cloneCaptionGenerator";
import { buildDataset, addFramesToDataset } from "../services/cloneDatasetBuilder";
import { detectGpu, startTrainingJob, getJobStatus } from "../services/cloneTrainingRunner";
import {
  getAllModelVersions,
  getProductionModel,
  promoteToProduction,
  archiveModelVersion,
  importExternalModel,
  addEvaluation,
  getModelEvaluations,
} from "../services/cloneModelRegistry";

// ─── KING-ONLY GUARD ─────────────────────────────────────────────────────────
const kingProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new Error("UNAUTHORIZED: Clone Training Lab is King-only");
  }
  return next();
});

export const cloneTrainingLabRouter = router({

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  getDashboardStats: kingProcedure.query(async () => {
    const stats = await getLabStats();
    const gpuInfo = detectGpu();
    const productionModel = await getProductionModel();
    return { stats, gpuInfo, productionModel };
  }),

  // ─── UPLOADS ───────────────────────────────────────────────────────────────
  registerUpload: kingProcedure
    .input(z.object({
      sourceType: z.enum(["image", "video"]),
      originalFilename: z.string(),
      storagePath: z.string(),
      storageUrl: z.string().optional(),
      mimeType: z.string(),
      fileSize: z.number().default(0),
      width: z.number().default(0),
      height: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.execute<any>(
        `INSERT INTO clone_training_uploads 
         (user_id, source_type, original_filename, storage_path, storage_url, mime_type, file_size, width, height, processing_status, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          ctx.user.id,
          input.sourceType,
          input.originalFilename,
          input.storagePath,
          input.storageUrl || null,
          input.mimeType,
          input.fileSize,
          input.width,
          input.height,
        ]
      );
      return { uploadId: (result as any).insertId };
    }),

  processUpload: kingProcedure
    .input(z.object({
      uploadId: z.number(),
      intervalSeconds: z.number().default(2),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [uploads] = await db.execute<any[]>(
        `SELECT * FROM clone_training_uploads WHERE id=?`,
        [input.uploadId]
      );
      const upload = (uploads as any[])[0];
      if (!upload) throw new Error(`Upload ${input.uploadId} not found`);

      await db.execute(
        `UPDATE clone_training_uploads SET processing_status='processing' WHERE id=?`,
        [input.uploadId]
      );

      let framesExtracted = 0;
      let frameDir = "";

      if (upload.source_type === "video") {
        const result = await extractFramesFromVideo(
          input.uploadId,
          upload.storage_path,
          input.intervalSeconds
        );
        framesExtracted = result.framesExtracted;
        frameDir = result.frameDir;
      } else {
        // For images, create a single frame record
        const paths = getCloneLabPaths();
        const destDir = ensureDir(path.join(paths.frames, `upload_${input.uploadId}`));
        const ext = path.extname(upload.original_filename) || ".jpg";
        const destPath = path.join(destDir, `frame_00001${ext}`);

        if (fs.existsSync(upload.storage_path)) {
          fs.copyFileSync(upload.storage_path, destPath);
        }

        const crypto = await import("crypto");
        let duplicateHash = "";
        try {
          const buf = fs.readFileSync(destPath);
          duplicateHash = crypto.createHash("md5").update(buf).digest("hex");
        } catch (_) {}

        await db.execute(
          `INSERT INTO clone_training_frames 
           (upload_id, frame_path, timestamp_seconds, duplicate_hash, approved_for_training, created_at)
           VALUES (?, ?, 0, ?, 1, NOW())`,
          [input.uploadId, destPath, duplicateHash]
        );
        framesExtracted = 1;
        frameDir = destDir;

        await db.execute(
          `UPDATE clone_training_uploads SET processing_status='done' WHERE id=?`,
          [input.uploadId]
        );
      }

      return { uploadId: input.uploadId, framesExtracted, frameDir };
    }),

  getUploads: kingProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT u.*, COUNT(f.id) as frame_count,
        SUM(CASE WHEN f.approved_for_training=1 THEN 1 ELSE 0 END) as approved_frames
       FROM clone_training_uploads u
       LEFT JOIN clone_training_frames f ON f.upload_id = u.id
       WHERE u.user_id=?
       GROUP BY u.id
       ORDER BY u.uploaded_at DESC`,
      [ctx.user.id]
    );
    return rows as any[];
  }),

  // ─── FRAMES ────────────────────────────────────────────────────────────────
  getFrames: kingProcedure
    .input(z.object({
      uploadId: z.number().optional(),
      qualityTier: z.enum(["excellent", "good", "usable", "reject", "all"]).default("all"),
      approvedOnly: z.boolean().default(false),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let where = "WHERE 1=1";
      const params: any[] = [];

      if (input.uploadId) {
        where += " AND f.upload_id=?";
        params.push(input.uploadId);
      }
      if (input.qualityTier !== "all") {
        where += " AND f.quality_tier=?";
        params.push(input.qualityTier);
      }
      if (input.approvedOnly) {
        where += " AND f.approved_for_training=1";
      }

      const [rows] = await db.execute<any[]>(
        `SELECT f.*, u.original_filename, u.source_type
         FROM clone_training_frames f
         LEFT JOIN clone_training_uploads u ON u.id = f.upload_id
         ${where}
         ORDER BY f.quality_score DESC
         LIMIT ? OFFSET ?`,
        [...params, input.limit, input.offset]
      );
      return rows as any[];
    }),

  scoreFrame: kingProcedure
    .input(z.object({ frameId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [frames] = await db.execute<any[]>(
        `SELECT * FROM clone_training_frames WHERE id=?`,
        [input.frameId]
      );
      const frame = (frames as any[])[0];
      if (!frame) throw new Error(`Frame ${input.frameId} not found`);
      return scoreAndUpdateFrame(input.frameId, frame.frame_path);
    }),

  scoreAllFrames: kingProcedure
    .input(z.object({ uploadId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      let where = "WHERE quality_score=0 OR quality_score IS NULL";
      const params: any[] = [];
      if (input.uploadId) {
        where += " AND upload_id=?";
        params.push(input.uploadId);
      }
      const [frames] = await db.execute<any[]>(
        `SELECT id, frame_path FROM clone_training_frames ${where} LIMIT 500`,
        params
      );
      const frameList = frames as any[];
      let scored = 0;
      for (const frame of frameList) {
        try {
          await scoreAndUpdateFrame(frame.id, frame.frame_path);
          scored++;
        } catch (_) {}
      }
      return { scored, total: frameList.length };
    }),

  approveFrame: kingProcedure
    .input(z.object({ frameId: z.number(), approved: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.execute(
        `UPDATE clone_training_frames SET approved_for_training=? WHERE id=?`,
        [input.approved ? 1 : 0, input.frameId]
      );
      return { frameId: input.frameId, approved: input.approved };
    }),

  // ─── DATASETS ──────────────────────────────────────────────────────────────
  createDataset: kingProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      triggerWord: z.string().default("fluxdevCam"),
      baseModel: z.string().default("flux-dev"),
      minQualityTier: z.enum(["excellent", "good", "usable"]).default("usable"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.execute<any>(
        `INSERT INTO clone_training_datasets 
         (name, description, trigger_word, base_model, status, created_by, created_at)
         VALUES (?, ?, ?, ?, 'building', ?, NOW())`,
        [input.name, input.description || null, input.triggerWord, input.baseModel, ctx.user.id]
      );
      const datasetId = (result as any).insertId;

      // Auto-add approved frames
      const { added } = await addFramesToDataset(datasetId, input.minQualityTier);

      return { datasetId, framesAdded: added };
    }),

  buildDataset: kingProcedure
    .input(z.object({ datasetId: z.number() }))
    .mutation(async ({ input }) => {
      return buildDataset(input.datasetId);
    }),

  getDatasets: kingProcedure.query(async () => {
    const db = await getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT d.*, COUNT(i.id) as item_count
       FROM clone_training_datasets d
       LEFT JOIN clone_training_dataset_items i ON i.dataset_id = d.id AND i.included=1
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    );
    return rows as any[];
  }),

  generateCaptions: kingProcedure
    .input(z.object({ datasetId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [items] = await db.execute<any[]>(
        `SELECT id, image_path FROM clone_training_dataset_items 
         WHERE dataset_id=? AND (caption IS NULL OR caption='') AND included=1 LIMIT 100`,
        [input.datasetId]
      );
      const itemList = (items as any[]).map(i => ({
        id: i.id,
        imagePath: i.image_path,
      }));
      return generateCaptionsForDataset(input.datasetId, itemList);
    }),

  // ─── TRAINING JOBS ─────────────────────────────────────────────────────────
  detectGpu: kingProcedure.query(() => {
    return detectGpu();
  }),

  startTraining: kingProcedure
    .input(z.object({
      datasetId: z.number(),
      modelName: z.string().default("fluxdevCam"),
      triggerWord: z.string().default("fluxdevCam"),
      steps: z.number().min(100).max(4000).default(1000),
      learningRate: z.number().default(0.0004),
    }))
    .mutation(async ({ input }) => {
      return startTrainingJob(
        input.datasetId,
        input.modelName,
        input.triggerWord,
        input.steps,
        input.learningRate
      );
    }),

  getJobStatus: kingProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      return getJobStatus(input.jobId);
    }),

  getTrainingJobs: kingProcedure.query(async () => {
    const db = await getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT j.*, mv.model_name, mv.version, d.name as dataset_name
       FROM clone_lab_training_jobs j
       LEFT JOIN clone_model_versions mv ON j.model_version_id = mv.id
       LEFT JOIN clone_training_datasets d ON j.dataset_id = d.id
       ORDER BY j.created_at DESC
       LIMIT 50`
    );
    return rows as any[];
  }),

  cancelJob: kingProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.execute(
        `UPDATE clone_lab_training_jobs SET status='cancelled', completed_at=NOW() WHERE id=? AND status IN ('queued','running')`,
        [input.jobId]
      );
      return { cancelled: true };
    }),

  // ─── MODEL REGISTRY ────────────────────────────────────────────────────────
  getModelVersions: kingProcedure.query(async () => {
    return getAllModelVersions();
  }),

  getProductionModel: kingProcedure.query(async () => {
    return getProductionModel();
  }),

  promoteToProduction: kingProcedure
    .input(z.object({ modelVersionId: z.number() }))
    .mutation(async ({ input }) => {
      await promoteToProduction(input.modelVersionId);
      return { promoted: true, modelVersionId: input.modelVersionId };
    }),

  archiveModel: kingProcedure
    .input(z.object({ modelVersionId: z.number() }))
    .mutation(async ({ input }) => {
      await archiveModelVersion(input.modelVersionId);
      return { archived: true };
    }),

  importExternalModel: kingProcedure
    .input(z.object({
      modelName: z.string(),
      replicateVersion: z.string(),
      triggerWord: z.string().default("fluxdevCam"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await importExternalModel(
        input.modelName,
        input.replicateVersion,
        input.triggerWord,
        input.notes
      );
      return { modelVersionId: id };
    }),

  // ─── EVALUATION ARENA ──────────────────────────────────────────────────────
  addEvaluation: kingProcedure
    .input(z.object({
      modelVersionId: z.number(),
      prompt: z.string(),
      outputUrl: z.string(),
      identityScore: z.number().min(0).max(10),
      realismScore: z.number().min(0).max(10),
      consistencyScore: z.number().min(0).max(10),
      userRating: z.number().min(1).max(5).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const evalId = await addEvaluation(
        input.modelVersionId,
        input.prompt,
        input.outputUrl,
        {
          identity: input.identityScore,
          realism: input.realismScore,
          consistency: input.consistencyScore,
        },
        input.userRating,
        input.notes
      );
      return { evalId };
    }),

  getEvaluations: kingProcedure
    .input(z.object({ modelVersionId: z.number() }))
    .query(async ({ input }) => {
      return getModelEvaluations(input.modelVersionId);
    }),

  compareModels: kingProcedure
    .input(z.object({ modelVersionIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const placeholders = input.modelVersionIds.map(() => "?").join(",");
      const [rows] = await db.execute<any[]>(
        `SELECT mv.*,
          COUNT(e.id) as eval_count,
          AVG(e.identity_score) as avg_identity,
          AVG(e.realism_score) as avg_realism,
          AVG(e.consistency_score) as avg_consistency,
          AVG(e.user_rating) as avg_user_rating
         FROM clone_model_versions mv
         LEFT JOIN clone_model_evaluations e ON e.model_version_id = mv.id
         WHERE mv.id IN (${placeholders})
         GROUP BY mv.id`,
        input.modelVersionIds
      );
      return rows as any[];
    }),
});
