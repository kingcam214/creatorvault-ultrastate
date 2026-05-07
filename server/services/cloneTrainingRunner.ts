/**
 * CLONE TRAINING RUNNER
 * GPU-aware training orchestrator.
 * 1. Detects local GPU (nvidia-smi)
 * 2. If GPU found → runs local kohya_ss / flux training command
 * 3. If no GPU → packages dataset for Replicate API training
 * 4. Tracks job status, logs, and artifacts in DB
 */
import { execSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { getDb } from "../db";
import { CLONE_LAB_BASE, ensureDir } from "./cloneTrainingLab";

export interface GpuInfo {
  detected: boolean;
  name?: string;
  vramMb?: number;
  driverVersion?: string;
  cudaVersion?: string;
}

export function detectGpu(): GpuInfo {
  try {
    const out = execSync("nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>/dev/null", {
      encoding: "utf8",
      timeout: 10000,
    });
    const parts = out.trim().split(",").map(s => s.trim());
    const vramStr = parts[1] || "0 MiB";
    const vramMb = parseInt(vramStr.replace(/[^0-9]/g, "")) || 0;

    // Get CUDA version
    let cudaVersion = "unknown";
    try {
      const nvccOut = execSync("nvcc --version 2>/dev/null | grep release", { encoding: "utf8", timeout: 5000 });
      const match = nvccOut.match(/release ([\d.]+)/);
      cudaVersion = match ? match[1] : "unknown";
    } catch (_) {}

    return {
      detected: true,
      name: parts[0] || "Unknown GPU",
      vramMb,
      driverVersion: parts[2] || "unknown",
      cudaVersion,
    };
  } catch (_) {
    return { detected: false };
  }
}

export async function startTrainingJob(
  datasetId: number,
  modelName: string,
  triggerWord: string = "fluxdevCam",
  steps: number = 1000,
  learningRate: number = 0.0004
): Promise<{ jobId: number; backend: string; gpuInfo: GpuInfo }> {
  const db = await getDb();
  const gpuInfo = detectGpu();

  // Load dataset
  const [datasets] = await db.execute<any[]>(
    `SELECT * FROM clone_training_datasets WHERE id=?`,
    [datasetId]
  );
  const dataset = (datasets as any[])[0];
  if (!dataset) throw new Error(`Dataset ${datasetId} not found`);
  if (dataset.status !== "ready") throw new Error(`Dataset ${datasetId} is not ready (status: ${dataset.status})`);

  // Create model version record
  const [mvResult] = await db.execute<any>(
    `INSERT INTO clone_model_versions (model_name, version, base_model, trigger_word, training_dataset_id, status, created_at)
     VALUES (?, ?, 'flux-dev', ?, ?, 'pending', NOW())`,
    [modelName, `v${Date.now()}`, triggerWord, datasetId]
  );
  const modelVersionId = (mvResult as any).insertId;

  // Create training job
  const backend = gpuInfo.detected ? "local_gpu" : "remote_worker";
  const [jobResult] = await db.execute<any>(
    `INSERT INTO clone_lab_training_jobs 
     (dataset_id, model_version_id, status, training_backend, gpu_detected, gpu_info, created_at)
     VALUES (?, ?, 'queued', ?, ?, ?, NOW())`,
    [
      datasetId,
      modelVersionId,
      backend,
      gpuInfo.detected ? 1 : 0,
      JSON.stringify(gpuInfo),
    ]
  );
  const jobId = (jobResult as any).insertId;

  // Update model version with job reference
  await db.execute(
    `UPDATE clone_model_versions SET status='training' WHERE id=?`,
    [modelVersionId]
  );

  // Start training asynchronously
  if (gpuInfo.detected) {
    runLocalTraining(jobId, modelVersionId, dataset, steps, learningRate, triggerWord).catch(e => {
      console.error(`[TrainingRunner] Local training job ${jobId} failed:`, e);
    });
  } else {
    runRemoteTraining(jobId, modelVersionId, dataset, steps, triggerWord).catch(e => {
      console.error(`[TrainingRunner] Remote training job ${jobId} failed:`, e);
    });
  }

  return { jobId, backend, gpuInfo };
}

async function runLocalTraining(
  jobId: number,
  modelVersionId: number,
  dataset: any,
  steps: number,
  learningRate: number,
  triggerWord: string
): Promise<void> {
  const db = await getDb();
  const logsDir = ensureDir(path.join(CLONE_LAB_BASE, "logs"));
  const logPath = path.join(logsDir, `job_${jobId}.log`);
  const outputDir = ensureDir(path.join(CLONE_LAB_BASE, "models", `job_${jobId}`));

  await db.execute(
    `UPDATE clone_lab_training_jobs SET status='detecting_gpu', logs_path=?, started_at=NOW() WHERE id=?`,
    [logPath, jobId]
  );

  // Check if kohya_ss is available
  let trainingCommand = "";
  const kohyaAvailable = fs.existsSync("/root/kohya_ss") || fs.existsSync("/opt/kohya_ss");
  const kohyaPath = fs.existsSync("/root/kohya_ss") ? "/root/kohya_ss" : "/opt/kohya_ss";

  if (kohyaAvailable) {
    // Full kohya_ss flux training command
    trainingCommand = [
      `cd "${kohyaPath}" &&`,
      `python flux_train_network.py`,
      `--pretrained_model_name_or_path="black-forest-labs/FLUX.1-dev"`,
      `--dataset_config="${dataset.dataset_path}/dataset_config.toml"`,
      `--output_dir="${outputDir}"`,
      `--output_name="${triggerWord}_lora"`,
      `--save_model_as=safetensors`,
      `--network_module=networks.lora_flux`,
      `--network_dim=16`,
      `--network_alpha=1`,
      `--optimizer_type=adamw8bit`,
      `--learning_rate=${learningRate}`,
      `--max_train_steps=${steps}`,
      `--save_every_n_steps=200`,
      `--mixed_precision=bf16`,
      `--gradient_checkpointing`,
      `--caption_extension=.txt`,
      `--trigger_word="${triggerWord}"`,
      `2>&1 | tee "${logPath}"`,
    ].join(" ");
  } else {
    // Fallback: document the command that would be run, package dataset
    trainingCommand = `# kohya_ss not found on this server. Dataset packaged at: ${dataset.dataset_path}\n# To train locally, install kohya_ss and run flux_train_network.py with the dataset.`;
    fs.writeFileSync(logPath, trainingCommand, "utf8");

    await db.execute(
      `UPDATE clone_lab_training_jobs SET 
       status='packaging', command=?, logs_path=?,
       dataset_package_path=?
       WHERE id=?`,
      [trainingCommand, logPath, dataset.manifest_path, jobId]
    );

    // Package dataset for manual/cloud training
    await packageDatasetForExport(jobId, dataset, outputDir);
    return;
  }

  await db.execute(
    `UPDATE clone_lab_training_jobs SET status='running', command=? WHERE id=?`,
    [trainingCommand, jobId]
  );

  // Run training
  try {
    execSync(trainingCommand, { timeout: 7200000, stdio: "pipe" }); // 2hr timeout
    const artifactPath = path.join(outputDir, `${triggerWord}_lora.safetensors`);

    await db.execute(
      `UPDATE clone_lab_training_jobs SET 
       status='completed', artifact_path=?, completed_at=NOW()
       WHERE id=?`,
      [artifactPath, jobId]
    );
    await db.execute(
      `UPDATE clone_model_versions SET 
       status='trained', model_artifact_path=?
       WHERE id=?`,
      [artifactPath, modelVersionId]
    );
  } catch (e) {
    const errMsg = (e as Error).message.substring(0, 1000);
    await db.execute(
      `UPDATE clone_lab_training_jobs SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [errMsg, jobId]
    );
    await db.execute(
      `UPDATE clone_model_versions SET status='pending' WHERE id=?`,
      [modelVersionId]
    );
  }
}

async function runRemoteTraining(
  jobId: number,
  modelVersionId: number,
  dataset: any,
  steps: number,
  triggerWord: string
): Promise<void> {
  const db = await getDb();
  const logsDir = ensureDir(path.join(CLONE_LAB_BASE, "logs"));
  const logPath = path.join(logsDir, `job_${jobId}.log`);

  await db.execute(
    `UPDATE clone_lab_training_jobs SET status='packaging', logs_path=?, started_at=NOW() WHERE id=?`,
    [logPath, jobId]
  );

  const outputDir = ensureDir(path.join(CLONE_LAB_BASE, "models", `job_${jobId}`));

  // Check if Replicate API key is available
  const replicateKey = process.env.REPLICATE_API_TOKEN;
  if (!replicateKey) {
    // Package dataset for manual upload
    await packageDatasetForExport(jobId, dataset, outputDir);
    const packageNote = `No GPU detected and REPLICATE_API_TOKEN not set.\nDataset packaged at: ${dataset.manifest_path}\nUpload to Replicate or a GPU cloud provider to train.`;
    fs.writeFileSync(logPath, packageNote, "utf8");

    await db.execute(
      `UPDATE clone_lab_training_jobs SET 
       status='packaging', logs_tail=?, completed_at=NOW()
       WHERE id=?`,
      [packageNote, jobId]
    );
    return;
  }

  // Submit to Replicate
  try {
    const replicateResponse = await fetch("https://api.replicate.com/v1/trainings", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "ostris/flux-dev-lora-trainer:4ffd32160efd92e956d39c5338a9b8fbafca58e03f791f6d8011f3e20e8ea6fa",
        input: {
          input_images: dataset.dataset_path,
          trigger_word: triggerWord,
          steps,
          lora_rank: 16,
          optimizer: "adamw8bit",
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: false,
        },
      }),
    });

    if (!replicateResponse.ok) {
      throw new Error(`Replicate API error: ${replicateResponse.status} ${await replicateResponse.text()}`);
    }

    const training = await replicateResponse.json() as any;
    const replicateTrainingId = training.id;

    await db.execute(
      `UPDATE clone_lab_training_jobs SET 
       status='running', logs_tail=?
       WHERE id=?`,
      [`Replicate training submitted. ID: ${replicateTrainingId}`, jobId]
    );

    // Update the old clone_training_jobs table for backward compat
    await db.execute(
      `INSERT INTO clone_training_jobs (id, user_id, job_name, status, replicate_training_id, trigger_word, steps, created_at)
       VALUES (UUID(), 6, ?, 'training', ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE status='training'`,
      [`KingCam Clone v${Date.now()}`, replicateTrainingId, triggerWord, steps]
    ).catch(() => {}); // non-fatal

    fs.writeFileSync(logPath, `Replicate training job submitted.\nID: ${replicateTrainingId}\nSteps: ${steps}\nTrigger: ${triggerWord}\n`, "utf8");

  } catch (e) {
    const errMsg = (e as Error).message;
    await db.execute(
      `UPDATE clone_lab_training_jobs SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [errMsg.substring(0, 1000), jobId]
    );
  }
}

async function packageDatasetForExport(
  jobId: number,
  dataset: any,
  outputDir: string
): Promise<void> {
  const db = await getDb();
  const packagePath = path.join(CLONE_LAB_BASE, "packages", `export_job_${jobId}.zip`);
  ensureDir(path.dirname(packagePath));

  try {
    if (dataset.dataset_path && fs.existsSync(dataset.dataset_path)) {
      execSync(
        `cd "${path.dirname(dataset.dataset_path)}" && zip -r "${packagePath}" "${path.basename(dataset.dataset_path)}" 2>/dev/null`,
        { timeout: 120000 }
      );
    }
  } catch (e) {
    console.error("[TrainingRunner] Dataset packaging failed:", e);
  }

  await db.execute(
    `UPDATE clone_lab_training_jobs SET dataset_package_path=? WHERE id=?`,
    [fs.existsSync(packagePath) ? packagePath : null, jobId]
  );
}

export async function getJobStatus(jobId: number): Promise<any> {
  const db = await getDb();
  const [jobs] = await db.execute<any[]>(
    `SELECT j.*, mv.model_name, mv.version, mv.status as model_status
     FROM clone_lab_training_jobs j
     LEFT JOIN clone_model_versions mv ON j.model_version_id = mv.id
     WHERE j.id=?`,
    [jobId]
  );
  const job = (jobs as any[])[0];
  if (!job) throw new Error(`Job ${jobId} not found`);

  // Read last 50 lines of logs
  if (job.logs_path && fs.existsSync(job.logs_path)) {
    try {
      const logContent = fs.readFileSync(job.logs_path, "utf8");
      const lines = logContent.split("\n");
      job.logs_tail = lines.slice(-50).join("\n");
    } catch (_) {}
  }

  return job;
}
