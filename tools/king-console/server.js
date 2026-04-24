/**
 * King Console — Backend Server
 * Wraps Gemini CLI for CreatorVault local prompt execution.
 * Usage: node server.js
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, execSync, spawnSync } = require("child_process");
const os = require("os");

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

// ─── Resolve Gemini CLI binary path ──────────────────────────────────────────
// On Mac, npm global binaries installed via nvm are not in the PATH that
// Node.js inherits from VS Code / launchd. We search common locations.
function resolveGeminiBinary() {
  // 1. Explicit override in .env or environment
  if (process.env.GEMINI_PATH && fs.existsSync(process.env.GEMINI_PATH)) {
    return process.env.GEMINI_PATH;
  }

  // 2. Try `which gemini` using a login shell (picks up nvm PATH on Mac)
  try {
    const result = spawnSync("bash", ["-lc", "which gemini"], { encoding: "utf8", timeout: 3000 });
    const found = result.stdout.trim();
    if (found && fs.existsSync(found)) return found;
  } catch (_) {}

  // 3. Try `which gemini` directly
  try {
    const result = spawnSync("which", ["gemini"], { encoding: "utf8", timeout: 3000 });
    const found = result.stdout.trim();
    if (found && fs.existsSync(found)) return found;
  } catch (_) {}

  // 4. Common nvm paths on Mac
  const home = os.homedir();
  const nvmCandidates = [
    path.join(home, ".nvm/versions/node/v22.13.0/bin/gemini"),
    path.join(home, ".nvm/versions/node/v22.0.0/bin/gemini"),
    path.join(home, ".nvm/versions/node/v20.0.0/bin/gemini"),
  ];
  // Also scan ~/.nvm/versions/node/*/bin/gemini dynamically
  const nvmNodeDir = path.join(home, ".nvm/versions/node");
  if (fs.existsSync(nvmNodeDir)) {
    try {
      const versions = fs.readdirSync(nvmNodeDir);
      for (const v of versions.reverse()) {
        nvmCandidates.push(path.join(nvmNodeDir, v, "bin/gemini"));
      }
    } catch (_) {}
  }

  for (const c of nvmCandidates) {
    if (fs.existsSync(c)) return c;
  }

  // 5. Common global npm paths
  const globalCandidates = [
    "/usr/local/bin/gemini",
    "/usr/bin/gemini",
    path.join(home, ".npm-global/bin/gemini"),
    "/opt/homebrew/bin/gemini",
  ];
  for (const c of globalCandidates) {
    if (fs.existsSync(c)) return c;
  }

  // 6. Fallback — let spawn try PATH as-is
  return "gemini";
}

const GEMINI_BINARY = resolveGeminiBinary();

// ─── Auth detection ───────────────────────────────────────────────────────────
function detectAuthState() {
  // Check if gemini binary exists
  const binaryFound = GEMINI_BINARY !== "gemini" || (() => {
    try {
      const r = spawnSync("which", ["gemini"], { encoding: "utf8", timeout: 2000 });
      return r.status === 0;
    } catch { return false; }
  })();

  if (!binaryFound) {
    return { state: "missing", message: "Gemini CLI not installed. Run: npm install -g @google/gemini-cli" };
  }

  // Check API key
  if (process.env.GEMINI_API_KEY) {
    return { state: "ready", method: "api_key", message: "Ready (API key)" };
  }

  // Check settings.json for saved auth
  const settingsPath = path.join(os.homedir(), ".gemini", "settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      const s = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      const selectedType = s?.security?.auth?.selectedType;
      if (selectedType) {
        // Run a quick probe to confirm auth actually works
        const probe = spawnSync(GEMINI_BINARY, ["--yolo", "--output-format", "text", "--prompt", "ping"], {
          encoding: "utf8", timeout: 5000,
          env: { ...process.env },
        });
        if (probe.status === 0 || (probe.stderr && !probe.stderr.includes("Auth method") && !probe.stderr.includes("GEMINI_API_KEY"))) {
          return { state: "ready", method: selectedType, message: `Ready (${selectedType})` };
        }
      }
    } catch (_) {}
  }

  // Run probe to check exit code
  const probe = spawnSync(GEMINI_BINARY, ["--yolo", "--output-format", "text", "--prompt", "ping"], {
    encoding: "utf8", timeout: 5000,
    env: { ...process.env },
  });

  if (probe.status === 41 || (probe.stderr && probe.stderr.includes("Auth method"))) {
    return { state: "not_connected", message: "Gemini not connected. Click CONNECT GEMINI to log in." };
  }

  if (probe.status === 0) {
    return { state: "ready", method: "unknown", message: "Ready" };
  }

  // Quota error = auth works, just rate limited
  if (probe.stderr && probe.stderr.includes("Quota exceeded")) {
    return { state: "ready", method: "authenticated", message: "Ready (quota limited — wait ~1 min)" };
  }

  return { state: "not_connected", message: "Gemini not connected. Click CONNECT GEMINI to log in." };
}

// ─── Active run state ─────────────────────────────────────────────────────────
let activeRun = null;
let runLog = [];
let runStatus = "idle"; // idle | running | done | error
let connectProcess = null;

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
  if (runLog.length > 2000) runLog = runLog.slice(-2000);
}

// ─── Classify stderr lines for better UI display ──────────────────────────────
function classifyStderr(line) {
  if (line.includes("Quota exceeded") || line.includes("rate-limit") || line.includes("rate_limit")) {
    return `[QUOTA LIMIT] ${line}`;
  }
  if (line.includes("Auth method") || line.includes("GEMINI_API_KEY") || line.includes("selectedType")) {
    return `[AUTH NEEDED] ${line}`;
  }
  if (line.includes("YOLO mode")) {
    return `[GEMINI] ${line}`;
  }
  return `[stderr] ${line}`;
}

