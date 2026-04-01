"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
exports.ENV = {
    appId: (_a = process.env.VITE_APP_ID) !== null && _a !== void 0 ? _a : "",
    cookieSecret: (_b = process.env.JWT_SECRET) !== null && _b !== void 0 ? _b : "",
    databaseUrl: (_c = process.env.DATABASE_URL) !== null && _c !== void 0 ? _c : "",
    oAuthServerUrl: (_d = process.env.OAUTH_SERVER_URL) !== null && _d !== void 0 ? _d : "",
    ownerOpenId: (_e = process.env.OWNER_OPEN_ID) !== null && _e !== void 0 ? _e : "",
    isProduction: process.env.NODE_ENV === "production",
    forgeApiUrl: (_f = process.env.BUILT_IN_FORGE_API_URL) !== null && _f !== void 0 ? _f : "",
    forgeApiKey: (_g = process.env.OPENAI_API_KEY) !== null && _g !== void 0 ? _g : "",
    stripeSecretKey: (_h = process.env.STRIPE_SECRET_KEY) !== null && _h !== void 0 ? _h : "",
    stripeWebhookSecret: (_j = process.env.STRIPE_WEBHOOK_SECRET) !== null && _j !== void 0 ? _j : "",
    telegramBotToken: (_k = process.env.TELEGRAM_BOT_TOKEN) !== null && _k !== void 0 ? _k : "",
};
