-- Chica Funnel System Migration
-- Creates the chica_funnels table (one funnel kit per chica)
-- and chica_funnel_steps table (the ordered message sequence per platform)

CREATE TABLE IF NOT EXISTS chica_funnels (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  chica_user_id INT NOT NULL,
  funnel_name VARCHAR(255) NOT NULL DEFAULT 'Default Funnel',
  -- Tinder profile config
  tinder_bio TEXT,
  tinder_opener TEXT,
  tinder_cta TEXT,
  -- WhatsApp config (links to whatsapp_funnels)
  whatsapp_funnel_id VARCHAR(36),
  whatsapp_provider_id VARCHAR(36),
  -- Telegram config (links to telegram_funnels)
  telegram_funnel_id VARCHAR(36),
  telegram_bot_id INT,
  -- VaultX config
  vaultx_referral_link VARCHAR(500),
  vaultx_offer_text TEXT,
  -- Locale/language
  locale ENUM('es_DO','ht_HT','en_US') NOT NULL DEFAULT 'es_DO',
  -- Status
  status ENUM('draft','active','paused') NOT NULL DEFAULT 'draft',
  provisioned_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chica_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chica_funnel_steps (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  funnel_id VARCHAR(36) NOT NULL,
  step_order INT NOT NULL,
  platform ENUM('tinder','whatsapp','telegram','vaultx') NOT NULL,
  step_type ENUM('message','delay','cta','upsell') NOT NULL DEFAULT 'message',
  message_text TEXT NOT NULL,
  delay_hours INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (funnel_id) REFERENCES chica_funnels(id) ON DELETE CASCADE
);

-- Funnel template table — ready-made templates per locale
CREATE TABLE IF NOT EXISTS chica_funnel_templates (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(255) NOT NULL,
  locale ENUM('es_DO','ht_HT','en_US') NOT NULL DEFAULT 'es_DO',
  platform ENUM('tinder','whatsapp','telegram','vaultx') NOT NULL,
  step_order INT NOT NULL,
  step_type ENUM('message','delay','cta','upsell') NOT NULL DEFAULT 'message',
  message_text TEXT NOT NULL,
  delay_hours INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Dominican Spanish funnel templates (Tinder → WhatsApp → Telegram → VaultX)

-- TINDER STEPS (es_DO)
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Dominican Chica Funnel', 'es_DO', 'tinder', 1, 'message', 'Hola papi 😘 Soy {name}, de {city}. Tengo mi propio negocio digital y busco personas interesantes. ¿Tienes WhatsApp?', 0),
('Dominican Chica Funnel', 'es_DO', 'tinder', 2, 'cta', 'Escríbeme directo al WhatsApp: {whatsapp_number} — ahí te cuento todo 🔥', 0);

-- WHATSAPP STEPS (es_DO)
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 1, 'message', 'Hola! Soy {name} 😊 Gracias por escribirme. Tengo contenido exclusivo y una comunidad VIP en Telegram. ¿Te interesa?', 0),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 2, 'delay', '', 1),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 3, 'cta', 'Aquí está mi canal privado de Telegram donde comparto todo: {telegram_link} 🔒 Únete antes de que llene.', 1),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 4, 'delay', '', 24),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 5, 'upsell', 'Papi, también puedes apoyarme directamente en mi Vault y acceder a contenido que no comparto en ningún otro lado 👑 {vaultx_link}', 24);

-- TELEGRAM STEPS (es_DO)
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Dominican Chica Funnel', 'es_DO', 'telegram', 1, 'message', 'Bienvenido a mi canal privado 🔥 Soy {name}. Aquí comparto todo lo que no puedo poner en redes. Quédate.', 0),
('Dominican Chica Funnel', 'es_DO', 'telegram', 2, 'delay', '', 2),
('Dominican Chica Funnel', 'es_DO', 'telegram', 3, 'upsell', 'Para el contenido más exclusivo y para apoyarme directo, entra a mi Vault: {vaultx_link} 👑 Solo para los que de verdad quieren estar cerca.', 2);

-- VAULTX STEPS (es_DO)
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Dominican Chica Funnel', 'es_DO', 'vaultx', 1, 'message', 'Gracias por unirte a mi Vault 🙏 Aquí tienes acceso a todo mi contenido premium. Soy {name} y esto es solo el comienzo.', 0),
('Dominican Chica Funnel', 'es_DO', 'vaultx', 2, 'upsell', 'También puedes unirte a mi equipo y ganar dinero conmigo. Regístrate aquí: {referral_link} 💰', 48);

-- HAITIAN CREOLE funnel templates (ht_HT)
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Haitian Chica Funnel', 'ht_HT', 'tinder', 1, 'message', 'Bonjou bèl 😘 Mwen se {name}, mwen soti {city}. Mwen gen yon biznis dijital. Eske ou gen WhatsApp?', 0),
('Haitian Chica Funnel', 'ht_HT', 'tinder', 2, 'cta', 'Ekri m dirèkteman sou WhatsApp: {whatsapp_number} — m ap eksplike ou tout bagay 🔥', 0),
('Haitian Chica Funnel', 'ht_HT', 'whatsapp', 1, 'message', 'Bonjou! Mwen se {name} 😊 Mèsi pou ekri m. Mwen gen yon kominote VIP sou Telegram. Eske ou enterese?', 0),
('Haitian Chica Funnel', 'ht_HT', 'whatsapp', 2, 'cta', 'Men lyen prive Telegram mwen kote mwen pataje tout bagay: {telegram_link} 🔒', 1),
('Haitian Chica Funnel', 'ht_HT', 'whatsapp', 3, 'upsell', 'Ou ka sipòte m dirèkteman nan Vault mwen: {vaultx_link} 👑', 24),
('Haitian Chica Funnel', 'ht_HT', 'telegram', 1, 'message', 'Byenveni nan kanal prive mwen 🔥 Mwen se {name}. Rete avèk mwen.', 0),
('Haitian Chica Funnel', 'ht_HT', 'telegram', 2, 'upsell', 'Pou kontni ki pi eksklusif la, antre nan Vault mwen: {vaultx_link} 👑', 2),
('Haitian Chica Funnel', 'ht_HT', 'vaultx', 1, 'message', 'Mèsi pou rejwenn Vault mwen 🙏 Mwen se {name} epi sa se kòmansman an sèlman.', 0),
('Haitian Chica Funnel', 'ht_HT', 'vaultx', 2, 'upsell', 'Ou ka rejwenn ekip mwen epi fè lajan avèk mwen: {referral_link} 💰', 48);
