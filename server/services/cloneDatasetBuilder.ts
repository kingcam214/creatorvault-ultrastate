/**
 * CLONE DATASET BUILDER
 * Assembles approved frames + captions into a structured training dataset.
 * Creates: image directory, captions file (kohya_ss format), manifest JSON, preview grid, zip package.
 */
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { getDb } from "../db";
import { CLONE_LAB_BASE, ensureDir } from "./cloneTrainingLab";

export interface DatasetManifest {
  datasetId: number;
  name: string;
  triggerWord: string;
  baseModel: string;
  totalImages: number;
  approvedImages: number;
  rejectedImages: number;
  qualityBreakdown: {
    excellent: number;
    good: number;
    usable: number;
    reject: number;
  };
  captionsGenerated: number;
  createdAt: string;
  datasetPath: string;
  captionsPath: string;
  packagePath: string;
}

export async function buildDataset(
  datasetId: number
): Promise<DatasetManifest> {
  const db = await getDb();

  // Load dataset record
  const [datasets] = await db.execute<any[]>(
    `SELECT * FROM clone_training_datasets WHERE id=?`,
    [datasetId]
  );
  const dataset = (datasets as any[])[0];
  if (!dataset) throw new Error(`Dataset ${datasetId} not found`);

  await db.execute(
    `UPDATE clone_training_datasets SET status='building' WHERE id=?`,
    [datasetId]
  );

  // Create dataset directory structure
  const datasetDir = ensureDir(path.join(CLONE_LAB_BASE, "datasets", `dataset_${datasetId}`));
  const imagesDir = ensureDir(path.join(datasetDir, "images"));
  const captionsPath = path.join(datasetDir, "captions.txt");
  const manifestPath = path.join(datasetDir, "manifest.json");
  const packagePath = path.join(CLONE_LAB_BASE, "packages", `dataset_${datasetId}.zip`);

  // Load approved items
  const [items] = await db.execute<any[]>(
    `SELECT ctdi.*, ctf.quality_tier, ctf.quality_score
     FROM clone_training_dataset_items ctdi
     LEFT JOIN clone_training_frames ctf ON ctdi.frame_id = ctf.id
     WHERE ctdi.dataset_id=? AND ctdi.included=1
     ORDER BY ctf.quality_score DESC`,
    [datasetId]
  );
  const itemList = items as any[];

  if (itemList.length === 0) {
    throw new Error("No approved items in dataset — cannot build");
  }

  // Copy images to dataset directory with sequential naming
  const captionLines: string[] = [];
  const qualityBreakdown = { excellent: 0, good: 0, usable: 0, reject: 0 };
  let captionsGenerated = 0;
  let copied = 0;

  for (let i = 0; i < itemList.length; i++) {
    const item = itemList[i];
    const srcPath = item.image_path;

    if (!fs.existsSync(srcPath)) {
      console.warn(`[DatasetBuilder] Missing file: ${srcPath}`);
      continue;
    }

    const ext = path.extname(srcPath) || ".jpg";
    const destFilename = `${String(i + 1).padStart(5, "0")}_kingcam${ext}`;
    const destPath = path.join(imagesDir, destFilename);

    try {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    } catch (e) {
      console.warn(`[DatasetBuilder] Copy failed for ${srcPath}:`, e);
      continue;
    }

    // Track quality
    const tier = item.quality_tier || "usable";
    if (tier in qualityBreakdown) qualityBreakdown[tier as keyof typeof qualityBreakdown]++;

    // Build caption line
    const caption = item.caption || `fluxdevCam, KingCam, Black male founder, luxury boss aesthetic, confident posture, high quality training image.`;
    const baseName = path.basename(destFilename, ext);
    captionLines.push(`${baseName}\t${caption}`);
    if (item.caption) captionsGenerated++;
  }

  // Write captions file (kohya_ss format)
  fs.writeFileSync(captionsPath, captionLines.join("\n"), "utf8");

  // Build manifest
  const manifest: DatasetManifest = {
    datasetId,
    name: dataset.name,
    triggerWord: dataset.trigger_word || "fluxdevCam",
    baseModel: dataset.base_model || "flux-dev",
    totalImages: itemList.length,
    approvedImages: copied,
    rejectedImages: itemList.length - copied,
    qualityBreakdown,
    captionsGenerated,
    createdAt: new Date().toISOString(),
    datasetPath: imagesDir,
    captionsPath,
    packagePath,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // Generate preview grid (montage of first 9 images)
  const previewPath = path.join(datasetDir, "preview_grid.jpg");
  try {
    const previewImages = fs.readdirSync(imagesDir)
      .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .slice(0, 9)
      .map(f => `"${path.join(imagesDir, f)}"`)
      .join(" ");

    if (previewImages) {
      execSync(
        `ffmpeg -i "concat:${previewImages}" 2>/dev/null || true`,
        { timeout: 10000 }
      );
      // Use imagemagick montage if available
      try {
        execSync(
          `montage ${previewImages} -geometry 256x256+2+2 -tile 3x3 "${previewPath}" 2>/dev/null`,
          { timeout: 30000 }
        );
      } catch (_) {
        // Fallback: copy first image as preview
        const firstImg = fs.readdirSync(imagesDir).find(f => f.match(/\.(jpg|jpeg|png)$/i));
        if (firstImg) fs.copyFileSync(path.join(imagesDir, firstImg), previewPath);
      }
    }
  } catch (_) {}

  // Create zip package
  ensureDir(path.dirname(packagePath));
  try {
    execSync(
      `cd "${datasetDir}" && zip -r "${packagePath}" . 2>/dev/null`,
      { timeout: 120000 }
    );
  } catch (e) {
    console.error("[DatasetBuilder] Zip failed:", e);
  }

  // Update DB
  await db.execute(
    `UPDATE clone_training_datasets SET
      status='ready', total_images=?, approved_images=?, rejected_images=?,
      dataset_path=?, captions_path=?, manifest_path=?, preview_grid_path=?,
      updated_at=NOW()
     WHERE id=?`,
    [
      itemList.length,
      copied,
      itemList.length - copied,
      imagesDir,
      captionsPath,
      manifestPath,
      fs.existsSync(previewPath) ? previewPath : null,
      datasetId,
    ]
  );

  return manifest;
}

export async function addFramesToDataset(
  datasetId: number,
  minQualityTier: "excellent" | "good" | "usable" = "usable"
): Promise<{ added: number }> {
  const db = await getDb();
  const tierOrder = ["excellent", "good", "usable"];
  const minIdx = tierOrder.indexOf(minQualityTier);
  const allowedTiers = tierOrder.slice(0, minIdx + 1);
  const placeholders = allowedTiers.map(() => "?").join(",");

  const [frames] = await db.execute<any[]>(
    `SELECT * FROM clone_training_frames 
     WHERE approved_for_training=1 AND quality_tier IN (${placeholders})
     ORDER BY quality_score DESC`,
    allowedTiers
  );
  const frameList = frames as any[];

  let added = 0;
  for (const frame of frameList) {
    // Check if already in dataset
    const [existing] = await db.execute<any[]>(
      `SELECT id FROM clone_training_dataset_items WHERE dataset_id=? AND frame_id=? LIMIT 1`,
      [datasetId, frame.id]
    );
    if ((existing as any[]).length > 0) continue;

    await db.execute(
      `INSERT INTO clone_training_dataset_items (dataset_id, frame_id, upload_id, image_path, quality_score, included)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [datasetId, frame.id, frame.upload_id, frame.frame_path, frame.quality_score]
    );
    added++;
  }

  // Update dataset counts
  await db.execute(
    `UPDATE clone_training_datasets SET approved_images=approved_images+? WHERE id=?`,
    [added, datasetId]
  );

  return { added };
}
