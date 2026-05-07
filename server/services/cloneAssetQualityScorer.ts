/**
 * CLONE ASSET QUALITY SCORER
 * Real quality scoring pipeline for training assets.
 * Checks: blur, resolution, face detection, lighting, compression, duplicates.
 * Categorizes: Excellent / Good / Usable / Reject
 */
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "../db";

export interface QualityResult {
  blurScore: number;        // 0-1, higher = sharper
  lightingScore: number;    // 0-1, higher = better
  faceDetected: boolean;
  faceConfidence: number;   // 0-1
  poseScore: number;        // 0-1
  duplicateHash: string;
  isDuplicate: boolean;
  width: number;
  height: number;
  qualityScore: number;     // 0-100
  qualityTier: "excellent" | "good" | "usable" | "reject";
  rejectionReason: string | null;
}

export async function scoreAsset(imagePath: string, uploadId?: number): Promise<QualityResult> {
  const result: QualityResult = {
    blurScore: 0,
    lightingScore: 0,
    faceDetected: false,
    faceConfidence: 0,
    poseScore: 0,
    duplicateHash: "",
    isDuplicate: false,
    width: 0,
    height: 0,
    qualityScore: 0,
    qualityTier: "reject",
    rejectionReason: null,
  };

  // 1. Check file exists and is not corrupt
  if (!fs.existsSync(imagePath)) {
    result.rejectionReason = "File not found";
    return result;
  }

  const stat = fs.statSync(imagePath);
  if (stat.size < 5000) {
    result.rejectionReason = "File too small — likely corrupt or blank";
    return result;
  }

  // 2. Get dimensions via ffprobe
  try {
    const dimOut = execSync(
      `ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${imagePath}" 2>/dev/null`,
      { encoding: "utf8", timeout: 10000 }
    );
    const parts = dimOut.trim().split(",");
    result.width = parseInt(parts[0]) || 0;
    result.height = parseInt(parts[1]) || 0;
  } catch (_) {
    // Try imagemagick identify as fallback
    try {
      const idOut = execSync(`identify -format "%wx%h" "${imagePath}" 2>/dev/null`, { encoding: "utf8", timeout: 10000 });
      const parts = idOut.trim().split("x");
      result.width = parseInt(parts[0]) || 0;
      result.height = parseInt(parts[1]) || 0;
    } catch (_2) {}
  }

  // Resolution check
  if (result.width < 256 || result.height < 256) {
    result.rejectionReason = `Resolution too low: ${result.width}x${result.height} (minimum 256x256)`;
    return result;
  }

  // 3. Compute duplicate hash (MD5 of file content)
  try {
    const buf = fs.readFileSync(imagePath);
    result.duplicateHash = crypto.createHash("md5").update(buf).digest("hex");
  } catch (_) {}

  // Check for duplicate in DB
  if (result.duplicateHash) {
    const db = await getDb();
    const [existing] = await db.execute<any[]>(
      `SELECT id FROM clone_training_frames WHERE duplicate_hash = ? ${uploadId ? `AND upload_id != ${uploadId}` : ""} LIMIT 1`
    );
    result.isDuplicate = (existing as any[]).length > 0;
    if (result.isDuplicate) {
      result.rejectionReason = "Duplicate image detected";
    }
  }

  // 4. Blur detection using ffmpeg laplacian variance
  // Higher variance = sharper image. Threshold: < 50 = blurry
  let laplacianVariance = 0;
  try {
    const blurOut = execSync(
      `ffmpeg -i "${imagePath}" -vf "format=gray,geq=lum='abs(lum(X,Y)-lum(X-1,Y))+abs(lum(X,Y)-lum(X,Y-1))'" -f null - 2>&1 | grep -i "mean" | tail -1`,
      { encoding: "utf8", timeout: 15000 }
    );
    // Parse mean value from ffmpeg stats
    const match = blurOut.match(/mean:\s*([\d.]+)/i);
    laplacianVariance = match ? parseFloat(match[1]) : 50;
  } catch (_) {
    laplacianVariance = 50; // assume average if detection fails
  }
  result.blurScore = Math.min(1, laplacianVariance / 100);

  // 5. Lighting estimation via ffmpeg mean luminance
  let meanLuminance = 128;
  try {
    const lumOut = execSync(
      `ffmpeg -i "${imagePath}" -vf "signalstats" -f null - 2>&1 | grep "YAVG" | head -1`,
      { encoding: "utf8", timeout: 15000 }
    );
    const match = lumOut.match(/YAVG:([\d.]+)/);
    meanLuminance = match ? parseFloat(match[1]) : 128;
  } catch (_) {
    meanLuminance = 128;
  }
  // Ideal luminance: 80-200. Score drops for too dark (<50) or too bright (>220)
  if (meanLuminance < 30) {
    result.lightingScore = 0.1;
  } else if (meanLuminance < 60) {
    result.lightingScore = 0.4;
  } else if (meanLuminance > 230) {
    result.lightingScore = 0.3;
  } else if (meanLuminance > 200) {
    result.lightingScore = 0.7;
  } else {
    result.lightingScore = 0.9;
  }

  // 6. Face detection using OpenCV via Python (best-effort)
  try {
    const faceScript = `
import cv2, sys, json
img = cv2.imread(sys.argv[1])
if img is None:
    print(json.dumps({"detected": False, "confidence": 0}))
    sys.exit()
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60,60))
if len(faces) > 0:
    x,y,w,h = faces[0]
    img_area = img.shape[0] * img.shape[1]
    face_area = w * h
    confidence = min(1.0, face_area / img_area * 10)
    print(json.dumps({"detected": True, "confidence": round(confidence, 3), "w": int(w), "h": int(h)}))
else:
    print(json.dumps({"detected": False, "confidence": 0}))
`;
    const faceOut = execSync(
      `python3 -c '${faceScript.replace(/'/g, '"')}' "${imagePath}" 2>/dev/null`,
      { encoding: "utf8", timeout: 20000 }
    );
    const faceData = JSON.parse(faceOut.trim());
    result.faceDetected = faceData.detected;
    result.faceConfidence = faceData.confidence || 0;
    // Pose score based on face size relative to image
    result.poseScore = result.faceDetected ? Math.min(1, result.faceConfidence * 1.5) : 0.3;
  } catch (_) {
    // Face detection unavailable — don't penalize, just note
    result.faceDetected = false;
    result.faceConfidence = 0;
    result.poseScore = 0.5;
  }

  // 7. Compute composite quality score (0-100)
  let score = 0;
  score += result.blurScore * 30;           // 30 pts: sharpness
  score += result.lightingScore * 20;       // 20 pts: lighting
  score += (result.faceDetected ? 1 : 0.3) * 20; // 20 pts: face present
  score += result.faceConfidence * 15;      // 15 pts: face confidence
  score += (result.width >= 512 && result.height >= 512 ? 1 : 0.5) * 10; // 10 pts: resolution
  score += result.poseScore * 5;            // 5 pts: pose
  if (result.isDuplicate) score = Math.min(score, 20);

  result.qualityScore = Math.round(score);

  // 8. Categorize
  if (result.isDuplicate) {
    result.qualityTier = "reject";
    result.rejectionReason = result.rejectionReason || "Duplicate image";
  } else if (result.qualityScore >= 75) {
    result.qualityTier = "excellent";
  } else if (result.qualityScore >= 55) {
    result.qualityTier = "good";
  } else if (result.qualityScore >= 35) {
    result.qualityTier = "usable";
  } else {
    result.qualityTier = "reject";
    if (!result.rejectionReason) {
      if (result.blurScore < 0.3) result.rejectionReason = "Image too blurry";
      else if (result.lightingScore < 0.3) result.rejectionReason = "Poor lighting";
      else result.rejectionReason = "Quality score too low for training";
    }
  }

  return result;
}

export async function scoreAndUpdateFrame(frameId: number, framePath: string): Promise<QualityResult> {
  const result = await scoreAsset(framePath);
  const db = await getDb();
  await db.execute(
    `UPDATE clone_training_frames SET
      face_detected=?, face_confidence=?, blur_score=?, lighting_score=?, pose_score=?,
      duplicate_hash=?, quality_score=?, quality_tier=?,
      approved_for_training=?, rejection_reason=?
     WHERE id=?`,
    [
      result.faceDetected ? 1 : 0,
      result.faceConfidence,
      result.blurScore,
      result.lightingScore,
      result.poseScore,
      result.duplicateHash,
      result.qualityScore,
      result.qualityTier,
      result.qualityTier !== "reject" ? 1 : 0,
      result.rejectionReason,
      frameId,
    ]
  );
  return result;
}
