/**
 * Database Schema Bootstrap
 * 
 * Creates missing tables without interactive Drizzle prompts.
 * Run once on first deploy by setting SCHEMA_BOOTSTRAP=1
 */

import { getDb } from "../db";

export async function bootstrapSchema() {
  if (process.env.SCHEMA_BOOTSTRAP !== "1") {
    console.log("[Bootstrap] Skipping schema bootstrap (SCHEMA_BOOTSTRAP != 1)");
    return;
  }

  console.log("[Bootstrap] Starting schema bootstrap...");
  const db = await getDb();

  const tables = [
    // Unified Content
    `CREATE TABLE IF NOT EXISTS unified_content (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      body TEXT,
      media_url VARCHAR(500),
      media_type ENUM('image', 'video', 'audio', 'text'),
      tags JSON,
      category VARCHAR(100),
      niche VARCHAR(100),
      duration INT,
      target_platforms JSON NOT NULL,
      publish_strategy ENUM('immediate', 'scheduled', 'draft') NOT NULL,
      scheduled_for TIMESTAMP NULL,
      timezone VARCHAR(50),
      optimization_level ENUM('none', 'basic', 'aggressive') DEFAULT 'basic',
      generate_thumbnail BOOLEAN DEFAULT FALSE,
      generate_ad BOOLEAN DEFAULT FALSE,
      run_viral_analysis BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Orchestration Runs
    `CREATE TABLE IF NOT EXISTS orchestration_runs (
      id VARCHAR(36) PRIMARY KEY,
      content_id VARCHAR(36) NOT NULL,
      user_id INT NOT NULL,
      status ENUM('draft', 'optimizing', 'ready', 'scheduled', 'publishing', 'published', 'failed') NOT NULL,
      viral_analysis_id VARCHAR(36),
      thumbnail_analysis_id VARCHAR(36),
      ad_analysis_id VARCHAR(36),
      generated_assets JSON,
      platform_results JSON,
      error_log TEXT,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES unified_content(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Platform Adaptations
    `CREATE TABLE IF NOT EXISTS platform_adaptations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orchestration_id VARCHAR(36) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      adapted_title VARCHAR(500),
      adapted_description TEXT,
      adapted_media_url VARCHAR(500),
      platform_specific_data JSON,
      published_url VARCHAR(500),
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (orchestration_id) REFERENCES orchestration_runs(id) ON DELETE CASCADE
    )`,

    // Optimization History
    `CREATE TABLE IF NOT EXISTS optimization_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      content_id VARCHAR(36),
      optimization_type VARCHAR(50) NOT NULL,
      input_data JSON NOT NULL,
      output_data JSON NOT NULL,
      score INT,
      applied_recommendations JSON,
      performance_impact JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (content_id) REFERENCES unified_content(id) ON DELETE CASCADE
    )`,

    // Content Performance
    `CREATE TABLE IF NOT EXISTS content_performance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content_id VARCHAR(36) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      views INT DEFAULT 0,
      likes INT DEFAULT 0,
      comments INT DEFAULT 0,
      shares INT DEFAULT 0,
      clicks INT DEFAULT 0,
      ctr DECIMAL(5, 2),
      engagement DECIMAL(5, 2),
      retention DECIMAL(5, 2),
      revenue INT DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES unified_content(id) ON DELETE CASCADE
    )`,

    // Ad Campaigns
    `CREATE TABLE IF NOT EXISTS ad_campaigns (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      platform ENUM('facebook', 'instagram', 'google', 'tiktok', 'twitter') NOT NULL,
      objective VARCHAR(100),
      budget INT,
      target_audience JSON,
      ad_creative_url VARCHAR(500),
      ad_copy TEXT,
      status ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      conversions INT DEFAULT 0,
      spend INT DEFAULT 0,
      ctr DECIMAL(5, 2),
      cpc INT,
      roas DECIMAL(5, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Clone Passport — durable identity/operating kernel for creator clones
    `CREATE TABLE IF NOT EXISTS clone_passports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      clone_key VARCHAR(120) NOT NULL DEFAULT 'default',
      display_name VARCHAR(255) NOT NULL,
      identity_profile JSON NOT NULL,
      voice_profile JSON,
      visual_profile JSON,
      behavioral_profile JSON,
      operating_rules JSON,
      source_refs JSON,
      status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_clone_passports_user_key (user_id, clone_key),
      INDEX idx_clone_passports_user_status (user_id, status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Clone Memory Core — durable, queryable memory attached to Clone Passports
    `CREATE TABLE IF NOT EXISTS clone_memory_entries (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      passport_id INT NOT NULL,
      user_id INT NOT NULL,
      memory_type ENUM('fact', 'preference', 'event', 'instruction', 'interaction', 'asset', 'attribution', 'system') NOT NULL DEFAULT 'fact',
      source VARCHAR(120),
      source_id VARCHAR(191),
      importance INT NOT NULL DEFAULT 50,
      confidence DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
      content TEXT NOT NULL,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_accessed_at TIMESTAMP NULL,
      access_count INT NOT NULL DEFAULT 0,
      archived_at TIMESTAMP NULL,
      INDEX idx_clone_memory_passport_created (passport_id, created_at),
      INDEX idx_clone_memory_user_type (user_id, memory_type),
      INDEX idx_clone_memory_source (source, source_id),
      FULLTEXT KEY ft_clone_memory_content (content),
      FOREIGN KEY (passport_id) REFERENCES clone_passports(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Agent Action Receipts — durable proof packets for autonomous operator runs
    `CREATE TABLE IF NOT EXISTS agent_action_receipts (
      id VARCHAR(36) PRIMARY KEY,
      telemetry_event_id VARCHAR(36),
      cycle_id VARCHAR(36),
      agent_slug VARCHAR(128) NOT NULL,
      agent_name VARCHAR(256) NOT NULL,
      agent_category VARCHAR(64) NOT NULL,
      task_type VARCHAR(100) NOT NULL,
      action VARCHAR(191) NOT NULL,
      status ENUM('started', 'success', 'failed', 'skipped') NOT NULL,
      outcome_summary TEXT,
      evidence JSON,
      artifacts JSON,
      revenue_generated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      started_at TIMESTAMP NULL,
      finished_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_agent_action_receipts_agent_created (agent_slug, created_at),
      INDEX idx_agent_action_receipts_cycle (cycle_id),
      INDEX idx_agent_action_receipts_status_created (status, created_at),
      INDEX idx_agent_action_receipts_telemetry (telemetry_event_id)
    )`,
  ];

  for (const sql of tables) {
    try {
    // @ts-ignore
      await db.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`[Bootstrap] ✓ Created table: ${tableName}`);
    } catch (error: any) {
      console.error(`[Bootstrap] ✗ Failed to create table:`, error.message);
    }
  }

  console.log("[Bootstrap] Schema bootstrap complete");
}