async function runGeminiTask({ prompt, profile, verifyAfter }) {
  if (runStatus === "running") return { error: "A task is already running." };

  runStatus = "running";
  runLog = [];
  appendLog(`[KING CONSOLE] Starting task — profile: ${profile}`);
  appendLog(`[KING CONSOLE] Repo: ${REPO_ROOT}`);
  appendLog(`[KING CONSOLE] Gemini binary: ${GEMINI_BINARY}`);

  const profileText = loadProfile(profile);
  const fullPrompt = profileText
    ? `${profileText}\n\n---\n\nTASK:\n${prompt}`
    : prompt;

  appendLog(`[GEMINI] Launching with --yolo --prompt ...`);

  const env = { ...process.env };
  // Ensure nvm PATH is available
  const home = os.homedir();
  const nvmBinPath = path.dirname(GEMINI_BINARY);
  if (!env.PATH.includes(nvmBinPath)) {
    env.PATH = `${nvmBinPath}:${env.PATH}`;
  }

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(
        GEMINI_BINARY,
        ["--yolo", "--output-format", "text", "--prompt", fullPrompt],
        {
          cwd: REPO_ROOT,
          env,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
    } catch (err) {
      appendLog(`[ERROR] Failed to spawn Gemini: ${err.message}`);
      appendLog(`[HINT] Binary path tried: ${GEMINI_BINARY}`);
      appendLog(`[HINT] Run: npm install -g @google/gemini-cli`);
      runStatus = "error";
      resolve({ error: err.message });
      return;
    }

    child.stdout.on("data", (d) => {
      const text = d.toString();
      text.split("\n").filter(Boolean).forEach(appendLog);
    });

    child.stderr.on("data", (d) => {
      const text = d.toString();
      text.split("\n").filter(Boolean).forEach((l) => appendLog(classifyStderr(l)));
    });

    child.on("close", async (code) => {
      appendLog(`[GEMINI] Exited with code ${code}`);

      // Quota limit explanation
      const quotaLine = runLog.find(l => l.text.includes("QUOTA LIMIT"));
      if (quotaLine) {
        appendLog(`[KING CONSOLE] ⚠ Gemini free tier quota hit. Wait ~1 minute then try again.`);
        appendLog(`[KING CONSOLE] To remove quota limits: add a paid GEMINI_API_KEY to tools/king-console/.env`);
      }

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
        logLines: runLog.length,
        geminiBinary: GEMINI_BINARY,
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
      appendLog(`[HINT] Binary path tried: ${GEMINI_BINARY}`);
      appendLog(`[HINT] Run: npm install -g @google/gemini-cli`);
      appendLog(`[HINT] Then restart King Console`);
      runStatus = "error";
      resolve({ error: err.message });
    });

    activeRun = child;
  });
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }

  // Serve static UI
  if (req.method === "GET" && url.pathname === "/") {
    serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
    return;
  }

  // API: auth status
  if (req.method === "GET" && url.pathname === "/api/auth") {
    const auth = detectAuthState();
    json(res, { ...auth, binary: GEMINI_BINARY });
    return;
  }

  // API: trigger Google login (opens terminal — user must complete in terminal)
  if (req.method === "POST" && url.pathname === "/api/connect") {
    if (connectProcess) {
      json(res, { ok: false, message: "Connect already in progress." });
      return;
    }

    // Write settings.json to set auth type to login_with_google
    const geminiDir = path.join(os.homedir(), ".gemini");
    fs.mkdirSync(geminiDir, { recursive: true });
    const settingsPath = path.join(geminiDir, "settings.json");
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try { settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch (_) {}
    }
    settings.security = settings.security || {};
    settings.security.auth = { selectedType: "login_with_google" };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Open a terminal window with the gemini auth command
    // On Mac: use 'open -a Terminal' with a shell command
    // On Linux: use xterm or gnome-terminal
    const platform = os.platform();
    let connectCmd, connectArgs;

    if (platform === "darwin") {
      // Mac: open Terminal.app running gemini interactively
      const script = `tell application "Terminal" to do script "${GEMINI_BINARY} --prompt 'authenticate' 2>&1; echo 'LOGIN COMPLETE — close this window and return to King Console'"`;
      connectCmd = "osascript";
      connectArgs = ["-e", script];
    } else {
      // Linux fallback
      connectCmd = "bash";
      connectArgs = ["-c", `${GEMINI_BINARY} 2>&1 &`];
    }

    try {
      connectProcess = spawn(connectCmd, connectArgs, { detached: true, stdio: "ignore" });
      connectProcess.unref();
      connectProcess = null;
      json(res, {
        ok: true,
        message: "A Terminal window has opened. Complete the Google login there, then click CHECK STATUS here.",
        instructions: [
          "1. A Terminal window opened with Gemini CLI",
          "2. Follow the Google login prompt in that window",
          "3. Once logged in, return here and click CHECK STATUS",
        ]
      });
    } catch (err) {
      connectProcess = null;
      json(res, {
        ok: false,
        message: `Could not open Terminal: ${err.message}`,
        fallback: `Run this in your terminal: ${GEMINI_BINARY}`,
      });
    }
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
  console.log(`Repo root:     ${REPO_ROOT}`);
  console.log(`Gemini binary: ${GEMINI_BINARY}`);
  console.log(`Profiles:      ${PROFILES_DIR}`);
  console.log(`Output:        ${OUTPUT_DIR}`);
  if (GEMINI_BINARY === "gemini") {
    console.log(`\n⚠  Could not auto-detect gemini path. If runs fail, set GEMINI_PATH in tools/king-console/.env`);
  } else {
    console.log(`✓  Gemini binary resolved: ${GEMINI_BINARY}`);
  }
});
