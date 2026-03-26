-- ============================================================
-- Chica Funnel Templates Update
-- Individualized funnels for each chica based on their business model
-- ============================================================

-- Clear old generic templates (keep Haitian template, update Dominican)
DELETE FROM chica_funnel_templates WHERE template_name = 'Dominican Chica Funnel';

-- ============================================================
-- TEMPLATE 1: Dominican Chica Funnel (Marielka / China2 - Adult Content)
-- Tinder -> WhatsApp -> Telegram -> VaultX
-- ============================================================
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Dominican Chica Funnel', 'es_DO', 'tinder', 1, 'message', 'Hola papi 😘 Soy {name}, de {city}. Tengo contenido exclusivo que no encontrarás en ningún otro lado. Escríbeme.', 0),
('Dominican Chica Funnel', 'es_DO', 'tinder', 2, 'cta', 'Escríbeme directo al WhatsApp: {whatsapp_number} — ahí te muestro todo 🔥', 0),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 1, 'message', 'Hola! Soy {name} 😊 Gracias por escribirme. Tengo contenido exclusivo en mi Vault que te va a encantar.', 0),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 2, 'message', 'Aquí está mi canal privado de Telegram donde comparto todo: {telegram_link} 🔒 Únete gratis.', 24),
('Dominican Chica Funnel', 'es_DO', 'whatsapp', 3, 'message', 'Papi, también puedes apoyarme directamente en mi Vault y acceder a contenido que no muestro en ningún otro lado: {vaultx_link} 👑', 72),
('Dominican Chica Funnel', 'es_DO', 'telegram', 1, 'message', 'Bienvenido a mi canal privado 🔥 Soy {name}. Aquí comparto todo lo que no puedo poner en Instagram.', 0),
('Dominican Chica Funnel', 'es_DO', 'telegram', 2, 'message', 'Para el contenido más exclusivo y para apoyarme directo, entra a mi Vault: {vaultx_link} 💎', 48),
('Dominican Chica Funnel', 'es_DO', 'vaultx', 1, 'message', 'Gracias por unirte a mi Vault 🙏 Aquí tienes acceso a todo mi contenido premium. Eres especial para mí.', 0),
('Dominican Chica Funnel', 'es_DO', 'vaultx', 2, 'upsell', 'También puedes ganar dinero conmigo refiriendo personas. Regístrate aquí: {referral_link} 💰', 168);

-- ============================================================
-- TEMPLATE 2: Delbania Funnel (Fitness + Boutique - No Adult Content)
-- Instagram/TikTok -> WhatsApp -> Telegram -> Boutique/Fitness Guide
-- ============================================================
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Delbania Boutique Funnel', 'es_DO', 'tinder', 1, 'message', 'Hola amor 😘 Soy {name}. Me encanta el fitness, la moda y la vida sana. Tengo una boutique de cabello y extensiones premium. Escríbeme 💪', 0),
('Delbania Boutique Funnel', 'es_DO', 'tinder', 2, 'cta', 'Escríbeme al WhatsApp: {whatsapp_number} y te muestro mi boutique y mis rutinas 🌟', 0),
('Delbania Boutique Funnel', 'es_DO', 'whatsapp', 1, 'message', 'Hola! Soy {name} 💪 Gracias por escribirme. Aquí comparto mis rutinas de fitness, mi estilo de vida como madre soltera y los mejores productos de mi boutique de cabello.', 0),
('Delbania Boutique Funnel', 'es_DO', 'whatsapp', 2, 'message', 'Únete a mi canal VIP de Telegram donde comparto mis secretos de belleza, fitness y las nuevas llegadas de mi boutique: {telegram_link} 💄', 24),
('Delbania Boutique Funnel', 'es_DO', 'whatsapp', 3, 'message', 'Si quieres las mejores extensiones de cabello premium, visita mi boutique: {custom_link} 👑 Envío disponible.', 72),
('Delbania Boutique Funnel', 'es_DO', 'telegram', 1, 'message', 'Bienvenidos a mi espacio VIP 🔥 Soy {name}. Aquí les muestro mis rutinas de fitness, mi estilo de vida y las extensiones de cabello más exclusivas del mercado.', 0),
('Delbania Boutique Funnel', 'es_DO', 'telegram', 2, 'message', '¿Quieres lucir increíble? Mira las extensiones premium en mi boutique y mis guías de fitness: {custom_link} ✨', 48),
('Delbania Boutique Funnel', 'es_DO', 'vaultx', 1, 'message', 'Gracias por el apoyo 🙏 Aquí tienes acceso a mis guías de fitness exclusivas y descuentos especiales en la boutique. Tú eres VIP.', 0),
('Delbania Boutique Funnel', 'es_DO', 'vaultx', 2, 'upsell', 'Refiere a tus amigas y gana descuentos en la boutique: {referral_link} 💰', 168);

