-- ============================================================
-- LESLIE (Princesa De Africa) — DB Setup v2
-- Matches actual table schemas
-- User ID: 8005
-- ============================================================

-- 1. User record
INSERT INTO users (id, username, email, password, role, created_at)
VALUES (8005, 'leslie', 'leslie@creatorvault.live', '$2b$10$placeholder_hash_leslie', 'chica', NOW())
ON DUPLICATE KEY UPDATE username='leslie', role='chica';

-- 2. Greatest Show Creators entry
INSERT INTO greatest_show_creators (
  user_id, stage_name, sub_group, bio, specialties, tier,
  follower_count, monthly_revenue, content_count, engagement_rate,
  status, subscription_price, brand_deal_niche
) VALUES (
  8005,
  'Princesa De Africa',
  'lifestyle',
  'Dominicana 🇩🇴 living in Colombia 🇨🇴. Fit body, wild spirit, no filter. Adult content creator, sexy fitness model, and social media force. VaultX exclusive. TikTok: @princesadeafrica | IG: @negriitax3',
  '["Adult Content", "Sexy Fitness", "Lifestyle", "Dominican Culture", "Colombia Travel", "VaultX Exclusive"]',
  2,
  6977,
  0.00,
  362,
  3.73,
  'active',
  39.99,
  '["fitness", "lifestyle", "adult", "travel", "fashion", "beauty"]'
) ON DUPLICATE KEY UPDATE stage_name='Princesa De Africa', status='active';

-- 3. Chica Loyalty Profile
INSERT INTO chica_loyalty_profiles (
  chica_user_id, chica_name, status, tier, tier_label,
  loyalty_score, honesty_score, consistency_score, contribution_score,
  total_warnings, active_warnings, total_lies_logged,
  total_tasks_assigned, total_tasks_completed, total_tasks_skipped,
  total_revenue_generated, days_in_program, notes, created_at
) VALUES (
  8005, 'Leslie (Princesa)', 'active', 3, 'Developing',
  600, 85, 60, 55,
  0, 0, 0,
  0, 0, 0,
  0.00, 0,
  'New addition. Adult content creator. Former Fansly (low revenue, possibly deleted). Fit body — never done fitness content. High potential. Targeting gringos. Tinder + VaultX funnel priority. Greatest Show Adult member.',
  NOW()
) ON DUPLICATE KEY UPDATE chica_name='Leslie (Princesa)', status='active', notes='New addition. Adult content creator. Former Fansly (low revenue, possibly deleted). Fit body — never done fitness content. High potential. Targeting gringos. Tinder + VaultX funnel priority. Greatest Show Adult member.';

