/**
 * KINGCAM CLONE TRAINING LAB — Master Orchestration Service
 * Coordinates upload → frame extract → quality score → dataset → training → evaluation → promotion
 */
import path from "path";
import fs from "fs";
import { getDb } from "../db";

export const CLONE_LAB_BASE = process.env.CLONE_LAB_STORAGE || "/root/creatorvault/storage/clone-lab";

export function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getCloneLabPaths() {
  return {
    uploads: ensureDir(path.join(CLONE_LAB_BASE, "uploads")),
    frames: ensureDir(path.join(CLONE_LAB_BASE, "frames")),
    datasets: ensureDir(path.join(CLONE_LAB_BASE, "datasets")),
    models: ensureDir(path.join(CLONE_LAB_BASE, "models")),
    evaluations: ensureDir(path.join(CLONE_LAB_BASE, "evaluations")),
    logs: ensureDir(path.join(CLONE_LAB_BASE, "logs")),
    packages: ensureDir(path.join(CLONE_LAB_BASE, "packages")),
  };
}

export async function getLabStats() {
  const db = await getDb();
  const [uploads] = await db.execute<any[]>(
    `SELECT COUNT(*) as total, 
     SUM(CASE WHEN processing_status='done' THEN 1 ELSE 0 END) as done,
     SUM(CASE WHEN processing_status='rejected' THEN 1 ELSE 0 END) as rejected
     FROM clone_training_uploads`
  );
  const [frames] = await db.execute<any[]>(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN approved_for_training=1 THEN 1 ELSE 0 END) as approved
     FROM clone_training_frames`
  );
  const [datasets] = await db.execute<any[]>(
    `SELECT COUNT(*) as total FROM clone_training_datasets`
  );
  const [models] = await db.execute<any[]>(
    `SELECT COUNT(*) as total,
     MAX(CASE WHEN promoted_to_production=1 THEN version ELSE NULL END) as active_version
     FROM clone_model_versions`
  );
  const [jobs] = await db.execute<any[]>(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running
     FROM clone_lab_training_jobs`
  );

  return {
    uploads: (uploads as any[])[0],
    frames: (frames as any[])[0],
    datasets: (datasets as any[])[0],
    models: (models as any[])[0],
    jobs: (jobs as any[])[0],
  };
}
