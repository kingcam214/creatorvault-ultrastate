export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.OPENAI_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",

  // ── KingCam AI OS — Unified AI Provider Keys ──────────────────────────────
  // Replicate: kingcam214/fluxdevcam image model + SadTalker + Kokoro TTS
  replicateApiToken: process.env.REPLICATE_API_TOKEN ?? "",
  // Pollo.ai: Kling 3.0, Seedance 2.0, Wan 2.6, Vidu Q3 Pro, Pollo 3.0
  polloApiKey: process.env.POLLO_API_KEY ?? "",
};
