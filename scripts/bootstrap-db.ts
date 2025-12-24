/**
 * Standalone Database Bootstrap Script
 * 
 * Run with: pnpm tsx scripts/bootstrap-db.ts
 */

import mysql from "mysql2/promise";

async function bootstrap() {
  console.log("[Bootstrap] Starting schema bootstrap...");
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

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

    // Subscription Tiers
    `CREATE TABLE IF NOT EXISTS subscription_tiers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      creator_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_in_cents INT NOT NULL,
      billing_period ENUM('monthly', 'yearly') DEFAULT 'monthly',
      benefits JSON,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_subscription_tiers_creator_id (creator_id)
    )`,

    // Subscriptions
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fan_id INT NOT NULL,
      creator_id INT NOT NULL,
      tier_id INT NOT NULL,
      stripe_subscription_id VARCHAR(255),
      status ENUM('active', 'canceled', 'past_due', 'unpaid') DEFAULT 'active',
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      canceled_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (fan_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id) ON DELETE CASCADE,
      INDEX idx_subscriptions_fan_id (fan_id),
      INDEX idx_subscriptions_creator_id (creator_id),
      INDEX idx_subscriptions_status (status),
      INDEX idx_subscriptions_stripe_subscription_id (stripe_subscription_id)
    )`,

    // Creator Balances
    `CREATE TABLE IF NOT EXISTS creator_balances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      creator_id INT NOT NULL UNIQUE,
      available_balance_in_cents INT DEFAULT 0 NOT NULL,
      pending_balance_in_cents INT DEFAULT 0 NOT NULL,
      lifetime_earnings_in_cents INT DEFAULT 0 NOT NULL,
      last_payout_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_creator_balances_creator_id (creator_id)
    )`,

    // Transactions
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subscription_id INT,
      fan_id INT NOT NULL,
      creator_id INT NOT NULL,
      amount_in_cents INT NOT NULL,
      creator_share_in_cents INT NOT NULL,
      platform_share_in_cents INT NOT NULL,
      stripe_payment_intent_id VARCHAR(255),
      status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (fan_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_transactions_fan_id (fan_id),
      INDEX idx_transactions_creator_id (creator_id),
      INDEX idx_transactions_subscription_id (subscription_id),
      INDEX idx_transactions_status (status)
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
  ];

  for (const sql of tables) {
    try {
      await connection.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`[Bootstrap] ✓ Created table: ${tableName}`);
    } catch (error: any) {
      console.error(`[Bootstrap] ✗ Failed to create table:`, error.message);
    }
  }

  await connection.end();
  console.log("[Bootstrap] Schema bootstrap complete");
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error("[Bootstrap] Fatal error:", error);
  process.exit(1);
});
