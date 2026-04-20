import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import telegramWebhook from "../telegram-webhook";
import { initializeSimulatedBots, startAutonomousConversationGenerator } from "../services/simulatedBots";
import { initializeWebRTC } from "../webrtc";
import { handleStripeWebhook } from "./stripeWebhook";
import { runStartupTasks } from "./startup";

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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
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
    await initializeSimulatedBots();
    
    // Start autonomous conversation generator
    startAutonomousConversationGenerator();
  });
}

startServer().catch(console.error);
