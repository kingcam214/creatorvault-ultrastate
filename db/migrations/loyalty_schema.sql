-- ============================================================
-- CHICA LOYALTY & ACCOUNTABILITY SYSTEM
-- CreatorVault — KingCam214
-- ============================================================

-- LOYALTY TIERS
-- 5 = Elite (Ride or Die) — gets max bonuses, first access, VIP treatment
-- 4 = Trusted — proven, consistent, honest
-- 3 = Developing — showing effort, minor issues
-- 2 = On Notice — lies detected, missed tasks, attitude
-- 1 = Probation — one more strike and they're out
-- 0 = Removed — cut from the program

CREATE TABLE IF NOT EXISTS chica_loyalty_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chica_user_id INT NOT NULL UNIQUE,
  chica_name VARCHAR(100) NOT NULL,
  loyalty_score INT NOT NULL DEFAULT 100,          -- 0-1000 points
  tier INT NOT NULL DEFAULT 3,                      -- 0-5
  tier_label VARCHAR(30) NOT NULL DEFAULT 'Developing',
  honesty_score INT NOT NULL DEFAULT 100,           -- 0-100, drops on each lie caught
  consistency_score INT NOT NULL DEFAULT 50,        -- 0-100, based on task completion rate
  contribution_score INT NOT NULL DEFAULT 50,       -- 0-100, based on revenue + content output
  total_warnings INT NOT NULL DEFAULT 0,
  active_warnings INT NOT NULL DEFAULT 0,
  total_lies_logged INT NOT NULL DEFAULT 0,
  total_tasks_assigned INT NOT NULL DEFAULT 0,
  total_tasks_completed INT NOT NULL DEFAULT 0,
  total_tasks_skipped INT NOT NULL DEFAULT 0,
  total_revenue_generated DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  days_in_program INT NOT NULL DEFAULT 0,
  status ENUM('active','on_notice','probation','suspended','removed') NOT NULL DEFAULT 'active',
  removal_reason TEXT NULL,
  removed_at DATETIME NULL,
  last_score_update DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chica_user (chica_user_id),
  INDEX idx_tier (tier),
  INDEX idx_status (status)
);

-- LOYALTY EVENTS — every action that affects the score
CREATE TABLE IF NOT EXISTS chica_loyalty_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chica_user_id INT NOT NULL,
  event_type ENUM(
    'task_completed',
    'task_skipped',
    'task_late',
    'lie_caught',
    'honesty_bonus',
    'revenue_milestone',
    'content_posted',
    'went_live',
    'brand_deal_closed',
    'warning_issued',
    'warning_cleared',
    'tier_upgrade',
    'tier_downgrade',
    'bonus_earned',
    'rule_violation',
    'loyalty_bonus',
    'manual_adjustment'
  ) NOT NULL,
  points_change INT NOT NULL DEFAULT 0,            -- positive = earned, negative = deducted
  score_before INT NOT NULL,
  score_after INT NOT NULL,
  description TEXT NOT NULL,
  logged_by INT NOT NULL DEFAULT 6,               -- 6 = KingCam (owner user_id)
  evidence_url VARCHAR(500) NULL,                  -- screenshot, link, proof
  is_public TINYINT(1) NOT NULL DEFAULT 0,         -- 1 = chica can see this event
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chica (chica_user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created (created_at)
);

-- WARNINGS — formal warning system
CREATE TABLE IF NOT EXISTS chica_warnings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chica_user_id INT NOT NULL,
  warning_number INT NOT NULL,                     -- 1st, 2nd, 3rd warning
  category ENUM(
    'dishonesty',
    'missed_tasks',
    'attitude',
    'content_violation',
    'rule_breach',
    'disloyalty',
    'financial_dispute',
    'other'
  ) NOT NULL,
  severity ENUM('minor','moderate','severe','final') NOT NULL DEFAULT 'moderate',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT NULL,
  consequence TEXT NOT NULL,                       -- what happens if repeated
  points_deducted INT NOT NULL DEFAULT 0,
  issued_by INT NOT NULL DEFAULT 6,
  acknowledged_by_chica TINYINT(1) NOT NULL DEFAULT 0,
  acknowledged_at DATETIME NULL,
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  resolved_at DATETIME NULL,
  resolution_notes TEXT NULL,
  expires_at DATETIME NULL,                        -- NULL = permanent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chica (chica_user_id),
  INDEX idx_severity (severity),
  INDEX idx_resolved (resolved)
);