-- ============================================================
-- TEMPLATE 3: Lizzy Fitness Funnel (Sexy Fitness - No Adult Content)
-- Instagram/TikTok -> WhatsApp -> Telegram -> Fitness Plans
-- ============================================================
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Lizzy Fitness Funnel', 'es_DO', 'tinder', 1, 'message', 'Hola papi 😘 Soy {name}. Me encanta el fitness y cuidarme. Si quieres ver mis rutinas y mi estilo de vida, escríbeme 🏋️‍♀️', 0),
('Lizzy Fitness Funnel', 'es_DO', 'tinder', 2, 'cta', 'Escríbeme al WhatsApp: {whatsapp_number} y te comparto mis rutinas 🔥', 0),
('Lizzy Fitness Funnel', 'es_DO', 'whatsapp', 1, 'message', 'Hola! Soy {name} 🍑 Gracias por escribirme. Aquí comparto mi día a día, mis entrenamientos y cómo me mantengo en forma siendo mamá soltera.', 0),
('Lizzy Fitness Funnel', 'es_DO', 'whatsapp', 2, 'message', 'Para ver mis rutinas exclusivas y contenido de estilo de vida, únete a mi Telegram: {telegram_link} 💪', 24),
('Lizzy Fitness Funnel', 'es_DO', 'whatsapp', 3, 'message', 'Consigue mi plan de entrenamiento completo y empieza a transformar tu cuerpo: {custom_link} 🔥', 72),
('Lizzy Fitness Funnel', 'es_DO', 'telegram', 1, 'message', 'Bienvenidos a mi canal privado 🔥 Soy {name}. Aquí comparto mis entrenamientos más intensos, mi dieta y mi vida diaria.', 0),
('Lizzy Fitness Funnel', 'es_DO', 'telegram', 2, 'message', 'Consigue mis planes de entrenamiento personalizados y contenido exclusivo aquí: {custom_link} 💪', 48),
('Lizzy Fitness Funnel', 'es_DO', 'vaultx', 1, 'message', 'Gracias por unirte a mi comunidad VIP 🙏 Aquí tienes mis mejores rutinas de fitness y acceso directo a mí para preguntas.', 0),
('Lizzy Fitness Funnel', 'es_DO', 'vaultx', 2, 'upsell', 'Refiere a tus amigos y gana acceso a mis planes premium: {referral_link} 💰', 168);

-- ============================================================
-- TEMPLATE 4: Lirys Airbnb Funnel (Airbnb + Lifestyle)
-- Instagram/TikTok -> WhatsApp -> Telegram -> Airbnb Bookings
-- ============================================================
INSERT INTO chica_funnel_templates (template_name, locale, platform, step_order, step_type, message_text, delay_hours) VALUES
('Lirys Airbnb Funnel', 'es_DO', 'tinder', 1, 'message', 'Hola 😘 Soy {name}. Si buscas el mejor lugar para quedarte en la República Dominicana o simplemente quieres conocer mi estilo de vida, escríbeme 🌴', 0),
('Lirys Airbnb Funnel', 'es_DO', 'tinder', 2, 'cta', 'Escríbeme al WhatsApp: {whatsapp_number} y te cuento sobre mi Airbnb y mi vida aquí 🏖️', 0),
('Lirys Airbnb Funnel', 'es_DO', 'whatsapp', 1, 'message', 'Hola! Soy {name} 🌴 Gracias por escribirme. Si vienes de viaje a la RD, tengo el Airbnb perfecto para ti. Cómodo, bonito y en la mejor ubicación.', 0),
('Lirys Airbnb Funnel', 'es_DO', 'whatsapp', 2, 'message', 'Únete a mi canal para ver mi estilo de vida, fotos del Airbnb y ofertas exclusivas: {telegram_link} 🏠', 24),
('Lirys Airbnb Funnel', 'es_DO', 'whatsapp', 3, 'message', '¿Listo para reservar? Aquí está mi Airbnb: {custom_link} 🌟 Menciona que vienes de mi WhatsApp y te doy un descuento especial.', 72),
('Lirys Airbnb Funnel', 'es_DO', 'telegram', 1, 'message', 'Bienvenidos a mi canal 🔥 Soy {name}. Aquí comparto mi vida, los mejores momentos en mis propiedades y ofertas exclusivas para mis seguidores.', 0),
('Lirys Airbnb Funnel', 'es_DO', 'telegram', 2, 'message', '¿Buscas dónde quedarte en la RD? Reserva mi Airbnb aquí y vive la experiencia: {custom_link} 🏖️', 48),
('Lirys Airbnb Funnel', 'es_DO', 'vaultx', 1, 'message', 'Gracias por tu apoyo 🙏 Como miembro VIP tienes descuentos exclusivos en mis propiedades y acceso a mi contenido de estilo de vida.', 0),
('Lirys Airbnb Funnel', 'es_DO', 'vaultx', 2, 'upsell', 'Invita a tus amigos a quedarse en mi Airbnb y gana comisión: {referral_link} 💰', 168);

