import express from "express";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthenticationRoutes } from "../server/_core/authenticationRoutes";
import { createContext } from "../server/_core/context";
import { publicProcedure, router } from "../server/_core/trpc";
import { setupVite } from "../server/_core/vite";
import { audioIntelligenceRouter } from "../server/routers/audioIntelligenceRouter";
import { mediaAssetsRouter } from "../server/routers/mediaAssets";
import { creatorWorkspaceRouter } from "../server/routers/creatorWorkspace";
import { trailerRouter } from "../server/routers/trailerRouter";

function localProofConfiguration(): {
  host: string;
  port: number;
  storageRoot: string;
} {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.CREATORVAULT_LOCAL_PROOF_MODE !== "1"
  ) {
    throw new Error("LOCAL_PROOF_SERVER_CONFIGURATION_REJECTED");
  }

  const host = process.env.CREATORVAULT_LOCAL_PROOF_HOST;
  const port = Number(process.env.CREATORVAULT_LOCAL_PROOF_PORT);
  const storageRoot = process.env.CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT;
  const expectedPrefix = path.join("/tmp", "creatorvault-cv-video-026-");
  if (
    host !== "127.0.0.1" ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    !storageRoot
  ) {
    throw new Error("LOCAL_PROOF_SERVER_CONFIGURATION_REJECTED");
  }
  const resolvedStorage = path.resolve(storageRoot);
  if (!resolvedStorage.startsWith(expectedPrefix)) {
    throw new Error("LOCAL_PROOF_SERVER_CONFIGURATION_REJECTED");
  }
  return { host, port, storageRoot: resolvedStorage };
}

async function start(): Promise<void> {
  const configuration = localProofConfiguration();
  const app = express();
  const useHttps = process.env.CREATORVAULT_LOCAL_PROOF_HTTPS === "1";
  const tlsDirectory = path.join(configuration.storageRoot, ".proof-tls");
  let server;
  if (useHttps) {
    const fixtureRoot = configuration.storageRoot;
    const metadata = lstatSync(fixtureRoot);
    if (
      !/^\/tmp\/creatorvault-cv-video-026-[^/]+$/.test(fixtureRoot) ||
      realpathSync(fixtureRoot) !== fixtureRoot ||
      realpathSync(configuration.storageRoot) !== configuration.storageRoot ||
      !metadata.isDirectory() ||
      metadata.isSymbolicLink() ||
      metadata.uid !== process.getuid?.() ||
      (metadata.mode & 0o077) !== 0
    ) {
      throw new Error("LOCAL_PROOF_TLS_CONFIGURATION_REJECTED");
    }
    mkdirSync(tlsDirectory, { mode: 0o700 });
    const key = path.join(tlsDirectory, "server.key");
    const cert = path.join(tlsDirectory, "server.crt");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-sha256",
        "-nodes",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-subj",
        "/CN=127.0.0.1",
        "-addext",
        "subjectAltName=IP:127.0.0.1",
      ],
      { stdio: "ignore", timeout: 10000 }
    );
    chmodSync(key, 0o600);
    chmodSync(cert, 0o600);
    server = createHttpsServer(
      { key: readFileSync(key), cert: readFileSync(cert) },
      app
    );
  } else {
    server = createServer(app);
  }
  const proofRouter = router({
    auth: router({
      me: publicProcedure.query(({ ctx }) => ctx.user),
    }),
    mediaAssets: mediaAssetsRouter,
    creatorWorkspace: creatorWorkspaceRouter,
    trailer: trailerRouter,
    audioIntelligence: audioIntelligenceRouter,
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthenticationRoutes(app);
  app.use(
    "/uploads",
    express.static(configuration.storageRoot, {
      fallthrough: false,
      dotfiles: "deny",
    })
  );
  const { videoUploadRouter } =
    await import("../server/routers/videoUploadRouter");
  app.use("/api/video/upload", videoUploadRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: proofRouter, createContext })
  );
  app.get("/__local-proof/health", (_req, res) => {
    res.status(200).json({ ok: true, mode: "cv-video-026-local-only" });
  });
  await setupVite(app, server);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(configuration.port, configuration.host, () => resolve());
  });
  process.stdout.write(
    `CV_VIDEO_026_LOCAL_PROOF_READY=${useHttps ? "https" : "http"}://${configuration.host}:${configuration.port}\n`
  );
}

void start().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "LOCAL_PROOF_SERVER_START_FAILED"}\n`
  );
  process.exitCode = 1;
});