-- HONESTY LOG — specific lies/deceptions caught
CREATE TABLE IF NOT EXISTS chica_honesty_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chica_user_id INT NOT NULL,
  lie_category ENUM(
    'follower_count',
    'revenue_reported',
    'content_posted',
    'platform_status',
    'personal_situation',
    'commitment_made',
    'other'
  ) NOT NULL,
  what_was_claimed TEXT NOT NULL,
  what_was_true TEXT NOT NULL,
  impact_level ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  points_deducted INT NOT NULL DEFAULT 0,
  logged_by INT NOT NULL DEFAULT 6,
  evidence TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chica (chica_user_id)
);

-- LOYALTY REWARDS — what each tier unlocks
CREATE TABLE IF NOT EXISTS chica_loyalty_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tier INT NOT NULL,
  tier_label VARCHAR(30) NOT NULL,
  reward_name VARCHAR(200) NOT NULL,
  reward_description TEXT NOT NULL,
  reward_type ENUM('bonus_pct','feature_unlock','cash_bonus','priority_access','other') NOT NULL,
  reward_value VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEED LOYALTY PROFILES for all 4 chicas
INSERT IGNORE INTO chica_loyalty_profiles 
  (chica_user_id, chica_name, loyalty_score, tier, tier_label, honesty_score, consistency_score, contribution_score, days_in_program, status)
VALUES
  (8001, 'Delbania', 650, 3, 'Developing', 80, 65, 60, 90, 'active'),
  (8002, 'China (Marielka)', 720, 4, 'Trusted', 85, 70, 75, 90, 'active'),
  (8003, 'Lizzy (Slim)', 580, 3, 'Developing', 70, 55, 55, 90, 'on_notice'),
  (8004, 'Lirys (Twin)', 690, 3, 'Developing', 90, 60, 65, 90, 'active');

-- SEED LOYALTY REWARDS per tier
INSERT IGNORE INTO chica_loyalty_rewards (tier, tier_label, reward_name, reward_description, reward_type, reward_value) VALUES
-- Tier 1: Probation
(1, 'Probation', 'Basic Access Only', 'Access to the program but no bonuses. One more violation = removal.', 'feature_unlock', 'basic_only'),
-- Tier 2: On Notice  
(2, 'On Notice', 'Standard Pay Rate', 'Standard 50% revenue split. No bonuses. Under review.', 'bonus_pct', '50%'),
-- Tier 3: Developing
(3, 'Developing', '55% Revenue Split', 'Slightly above standard split for showing effort.', 'bonus_pct', '55%'),
(3, 'Developing', 'Content Coaching', 'Access to KingCam content strategy sessions.', 'feature_unlock', 'coaching'),
-- Tier 4: Trusted
(4, 'Trusted', '60% Revenue Split', 'Elevated split for consistent, honest performers.', 'bonus_pct', '60%'),
(4, 'Trusted', 'Brand Deal Priority', 'First access to incoming brand deal opportunities.', 'priority_access', 'brand_deals'),
(4, 'Trusted', '$100 Monthly Bonus', 'Cash bonus for maintaining Trusted tier for 30+ days.', 'cash_bonus', '$100/month'),
-- Tier 5: Elite (Ride or Die)
(5, 'Elite', '70% Revenue Split', 'Maximum split reserved for the most loyal chicas.', 'bonus_pct', '70%'),
(5, 'Elite', '$250 Monthly Loyalty Bonus', 'Cash bonus on top of elevated split.', 'cash_bonus', '$250/month'),
(5, 'Elite', 'Co-Creator Status', 'Featured as a co-creator on KingCam platforms. Full brand backing.', 'feature_unlock', 'co_creator'),
(5, 'Elite', 'Greatest Show Headline Slot', 'Priority placement on Greatest Show on Earth vertical.', 'priority_access', 'headline');

-- SEED TIER SCORING RULES (stored as reference)
-- 0-199 pts = Tier 0 (Removed)
-- 200-399 pts = Tier 1 (Probation)
-- 400-549 pts = Tier 2 (On Notice)
-- 550-699 pts = Tier 3 (Developing)
-- 700-849 pts = Tier 4 (Trusted)
-- 850-1000 pts = Tier 5 (Elite)

-- POINT VALUES (reference)
-- Task completed on time: +10 pts
-- Task completed late: +5 pts
-- Task skipped: -15 pts
-- Lie caught (low): -50 pts
-- Lie caught (medium): -100 pts
-- Lie caught (high): -200 pts
-- Lie caught (critical): -300 pts
-- Revenue milestone hit: +25 pts
-- Brand deal closed: +50 pts
-- Went live (TikTok/IG): +5 pts
-- Content posted: +3 pts
-- Warning issued: -50 pts
-- Warning (final): -150 pts
-- Honesty bonus (proactively disclosed issue): +30 pts
-- Loyalty bonus (30 days no violations): +50 pts
