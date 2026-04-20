// server/_core/emailAuthRoutes.ts
// Email+password login + logout endpoints using localAuth.ts.
// Wired into Express in server/_core/index.ts.
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import {
  findLocalAuthUserByEmail,
  verifyLocalPassword,
  markUserSignedIn,
  getSessionDurations,
  getSessionDisplayName,
} from "./localAuth";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function parseBody(req: Request): { email?: string; password?: string; rememberMe?: boolean } {
  const b = (req.body ?? {}) as Record<string, unknown>;
  return {
    email: typeof b.email === "string" ? b.email : undefined,
    password: typeof b.password === "string" ? b.password : undefined,
    rememberMe: typeof b.rememberMe === "boolean" ? b.rememberMe : false,
  };
}

export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password, rememberMe } = parseBody(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const user = await findLocalAuthUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const ok = await verifyLocalPassword(user, password);
      if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.openId) {
        return res.status(500).json({ error: "User account is missing an openId. Contact support." });
      }

      const { expiresInMs, cookieMaxAge } = getSessionDurations(Boolean(rememberMe));
      const name = getSessionDisplayName(user);

      const token = await sdk.createSessionToken(user.openId, {
        expiresInMs,
        name,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: cookieMaxAge ?? expiresInMs,
      });

      await markUserSignedIn(user.id);

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name,
          role: user.role ?? "user",
        },
      });
    } catch (err) {
      console.error("[auth/login] error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[auth/logout] error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
