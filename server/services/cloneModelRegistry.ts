/**
 * CLONE MODEL REGISTRY
 * Manages all KingCam clone model versions.
 * Tracks: training status, evaluation scores, production promotion.
 * Only one model can be "promoted to production" at a time.
 */
import { getDb } from "../db";

export async function getAllModelVersions(): Promise<any[]> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT mv.*, 
      COUNT(e.id) as evaluation_count,
      AVG(e.identity_score) as avg_identity,
      AVG(e.realism_score) as avg_realism,
      AVG(e.consistency_score) as avg_consistency
     FROM clone_model_versions mv
     LEFT JOIN clone_model_evaluations e ON e.model_version_id = mv.id
     GROUP BY mv.id
     ORDER BY mv.created_at DESC`
  );
  return rows as any[];
}

export async function getProductionModel(): Promise<any | null> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT * FROM clone_model_versions WHERE promoted_to_production=1 ORDER BY updated_at DESC LIMIT 1`
  );
  return (rows as any[])[0] || null;
}

export async function promoteToProduction(modelVersionId: number): Promise<void> {
  const db = await getDb();

  // Verify model exists and is trained/evaluated
  const [models] = await db.execute<any[]>(
    `SELECT * FROM clone_model_versions WHERE id=?`,
    [modelVersionId]
  );
  const model = (models as any[])[0];
  if (!model) throw new Error(`Model version ${modelVersionId} not found`);

  if (!["trained", "evaluated"].includes(model.status)) {
    throw new Error(`Model version ${modelVersionId} is not ready for promotion (status: ${model.status})`);
  }

  // Demote all current production models
  await db.execute(
    `UPDATE clone_model_versions SET promoted_to_production=0 WHERE promoted_to_production=1`
  );

  // Promote this version
  await db.execute(
    `UPDATE clone_model_versions SET 
     promoted_to_production=1, status='promoted', updated_at=NOW()
     WHERE id=?`,
    [modelVersionId]
  );

  // Sync to kingcam_clone_models table for backward compat
  await db.execute(
    `UPDATE kingcam_clone_models SET is_default=0 WHERE is_default=1`
  ).catch(() => {});

  if (model.model_artifact_url || model.replicate_version) {
    await db.execute(
      `INSERT INTO kingcam_clone_models 
       (model_name, replicate_model_id, replicate_version, trigger_word, description, is_active, is_default, created_at)
       VALUES (?, 'kingcam214/fluxdevcam', ?, ?, ?, 1, 1, NOW())
       ON DUPLICATE KEY UPDATE is_default=1, replicate_version=VALUES(replicate_version)`,
      [
        model.model_name,
        model.replicate_version || model.version,
        model.trigger_word || "fluxdevCam",
        `KingCam Clone ${model.version} — promoted ${new Date().toISOString()}`,
      ]
    ).catch(() => {});
  }
}

export async function archiveModelVersion(modelVersionId: number): Promise<void> {
  const db = await getDb();
  const [models] = await db.execute<any[]>(
    `SELECT * FROM clone_model_versions WHERE id=?`,
    [modelVersionId]
  );
  const model = (models as any[])[0];
  if (!model) throw new Error(`Model version ${modelVersionId} not found`);
  if (model.promoted_to_production) throw new Error("Cannot archive the active production model");

  await db.execute(
    `UPDATE clone_model_versions SET status='archived', updated_at=NOW() WHERE id=?`,
    [modelVersionId]
  );
}

export async function importExternalModel(
  modelName: string,
  replicateVersion: string,
  triggerWord: string,
  notes?: string
): Promise<number> {
  const db = await getDb();
  const [result] = await db.execute<any>(
    `INSERT INTO clone_model_versions 
     (model_name, version, base_model, trigger_word, status, notes, created_at)
     VALUES (?, ?, 'flux-dev', ?, 'trained', ?, NOW())`,
    [modelName, replicateVersion, triggerWord, notes || "Imported from external source"]
  );
  return (result as any).insertId;
}

export async function addEvaluation(
  modelVersionId: number,
  prompt: string,
  outputUrl: string,
  scores: { identity: number; realism: number; consistency: number },
  userRating?: number,
  notes?: string
): Promise<number> {
  const db = await getDb();

  const [result] = await db.execute<any>(
    `INSERT INTO clone_model_evaluations 
     (model_version_id, prompt, output_url, identity_score, realism_score, consistency_score, user_rating, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      modelVersionId,
      prompt,
      outputUrl,
      scores.identity,
      scores.realism,
      scores.consistency,
      userRating || null,
      notes || null,
    ]
  );

  const evalId = (result as any).insertId;

  // Update aggregate scores on model version
  await db.execute(
    `UPDATE clone_model_versions SET
     identity_score = (SELECT AVG(identity_score) FROM clone_model_evaluations WHERE model_version_id=?),
     realism_score = (SELECT AVG(realism_score) FROM clone_model_evaluations WHERE model_version_id=?),
     consistency_score = (SELECT AVG(consistency_score) FROM clone_model_evaluations WHERE model_version_id=?),
     status = CASE WHEN status = 'trained' THEN 'evaluated' ELSE status END,
     updated_at = NOW()
     WHERE id=?`,
    [modelVersionId, modelVersionId, modelVersionId, modelVersionId]
  );

  return evalId;
}

export async function getModelEvaluations(modelVersionId: number): Promise<any[]> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT * FROM clone_model_evaluations WHERE model_version_id=? ORDER BY created_at DESC`,
    [modelVersionId]
  );
  return rows as any[];
}
