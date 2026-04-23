/**
 * King Console — Backend Server
 * Wraps Gemini CLI for CreatorVault local prompt execution.
 * Usage: node server.js
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const PORT = 4242;
const REPO_ROOT = path.resolve(__dirname, "../..");
const PROFILES_DIR = path.join(__dirname, "profiles");
const OUTPUT_DIR = path.join(__dirname, "output");

// Load .env if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

// Active run state
let activeRun = null;
let runLog = [];
let runStatus = "idle"; // idle | running | done | error

function loadProfile(name) {
  const file = path.join(PROFILES_DIR, `${name}.md`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  return "";
}

function serveFile(res, filePath, contentType) {
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function appendLog(line) {
  runLog.push({ ts: Date.now(), text: line });
  // Keep last 2000 lines
  if (runLog.length > 2000) runLog = runLog.slice(-2000);
}

async function runGeminiTask({ prompt, profile, verifyAfter }) {
  if (runStatus === "running") return { error: "A task is already running." };

  runStatus = "running";
  runLog = [];
  appendLog(`[KING CONSOLE] Starting task — profile: ${profile}`);
  appendLog(`[KING CONSOLE] Repo: ${REPO_ROOT}`);

  const profileText = loadProfile(profile);
  const fullPrompt = profileText
    ? `${profileText}\n\n---\n\nTASK:\n${prompt}`
    : prompt;

  appendLog(`[GEMINI] Launching with --yolo --prompt ...`);

  const geminiPath = process.env.GEMINI_PATH || "gemini";
  const env = { ...process.env };
  if (process.env.GEMINI_API_KEY) env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  return new Promise((resolve) => {
    const child = spawn(
      geminiPath,
      ["--yolo", "--output-format", "text", "--prompt", fullPrompt],
      {
        cwd: REPO_ROOT,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    child.stdout.on("data", (d) => {
      const text = d.toString();
      text.split("\n").filter(Boolean).forEach(appendLog);
    });

    child.stderr.on("data", (d) => {
      const text = d.toString();
      text.split("\n").filter(Boolean).forEach((l) => appendLog(`[stderr] ${l}`));
    });

    child.on("close", async (code) => {
      appendLog(`[GEMINI] Exited with code ${code}`);

      // Collect changed files from git
      let changedFiles = [];
      try {
        const diff = execSync("git diff --name-only HEAD", { cwd: REPO_ROOT }).toString().trim();
        const untracked = execSync("git ls-files --others --exclude-standard", { cwd: REPO_ROOT }).toString().trim();
        changedFiles = [...diff.split("\n"), ...untracked.split("\n")].filter(Boolean);
      } catch (e) {
        appendLog(`[git] Could not get changed files: ${e.message}`);
      }

      if (changedFiles.length > 0) {
        appendLog(`[git] Changed files: ${changedFiles.join(", ")}`);
      } else {
        appendLog(`[git] No file changes detected.`);
      }

      // Post-run verification
      let buildResult = null;
      let screenshotPath = null;

      if (verifyAfter) {
        appendLog(`[VERIFY] Running build...`);
        try {
          const buildOut = execSync("npx vite build 2>&1 | tail -8", {
            cwd: REPO_ROOT,
            timeout: 180000,
            env,
          }).toString();
          buildResult = { success: true, output: buildOut };
          appendLog(`[VERIFY] Build succeeded.`);
          buildOut.split("\n").filter(Boolean).forEach((l) => appendLog(`[build] ${l}`));
        } catch (e) {
          buildResult = { success: false, output: e.message };
          appendLog(`[VERIFY] Build FAILED: ${e.message}`);
        }
      }

      // Save summary JSON
      const summary = {
        ts: new Date().toISOString(),
        profile,
        prompt: prompt.slice(0, 500),
        exitCode: code,
        changedFiles,
        buildResult,
        screenshotPath,
        logLines: runLog.length,
      };
      const summaryPath = path.join(OUTPUT_DIR, `run-${Date.now()}.json`);
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      appendLog(`[KING CONSOLE] Summary saved: ${summaryPath}`);

      runStatus = code === 0 ? "done" : "error";
      resolve({ ok: true, exitCode: code, changedFiles, buildResult, summaryPath });
    });

    child.on("error", (err) => {
      appendLog(`[ERROR] Failed to start Gemini CLI: ${err.message}`);
      appendLog(`[HINT] Make sure 'gemini' is installed: npm install -g @google/gemini-cli`);
      runStatus = "error";
      resolve({ error: err.message });
    });

    activeRun = child;
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }

  // Serve static UI
  if (req.method === "GET" && url.pathname === "/") {
    serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
    return;
  }

  // API: status + log poll
  if (req.method === "GET" && url.pathname === "/api/status") {
    const since = parseInt(url.searchParams.get("since") || "0");
    json(res, {
      status: runStatus,
      log: runLog.slice(since),
      total: runLog.length,
    });
    return;
  }

  // API: run task
  if (req.method === "POST" && url.pathname === "/api/run") {
    const body = await parseBody(req);
    const { prompt, profile = "homepage", verifyAfter = false } = body;
    if (!prompt || !prompt.trim()) {
      json(res, { error: "No prompt provided." }, 400);
      return;
    }
    // Fire and forget — client polls /api/status
    runGeminiTask({ prompt, profile, verifyAfter }).catch(console.error);
    json(res, { ok: true, message: "Task started. Poll /api/status for progress." });
    return;
  }

  // API: reset status
  if (req.method === "POST" && url.pathname === "/api/reset") {
    if (runStatus !== "running") {
      runStatus = "idle";
      runLog = [];
      json(res, { ok: true });
    } else {
      json(res, { error: "Cannot reset while running." }, 400);
    }
    return;
  }

  // API: kill active run
  if (req.method === "POST" && url.pathname === "/api/kill") {
    if (activeRun) {
      activeRun.kill("SIGTERM");
      appendLog("[KING CONSOLE] Task killed by user.");
      runStatus = "error";
    }
    json(res, { ok: true });
    return;
  }

  // API: list profiles
  if (req.method === "GET" && url.pathname === "/api/profiles") {
    const profiles = fs.readdirSync(PROFILES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
    json(res, { profiles });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   KING CONSOLE — CreatorVault OS     ║`);
  console.log(`║   http://localhost:${PORT}              ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
  console.log(`Repo root: ${REPO_ROOT}`);
  console.log(`Profiles:  ${PROFILES_DIR}`);
  console.log(`Output:    ${OUTPUT_DIR}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log(`\n⚠  GEMINI_API_KEY not set. Add it to tools/king-console/.env`);
  }
});