-- ============================================================
-- Update chica_funnels with correct funnel names per chica
-- ============================================================
UPDATE chica_funnels SET funnel_name = 'Delbania Boutique & Fitness Funnel' WHERE chica_user_id = 8001;
UPDATE chica_funnels SET funnel_name = 'Marielka VaultX Adult Funnel' WHERE chica_user_id = 8002;
UPDATE chica_funnels SET funnel_name = 'Lizzy Sexy Fitness Funnel' WHERE chica_user_id = 8003;
UPDATE chica_funnels SET funnel_name = 'Lirys Airbnb & Lifestyle Funnel' WHERE chica_user_id = 8004;

-- ============================================================
-- Update Tinder bios per chica
-- ============================================================
UPDATE chica_funnels SET
  tinder_bio = '💪 Fitness lover | Mamá orgullosa | Dueña de boutique de cabello premium | Vivo la vida al máximo 🌟',
  tinder_opener = 'Hola amor 😘 Me llamo Delbania. Tengo una boutique de cabello y me encanta el fitness. ¿Qué te trajo por aquí?',
  tinder_cta = 'Escríbeme al WhatsApp y te muestro mi boutique 💄',
  vaultx_referral_link = 'https://creatorvault.live/ref/8001',
  vaultx_offer_text = 'Guías de fitness exclusivas + descuentos en boutique de cabello premium'
WHERE chica_user_id = 8001;

UPDATE chica_funnels SET
  tinder_bio = '🔥 Contenido exclusivo | Solo para mentes abiertas | La China más hot de Sosua 😈 | VaultX: {vaultx_link}',
  tinder_opener = 'Hola papi 😘 Soy China. Tengo contenido que no encontrarás en ningún otro lado. ¿Te atreves?',
  tinder_cta = 'Escríbeme al WhatsApp y te muestro todo 🔥',
  vaultx_referral_link = 'https://creatorvault.live/ref/8002',
  vaultx_offer_text = 'Contenido adulto exclusivo + acceso VIP a mi Vault'
WHERE chica_user_id = 8002;

UPDATE chica_funnels SET
  tinder_bio = '🏋️‍♀️ Fitness freak | Mamá soltera y orgullosa | Estilo de vida saludable | Contenido de fitness que te va a motivar 💪',
  tinder_opener = 'Hola papi 😘 Soy Lizzy. Me encanta el fitness y cuidarme. ¿Quieres ver mis rutinas?',
  tinder_cta = 'Escríbeme al WhatsApp y te comparto mis rutinas de fitness 🔥',
  vaultx_referral_link = 'https://creatorvault.live/ref/8003',
  vaultx_offer_text = 'Planes de entrenamiento personalizados + acceso a mi comunidad fitness'
WHERE chica_user_id = 8003;

UPDATE chica_funnels SET
  tinder_bio = '🌴 Dominicana | Airbnb host en la RD | Estilo de vida de lujo | Si vienes a visitar, yo tengo el lugar perfecto 🏖️',
  tinder_opener = 'Hola 😘 Soy Lirys. Si vienes a la RD, tengo el Airbnb más bonito para ti. ¿Cuándo llegas?',
  tinder_cta = 'Escríbeme al WhatsApp y te muestro mi Airbnb 🏠',
  vaultx_referral_link = 'https://creatorvault.live/ref/8004',
  vaultx_offer_text = 'Descuentos exclusivos en Airbnb + contenido de estilo de vida en la RD'
WHERE chica_user_id = 8004;

-- ============================================================
-- Clear old generic steps and re-provision with correct templates
-- ============================================================
DELETE FROM chica_funnel_steps WHERE funnel_id IN (
  SELECT id FROM chica_funnels WHERE chica_user_id IN (8001, 8003, 8004)
);

-- Re-provision Delbania (8001) steps from Delbania Boutique Funnel template
INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours, is_active)
SELECT 
  (SELECT id FROM chica_funnels WHERE chica_user_id = 8001),
  step_order, platform, step_type, message_text, delay_hours, 1
FROM chica_funnel_templates
WHERE template_name = 'Delbania Boutique Funnel'
ORDER BY platform, step_order;

-- Re-provision Lizzy (8003) steps from Lizzy Fitness Funnel template
INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours, is_active)
SELECT 
  (SELECT id FROM chica_funnels WHERE chica_user_id = 8003),
  step_order, platform, step_type, message_text, delay_hours, 1
FROM chica_funnel_templates
WHERE template_name = 'Lizzy Fitness Funnel'
ORDER BY platform, step_order;

-- Re-provision Lirys (8004) steps from Lirys Airbnb Funnel template
INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours, is_active)
SELECT 
  (SELECT id FROM chica_funnels WHERE chica_user_id = 8004),
  step_order, platform, step_type, message_text, delay_hours, 1
FROM chica_funnel_templates
WHERE template_name = 'Lirys Airbnb Funnel'
ORDER BY platform, step_order;

-- Verify
SELECT cf.chica_user_id, cf.funnel_name, cf.tinder_bio, cf.status FROM chica_funnels cf ORDER BY chica_user_id;
SELECT COUNT(*) as total_steps_per_chica, funnel_id FROM chica_funnel_steps GROUP BY funnel_id;
