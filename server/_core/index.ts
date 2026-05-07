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
import { registerTelegramConnectRoutes } from "../services/telegramConnectRoute";
import { startDailyDropCron } from "../services/telegramDailyDropEngine";
import { startReactivationCron } from "../services/telegramBuyerReactivation";

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
  startDailyDropCron();
  startReactivationCron();
  
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
  // Telegram connect page + status API
  registerTelegramConnectRoutes(app as any);

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
      (async () => {
        try {
          await conn.query(
            "INSERT INTO attribution_events (tracking_code, distribution_job_id, creator_id, content_id, channel_identity_id, platform, event_type, session_id, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, 'click', ?, ?, ?)",
            [trackingCode, job.id, job.creator_id, job.content_id || null, job.channel_identity_id, job.platform, sessionId, ipHash, userAgent]
          );
          await conn.query("UPDATE distribution_jobs SET click_count = click_count + 1 WHERE id = ?", [job.id]);
        } catch (e: any) {
          console.warn("[attribution] click record failed:", e.message);
        } finally {
          attrPool.end();
        }
      })();
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

    // ── Telegram Funnel Automation Runner ────────────────────────────────────
    // Process due funnel steps, drip sequences, and re-engagement triggers
    // Runs every 60 seconds
    setInterval(async () => {
      try {
        const mysql2 = await import("mysql2/promise");
        const dbUrl = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
        const m = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
        if (!m) return;
        const [, user, password, host, port, database] = m;
        const conn = await mysql2.default.createConnection({ host, port: parseInt(port), user, password, database });
        
        // Count pending jobs
        const [pending] = await conn.execute(
          "SELECT COUNT(*) as cnt FROM telegram_automation_jobs WHERE status = 'pending' AND scheduled_at <= NOW()"
        ) as any;
        const pendingCount = (pending as any[])[0]?.cnt || 0;
        
        if (pendingCount > 0) {
          console.log(`[TelegramFunnel] Processing ${pendingCount} due automation jobs`);
          // Delegate to telegramFunnelRouter.funnel.processAllDue logic inline
          const [jobs] = await conn.execute(
            `SELECT aj.*, ts.telegram_id, tfs.message_text, tfs.media_url, tfs.media_type, 
                    tfs.inline_buttons, tfs.step_number, tfs.delay_minutes as next_delay,
                    tfe.id as enrollment_id, tfe.funnel_id as enroll_funnel_id
             FROM telegram_automation_jobs aj
             JOIN telegram_subscribers ts ON ts.id = aj.subscriber_id
             JOIN telegram_funnel_steps tfs ON tfs.id = aj.funnel_step_id
             JOIN telegram_funnel_enrollments tfe ON tfe.funnel_id = aj.funnel_id AND tfe.subscriber_id = aj.subscriber_id
             WHERE aj.status = 'pending' AND aj.scheduled_at <= NOW()
             LIMIT 50`
          ) as any;
          
          const botToken = process.env.TELEGRAM_MONETIZATION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
          
          for (const job of (jobs as any[])) {
            try {
              await conn.execute("UPDATE telegram_automation_jobs SET status = 'running' WHERE id = ?", [job.id]);
              const buttons = job.inline_buttons ? (typeof job.inline_buttons === 'string' ? JSON.parse(job.inline_buttons) : (Array.isArray(job.inline_buttons) ? job.inline_buttons : [])) : [];
              const body: any = { chat_id: job.telegram_id, parse_mode: "HTML" };
              
              if (job.media_url && job.media_type === "video") {
                body.video = job.media_url;
                body.caption = job.message_text;
                if (buttons.length) body.reply_markup = { inline_keyboard: [buttons] };
                const r = await fetch(`https://api.telegram.org/bot\${botToken}/sendVideo`, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
                });
                const d = await r.json() as any;
                if (!d.ok) throw new Error(d.description);
              } else if (job.message_text) {
                body.text = job.message_text;
                if (buttons.length) body.reply_markup = { inline_keyboard: [buttons] };
                const r = await fetch(`https://api.telegram.org/bot\${botToken}/sendMessage`, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
                });
                const d = await r.json() as any;
                if (!d.ok) throw new Error(d.description);
              }
              
              await conn.execute("UPDATE telegram_automation_jobs SET status = 'done', executed_at = NOW() WHERE id = ?", [job.id]);
              
              // Advance to next step
              const [nextSteps] = await conn.execute(
                "SELECT * FROM telegram_funnel_steps WHERE funnel_id = ? AND step_number > ? ORDER BY step_number ASC LIMIT 1",
                [job.funnel_id, job.step_number]
              ) as any;
              const nextStep = (nextSteps as any[])[0];
              
              if (nextStep) {
                const nextAt = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60000);
                await conn.execute(
                  "UPDATE telegram_funnel_enrollments SET current_step = ?, next_step_at = ? WHERE id = ?",
                  [nextStep.step_number, nextAt, job.enrollment_id]
                );
                await conn.execute(
                  "INSERT INTO telegram_automation_jobs (job_type, funnel_id, funnel_step_id, subscriber_id, scheduled_at) VALUES ('drip_step', ?, ?, ?, ?)",
                  [job.funnel_id, nextStep.id, job.subscriber_id, nextAt]
                );
              } else {
                await conn.execute(
                  "UPDATE telegram_funnel_enrollments SET status = 'completed', completed_at = NOW() WHERE id = ?",
                  [job.enrollment_id]
                );
              }
            } catch (jobErr: any) {
              await conn.execute(
                "UPDATE telegram_automation_jobs SET status = 'failed', error_message = ? WHERE id = ?",
                [jobErr.message, job.id]
              );
            }
          }
        }
        
        // Re-engagement: find subscribers inactive > 7 days who haven't been messaged in 3 days
        const [inactive] = await conn.execute(
          `SELECT ts.telegram_id FROM telegram_subscribers ts
           WHERE ts.lifecycle_stage IN ('engaged', 'converted')
             AND ts.last_active_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
             AND ts.opted_out = 0
             AND NOT EXISTS (
               SELECT 1 FROM telegram_message_events tme 
               WHERE tme.telegram_id = ts.telegram_id 
                 AND tme.direction = 'outbound'
                 AND tme.created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
             )
           LIMIT 10`
        ) as any;
        
        const FRONTEND = process.env.VITE_FRONTEND_FORGE_API_URL?.replace("/api", "") || "https://creatorvault.live";
        for (const sub of (inactive as any[])) {
          try {
            const reengageMsg = {
              chat_id: sub.telegram_id,
              text: `⚡ <b>New drops just landed in VaultX</b>\n\nYou\'ve been missed. Fresh exclusive content is waiting for you.\n\n👇 Tap to see what\'s new`,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[
                  { text: "🎬 See New Drops", url: `\${FRONTEND}/vaultx` },
                  { text: "🔓 Unlock Now", url: `\${FRONTEND}/vaultx` }
                ]]
              }
            };
            await fetch(`https://api.telegram.org/bot\${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reengageMsg)
            });
            // Log outbound message
            await conn.execute(
              "INSERT INTO telegram_message_events (telegram_id, direction, message_type, message_text) VALUES (?, 'outbound', 'reengagement', 'Re-engagement message sent')",
              [sub.telegram_id]
            );
          } catch { /* non-blocking */ }
        }
        
        await conn.end();
      } catch (cronErr: any) {
        console.error("[TelegramFunnel] Cron error:", cronErr.message);
      }
    }, 60000); // Every 60 seconds
    // ── End Telegram Funnel Automation Runner ─────────────────────────────────

    // DISABLED 2026-04-20: fake traffic generator was creating 97% fake bot_events // await initializeSimulatedBots();
    
    // Start autonomous conversation generator
    // DISABLED 2026-04-20: see above // startAutonomousConversationGenerator();
  });
}

startServer().catch(console.error);
