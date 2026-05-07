-- KingCam Clone Training Lab — DB Migration
-- Run: mysql -u creatorvault -pKingCam214CreatorVault creatorvault < clone_training_migration.sql

-- 1. clone_training_uploads
CREATE TABLE IF NOT EXISTS clone_training_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source_type ENUM('image','video') NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT DEFAULT 0,
  width INT DEFAULT 0,
  height INT DEFAULT 0,
  duration_seconds DECIMAL(10,3) DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_status ENUM('pending','processing','done','rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  INDEX idx_ctu_user_id (user_id),
  INDEX idx_ctu_status (processing_status),
  INDEX idx_ctu_source_type (source_type)
);

-- 2. clone_training_frames
CREATE TABLE IF NOT EXISTS clone_training_frames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  frame_path TEXT NOT NULL,
  frame_url TEXT,
  timestamp_seconds DECIMAL(10,3) DEFAULT 0,
  face_detected TINYINT(1) DEFAULT 0,
  face_confidence DECIMAL(5,4) DEFAULT 0,
  blur_score DECIMAL(8,4) DEFAULT 0,
  lighting_score DECIMAL(5,4) DEFAULT 0,
  pose_score DECIMAL(5,4) DEFAULT 0,
  duplicate_hash VARCHAR(64),
  quality_score DECIMAL(5,2) DEFAULT 0,
  quality_tier ENUM('excellent','good','usable','reject') DEFAULT 'usable',
  approved_for_training TINYINT(1) DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ctf_upload_id (upload_id),
  INDEX idx_ctf_approved (approved_for_training),
  INDEX idx_ctf_quality_tier (quality_tier),
  INDEX idx_ctf_duplicate_hash (duplicate_hash)
);

-- 3. clone_training_datasets
CREATE TABLE IF NOT EXISTS clone_training_datasets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_word VARCHAR(100) DEFAULT 'fluxdevCam',
  base_model VARCHAR(100) DEFAULT 'flux-dev',
  status ENUM('building','ready','training','trained','archived') DEFAULT 'building',
  total_images INT DEFAULT 0,
  approved_images INT DEFAULT 0,
  rejected_images INT DEFAULT 0,
  dataset_path TEXT,
  captions_path TEXT,
  manifest_path TEXT,
  preview_grid_path TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ctd_status (status),
  INDEX idx_ctd_created_by (created_by)
);

-- 4. clone_training_dataset_items
CREATE TABLE IF NOT EXISTS clone_training_dataset_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  frame_id INT,
  upload_id INT,
  image_path TEXT NOT NULL,
  image_url TEXT,
  caption TEXT,
  tags JSON,
  quality_score DECIMAL(5,2) DEFAULT 0,
  included TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ctdi_dataset_id (dataset_id),
  INDEX idx_ctdi_frame_id (frame_id),
  INDEX idx_ctdi_included (included)
);

-- 5. clone_model_versions
CREATE TABLE IF NOT EXISTS clone_model_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  base_model VARCHAR(100) DEFAULT 'flux-dev',
  trigger_word VARCHAR(100) DEFAULT 'fluxdevCam',
  training_dataset_id INT,
  training_config_json JSON,
  model_artifact_path TEXT,
  model_artifact_url TEXT,
  sample_outputs_path TEXT,
  status ENUM('pending','training','trained','evaluated','promoted','archived') DEFAULT 'pending',
  promoted_to_production TINYINT(1) DEFAULT 0,
  identity_score DECIMAL(5,2),
  realism_score DECIMAL(5,2),
  consistency_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cmv_status (status),
  INDEX idx_cmv_promoted (promoted_to_production),
  INDEX idx_cmv_version (version)
);

-- 6. clone_training_jobs
-- Note: existing clone_training_jobs table has different schema — creating new one
CREATE TABLE IF NOT EXISTS clone_lab_training_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  model_version_id INT,
  status ENUM('queued','detecting_gpu','running','packaging','completed','failed','cancelled') DEFAULT 'queued',
  training_backend ENUM('local_gpu','remote_worker','manual_import') DEFAULT 'local_gpu',
  gpu_detected TINYINT(1) DEFAULT 0,
  gpu_info TEXT,
  command TEXT,
  logs_path TEXT,
  logs_tail TEXT,
  error_message TEXT,
  dataset_package_path TEXT,
  dataset_package_url TEXT,
  artifact_path TEXT,
  artifact_url TEXT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cltj_dataset_id (dataset_id),
  INDEX idx_cltj_status (status),
  INDEX idx_cltj_model_version_id (model_version_id)
);

-- 7. clone_model_evaluations
CREATE TABLE IF NOT EXISTS clone_model_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_version_id INT NOT NULL,
  prompt TEXT NOT NULL,
  output_path TEXT,
  output_url TEXT,
  identity_score DECIMAL(5,2),
  realism_score DECIMAL(5,2),
  consistency_score DECIMAL(5,2),
  user_rating INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cme_model_version_id (model_version_id)
);

-- Seed fluxdevCam v1 as production baseline
INSERT IGNORE INTO clone_model_versions (id, model_name, version, base_model, trigger_word, status, promoted_to_production, notes, created_at)
VALUES (1, 'fluxdevCam', 'v1', 'flux-dev', 'fluxdevCam', 'promoted', 1, 'Production baseline — original fluxdevCam model', NOW());