-- 4. Chica Funnel — matches actual chica_funnels schema
INSERT INTO chica_funnels (
  id, chica_user_id, funnel_name,
  tinder_bio, tinder_opener, tinder_cta,
  vaultx_referral_link, vaultx_offer_text,
  locale, status, provisioned_at, created_at
) VALUES (
  'leslie-adult-vaultx-001',
  8005,
  'Leslie Adult VaultX Funnel',
  -- TINDER BIO
  'Princesa De Africa 🦋 | Dominican in Colombia 🇩🇴🇨🇴 | Fit & free 🔥 | Private content on VaultX 👑 | Ask me how 😈',
  -- TINDER OPENER
  'Hey 😘 I''m Leslie. You matched with me — good taste. I have a private side I only share with select people. Interested? 🔥',
  -- TINDER CTA
  'I don''t really use Tinder to chat — add me on WhatsApp? I''ll send you something special 😈',
  -- VAULTX REFERRAL LINK
  'https://vaultx.com/princesadeafrica',
  -- VAULTX OFFER TEXT
  'You found me 👑 I''m Leslie — Princesa De Africa. Dominican. Fit. Unfiltered. I do adult fitness content, lifestyle, and things I can''t post anywhere else. $39.99/month gets you everything. No games, no filters, no limits. Subscribe now 🔥',
  'en_US',
  'active',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE status='active', funnel_name='Leslie Adult VaultX Funnel';

-- 5. Funnel Steps — matches actual chica_funnel_templates schema
-- Using template_name as funnel identifier since chica_funnel_steps uses funnel_id
-- Check chica_funnel_steps schema first
-- Steps stored in chica_funnel_templates (the actual step table)
INSERT INTO chica_funnel_templates (
  template_name, locale, platform, step_order, step_type, message_text, delay_hours
) VALUES
-- TINDER STEPS
('leslie-adult-vaultx-001', 'en_US', 'tinder', 1, 'message', 'Hey 😘 I''m Leslie — Princesa De Africa. You matched with me — good taste. I have a private side I only share with select people. Interested? 🔥', 0),
('leslie-adult-vaultx-001', 'en_US', 'tinder', 2, 'cta', 'I don''t really use Tinder to chat — add me on WhatsApp? I''ll send you something special 😈', 2),

-- WHATSAPP STEPS
('leslie-adult-vaultx-001', 'en_US', 'whatsapp', 1, 'message', 'Hola papi 😘 I''m Leslie — Princesa De Africa. Dominican girl living in Colombia. I''m a model and content creator. I have a very... private side 🔥', 0),
('leslie-adult-vaultx-001', 'en_US', 'whatsapp', 2, 'message', 'I post fitness content publicly but my REAL content — the stuff I actually want to share — is on my VaultX. Have you heard of it? 😈', 4),
('leslie-adult-vaultx-001', 'en_US', 'whatsapp', 3, 'cta', 'Before VaultX, join my Telegram first — it''s free and I post previews there. t.me/princesadeafrica_official — join and I''ll DM you personally 😘', 8),
('leslie-adult-vaultx-001', 'en_US', 'whatsapp', 4, 'upsell', 'Okay papi — you''ve been patient 😈 My VaultX is $39.99/month. Fit body, adult content, things I can''t post anywhere else. Subscribe: vaultx.com/princesadeafrica 👑', 24),
('leslie-adult-vaultx-001', 'en_US', 'whatsapp', 5, 'message', 'Did you check out my VaultX? 🔥 I just posted something new today and I think you''d really like it... 😘', 48),

-- TELEGRAM STEPS
('leslie-adult-vaultx-001', 'en_US', 'telegram', 1, 'message', 'Hola amor 🦋 Welcome to my Telegram! I''m Leslie — Princesa De Africa. This is where I post free previews of my VaultX content. Stay here and you''ll see why people subscribe 😈', 0),
('leslie-adult-vaultx-001', 'en_US', 'telegram', 2, 'cta', 'New preview just dropped 🔥 This is just a taste of what''s on my VaultX. Full content at vaultx.com/princesadeafrica — $39.99/month 👑', 24),
('leslie-adult-vaultx-001', 'en_US', 'telegram', 3, 'message', 'Did my workout today 💪 Fit body doesn''t happen by accident. The full workout video + more is on my VaultX 😘 Link in bio.', 48),
('leslie-adult-vaultx-001', 'en_US', 'telegram', 4, 'upsell', 'Dropping something SPECIAL on VaultX tonight 🔥 If you''re not subscribed yet — tonight is the night. vaultx.com/princesadeafrica', 72),

-- VAULTX STEPS
('leslie-adult-vaultx-001', 'en_US', 'vaultx', 1, 'message', 'WELCOME to my VaultX 👑 I''m Leslie — Princesa De Africa. You made the right choice. I post here exclusively: adult fitness content, lifestyle, and everything I can''t post on TikTok or IG. New content every week. DM me anytime 😘', 0),
('leslie-adult-vaultx-001', 'en_US', 'vaultx', 2, 'upsell', 'Papi — I do custom content 😈 If you want something specific, DM me and we can talk. Prices start at $50. I aim to please 🔥', 72)

ON DUPLICATE KEY UPDATE message_text=VALUES(message_text);

-- 6. Loyalty Event — Onboarding
INSERT INTO chica_loyalty_events (
  chica_user_id, event_type, points_change, score_before, score_after,
  description, logged_by, is_public, created_at
) VALUES (
  8005, 'onboarding', 600, 0, 600,
  'Leslie (Princesa De Africa) onboarded. Adult content creator. Former Fansly. Fit body, never done fitness content. High potential — targeting gringos. VaultX + Tinder funnel active. Greatest Show Adult member.',
  6, 0, NOW()
);

-- VERIFY
SELECT 'Leslie DB setup complete' as status;
SELECT chica_user_id, chica_name, tier, tier_label, loyalty_score, status FROM chica_loyalty_profiles WHERE chica_user_id = 8005;
SELECT id, funnel_name, status FROM chica_funnels WHERE chica_user_id = 8005;
SELECT COUNT(*) as template_steps FROM chica_funnel_templates WHERE template_name = 'leslie-adult-vaultx-001';
SELECT user_id, stage_name, follower_count, status FROM greatest_show_creators WHERE user_id = 8005;
