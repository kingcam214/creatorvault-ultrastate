import "dotenv/config";
import express from "express";
import { db } from "../db";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerEmailAuthRoutes } from "./emailAuthRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import telegramWebhook from "../telegram-webhook";
import { initializeSimulatedBots, startAutonomousConversationGenerator } from "../services/simulatedBots";
import { initializeWebRTC } from "../webrtc";
import { handleStripeWebhook } from "./stripeWebhook";
import { runStartupTasks } from "./startup";
import videoStudioRouter from "../routers/videoStudioRouter";
import { videoUploadRouter } from "../routers/videoUploadRouter";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Run startup tasks (schema bootstrap, etc)
  await runStartupTasks();
  
  const app = express();
  const server = createServer(app);
  
  // Stripe webhook MUST come BEFORE body parser (needs raw body)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Email + password login (POST /api/auth/login)
  registerEmailAuthRoutes(app);
  // Temporary dev login for testing
  app.get("/api/dev-login", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const { getSessionCookieOptions } = await import("./cookies");
      const { COOKIE_NAME, ONE_YEAR_MS } = await import("../../shared/const");
      const token = await sdk.createSessionToken("local_kingcam_6", { name: "Cameron White" });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const redirectTo = (req.query.redirect as string) || "/";
      res.redirect(302, redirectTo);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });
  
  // Telegram webhook
  app.use("/api/telegram", telegramWebhook);
  // VaultX Video Studio REST endpoints (FFmpeg processing)
  app.use("/api/video-studio", videoStudioRouter);
  // VaultX Content Vault chunked upload
  app.use("/api/video/upload", videoUploadRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Attribution tracking redirect — /r/:trackingCode
  // Records click event in attribution_events and redirects to destination URL
  app.get("/r/:trackingCode", async (req, res) => {
    const { trackingCode } = req.params;
    const fallback = "https://creatorvault.live/vaultx";
    try {
      // Use mysql2 createPool directly — drizzle.$client is not accessible at runtime
      const mysql2 = await import("mysql2");
      const attrPool = mysql2.createPool(process.env.DATABASE_URL as string);
      const conn = attrPool.promise();
      const [jobRows] = await conn.query(
        "SELECT destination_url, id, creator_id, content_id, channel_identity_id, platform FROM distribution_jobs WHERE tracking_code = ? LIMIT 1",
        [trackingCode]
      ) as any;
      const jobs = jobRows as any[];
      if (!jobs.length) {
        attrPool.end();
        return res.redirect(302, fallback);
      }
      const job = jobs[0];
      const destUrl = job.destination_url || fallback;
      // Record click event asynchronously (don't block redirect)
      const sessionId = (req.headers["x-session-id"] as string) || null;
      const ipRaw = req.ip || req.socket.remoteAddress || "";
      const crypto = await import("crypto");
      const ipHash = crypto.createHash("sha256").update(ipRaw + (process.env.SESSION_SECRET || "vaultx")).digest("hex").slice(0, 64);
      const userAgent = (req.headers["user-agent"] || "").slice(0, 500);
      conn.query(
        "INSERT INTO attribution_events (tracking_code, distribution_job_id, creator_id, content_id, channel_identity_id, platform, event_type, session_id, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, 'click', ?, ?, ?)",
        [trackingCode, job.id, job.creator_id, job.content_id || null, job.channel_identity_id, job.platform, sessionId, ipHash, userAgent]
      ).then(() => {
        conn.query("UPDATE distribution_jobs SET click_count = click_count + 1 WHERE id = ?", [job.id]).catch(() => {});
        attrPool.end();
      }).catch((e: any) => {
        console.warn("[attribution] click insert failed:", e.message);
        attrPool.end();
      });
      return res.redirect(302, destUrl);
    } catch (err: any) {
      console.warn("[attribution] redirect error:", err.message);
      return res.redirect(302, fallback);
    }
  });

  // Durable uploads directory — persists across frontend redeployments
  const durableUploadsDir = path.resolve(process.cwd(), "..", "uploads");
  if (!existsSync(durableUploadsDir)) {
    mkdirSync(durableUploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(durableUploadsDir, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  }));

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = preferredPort;


  // Initialize WebRTC signaling server
  initializeWebRTC(server);

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize simulated bots (no owner dependencies)
    // DISABLED 2026-04-20: fake traffic generator was creating 97% fake bot_events // await initializeSimulatedBots();
    
    // Start autonomous conversation generator
    // DISABLED 2026-04-20: see above // startAutonomousConversationGenerator();
  });
}

startServer().catch(console.error);
