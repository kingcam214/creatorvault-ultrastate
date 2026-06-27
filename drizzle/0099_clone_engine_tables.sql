-- ============================================================================
-- Clone Engine — World-Class Tables Migration
-- Adds all new tables required by cloneEngineRouter.ts
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)
-- ============================================================================

-- Clone Profiles (multi-creator, not just owner)
CREATE TABLE IF NOT EXISTS clone_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  trigger_word VARCHAR(50) NOT NULL,
  description TEXT,
  platforms JSON,
  voice_id VARCHAR(100),
  base_image_url TEXT,
  active_model_version VARCHAR(200),
  status ENUM('active', 'inactive', 'training') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clone_profiles_user (user_id),
  INDEX idx_clone_profiles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clone Passports (persistent identity/persona/voice/visual profile)
CREATE TABLE IF NOT EXISTS clone_passports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clone_id VARCHAR(36),
  user_id INT NOT NULL,
  identity_profile JSON,
  voice_profile JSON,
  visual_profile JSON,
  behavioral_profile JSON,
  operating_rules JSON,
  source_refs JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clone_passports_user (user_id),
  INDEX idx_clone_passports_clone (clone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clone Video Generations (multi-provider: Pollo, Runway, Luma, MiniMax)
CREATE TABLE IF NOT EXISTS clone_video_generations (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  clone_id VARCHAR(36),
  provider VARCHAR(50) NOT NULL,
  task_id VARCHAR(200) NOT NULL,
  external_id VARCHAR(200),
  image_url TEXT,
  prompt TEXT,
  motion_style VARCHAR(50),
  resolution VARCHAR(10),
  length VARCHAR(5),
  mode VARCHAR(10),
  status VARCHAR(30) DEFAULT 'queued',
  video_url TEXT,
  error_message TEXT,
  cost_credits INT DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cvg_user (user_id),
  INDEX idx_cvg_task (task_id),
  INDEX idx_cvg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clone Voice Generations (ElevenLabs voice clone synthesis)
CREATE TABLE IF NOT EXISTS clone_voice_generations (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  clone_id VARCHAR(36),
  script TEXT NOT NULL,
  voice_id VARCHAR(100),
  audio_url TEXT,
  duration_seconds FLOAT DEFAULT 0,
  provider VARCHAR(50),
  status VARCHAR(30) DEFAULT 'completed',
  cost_credits INT DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cvg_voice_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clone Consent Records (compliance vault for clone)
CREATE TABLE IF NOT EXISTS clone_consent_records (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  clone_id VARCHAR(36),
  consent_type VARCHAR(50) NOT NULL,
  platform VARCHAR(100),
  ip_address VARCHAR(45),
  consented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ccr_user (user_id),
  INDEX idx_ccr_type (consent_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clone Distributions (distribution queue for all channels)
CREATE TABLE IF NOT EXISTS clone_distributions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  clone_id VARCHAR(36),
  asset_url TEXT NOT NULL,
  asset_type VARCHAR(20) NOT NULL,
  channels JSON,
  caption TEXT,
  scheduled_at DATETIME,
  status VARCHAR(30) DEFAULT 'queued',
  distributed_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cd_user (user_id),
  INDEX idx_cd_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vault Assets (unified vault for all clone outputs)
CREATE TABLE IF NOT EXISTS vault_assets (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  clone_id VARCHAR(36),
  asset_type VARCHAR(30) NOT NULL,
  url TEXT NOT NULL,
  title VARCHAR(200),
  tags JSON,
  source VARCHAR(50) DEFAULT 'clone_engine',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_user (user_id),
  INDEX idx_va_type (asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add clone_id column to existing kingcam_clone_generations if not present
ALTER TABLE kingcam_clone_generations
  ADD COLUMN IF NOT EXISTS clone_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saved_to_vault TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vault_saved_at DATETIME DEFAULT NULL;

-- Add external_job_id and error columns to clone_training_jobs if not present
ALTER TABLE clone_training_jobs
  ADD COLUMN IF NOT EXISTS trigger_word VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dataset_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steps INT DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS learning_rate FLOAT DEFAULT 0.0004,
  ADD COLUMN IF NOT EXISTS lora_rank INT DEFAULT 16,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'replicate',
  ADD COLUMN IF NOT EXISTS external_job_id VARCHAR(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS output_model VARCHAR(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error TEXT DEFAULT NULL;
