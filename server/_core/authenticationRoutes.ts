import type { Express } from "express";
import { registerEmailAuthRoutes } from "./emailAuthRoutes";
import { registerOAuthRoutes } from "./oauth";

/** The retired development endpoint is denied before auth handlers and SPA fallback. */
export function registerAuthenticationRoutes(app: Express): void {
  app.all("/api/dev-login", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).json({ error: "Not found" });
  });
  registerOAuthRoutes(app);
  registerEmailAuthRoutes(app);
}
