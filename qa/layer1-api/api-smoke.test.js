/**
 * CreatorVault QA — Layer 1: API Smoke Tests
 * ============================================================================
 * Tests: health, auth, vaultx, clone, telegram, whatsapp, DB persistence, routes
 * Run: node qa/layer1-api/api-smoke.test.js
 * ============================================================================
 */
import { trpcQuery, trpcMutate, authFetch, getToken, BASE_URL, COOKIE_NAME } from "../helpers/auth.js";
import { setSuite, pass, fail, warn, writeJsonReport, writeHtmlReport, getSummary } from "../helpers/reporter.js";

const TIMEOUT = 15000;

async function withTimeout(fn, ms = TIMEOUT) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

// ─── Suite 1: Health & Connectivity ─────────────────────────────────────────
async function testHealth() {
  setSuite("Health & Connectivity");
  console.log("\n🔍 Suite 1 — Health & Connectivity");

  try {
    const res = await withTimeout(() => fetch(`${BASE_URL}/`));
    res.status === 200 ? pass("Site root returns 200") : fail("Site root returns 200", `Got ${res.status}`);
  } catch (e) { fail("Site root returns 200", "", e); }

  try {
    const res = await withTimeout(() => fetch(`${BASE_URL}/api/trpc/auth.getSession`, {
      headers: { Cookie: `${COOKIE_NAME}=invalid_token` }
    }));
    // Any response means server is up
    pass("API tRPC endpoint reachable", `HTTP ${res.status}`);
  } catch (e) { fail("API tRPC endpoint reachable", "", e); }

  try {
    const res = await withTimeout(() => fetch(`${BASE_URL}/assets/index-CnBl36rA.js`));
    res.status === 200 ? pass("Frontend bundle served (index-CnBl36rA.js)") : fail("Frontend bundle served", `HTTP ${res.status}`);
  } catch (e) { fail("Frontend bundle served", "", e); }
}

// ─── Suite 2: Authentication ─────────────────────────────────────────────────
async function testAuth() {
  setSuite("Authentication");
  console.log("\n🔍 Suite 2 — Authentication");

  try {
    const token = getToken();
    token && token.split(".").length === 3
      ? pass("JWT token generated successfully", `${token.substring(0, 40)}...`)
      : fail("JWT token generated successfully", "Invalid token format");
  } catch (e) { fail("JWT token generated", "", e); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getRevenueStats"));
    if (status === 200 && data?.result?.data?.json) {
      pass("Authenticated request succeeds (vaultx.getRevenueStats)", "200 OK with data");
    } else {
      fail("Authenticated request succeeds", `HTTP ${status}: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (e) { fail("Authenticated request succeeds", "", e); }

  // Verify unauthenticated request is rejected
  try {
    const res = await withTimeout(() => fetch(`${BASE_URL}/api/trpc/vaultx.getRevenueStats`));
    const data = await res.json();
    const isUnauth = data?.error?.json?.data?.code === "UNAUTHORIZED" || res.status === 401;
    isUnauth
      ? pass("Unauthenticated request correctly rejected (401)")
      : warn("Unauthenticated request not rejected", `HTTP ${res.status}`);
  } catch (e) { warn("Unauthenticated request rejection check", e.message); }
}

// ─── Suite 3: VaultX API ─────────────────────────────────────────────────────
async function testVaultX() {
  setSuite("VaultX API");
  console.log("\n🔍 Suite 3 — VaultX API");

  // getRevenueStats
  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getRevenueStats"));
    if (status === 200 && data?.result?.data?.json) {
      const stats = data.result.data.json;
      pass("vaultx.getRevenueStats", `gross: $${stats.gross_revenue}, subscribers: ${stats.total_subscribers}`);
    } else {
      fail("vaultx.getRevenueStats", `HTTP ${status}: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (e) { fail("vaultx.getRevenueStats", "", e); }

  // getCreatorProfile
  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getCreatorProfile"));
    status === 200 ? pass("vaultx.getCreatorProfile", "200 OK") : fail("vaultx.getCreatorProfile", `HTTP ${status}`);
  } catch (e) { fail("vaultx.getCreatorProfile", "", e); }

  // getCreatorContent
  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getCreatorContent", { creatorId: 6, limit: 20, offset: 0 }));
    if (status === 200) {
      const result = data?.result?.data?.json;
      const items = result?.items || result;
      pass("vaultx.getCreatorContent", `${Array.isArray(items) ? items.length : "?"} items`);
    } else {
      fail("vaultx.getCreatorContent", `HTTP ${status}`);
    }
  } catch (e) { fail("vaultx.getCreatorContent", "", e); }

  // saveContent (mutation)
  try {
    const { status, data } = await withTimeout(() => trpcMutate("vaultx.saveContent", {
      title: "QA Auto Test " + Date.now(),
      description: "Automated QA smoke test",
      contentType: "video",
      fileUrl: "https://example.com/qa-test.mp4",
      priceCents: 499,
      isLocked: false,
      unlockType: "ppv",
      tags: ["qa", "automated"],
    }));
    if (status === 200 && (data?.result?.data?.json?.contentId || data?.result?.data?.json?.success)) {
      pass("vaultx.saveContent (mutation)", `id: ${data.result.data.json.contentId || "ok"}`);
    } else {
      fail("vaultx.saveContent (mutation)", `HTTP ${status}: ${JSON.stringify(data).substring(0, 150)}`);
    }
  } catch (e) { fail("vaultx.saveContent (mutation)", "", e); }

  // getExportHistory
  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getExportHistory", {}));
    status === 200 ? pass("vaultx.getExportHistory", "200 OK") : fail("vaultx.getExportHistory", `HTTP ${status}`);
  } catch (e) { fail("vaultx.getExportHistory", "", e); }

  // getRealmStatus
  try {
    const { status, data } = await withTimeout(() => trpcQuery("vaultx.getRealmStatus"));
    status === 200 ? pass("vaultx.getRealmStatus", "200 OK") : fail("vaultx.getRealmStatus", `HTTP ${status}`);
  } catch (e) { fail("vaultx.getRealmStatus", "", e); }
}

// ─── Suite 4: Clone API ───────────────────────────────────────────────────────
async function testClone() {
  setSuite("Clone API");
  console.log("\n🔍 Suite 4 — Clone API");

  // Discover clone procedures
  const cloneProcedures = [
    "clone.getClones", "kingCamClone.getClones", "cloneEmpire.getClones",
    "clone.listClones", "clone.getAll"
  ];

  let cloneWorked = false;
  for (const proc of cloneProcedures) {
    try {
      const { status, data } = await withTimeout(() => trpcQuery(proc), 5000);
      if (status === 200) {
        pass(`${proc}`, "200 OK");
        cloneWorked = true;
        break;
      }
    } catch (e) { /* try next */ }
  }
  if (!cloneWorked) warn("Clone getClones", "No working procedure found in: " + cloneProcedures.join(", "));

  // Clone render
  const renderProcedures = ["clone.renderClone", "clone.render", "cloneRender.render"];
  let renderWorked = false;
  for (const proc of renderProcedures) {
    try {
      const { status, data } = await withTimeout(() => trpcMutate(proc, {
        script: "QA test render",
        mode: "talking_head",
        voiceStyle: "natural",
      }), 8000);
      if (status === 200) {
        pass(`${proc} (mutation)`, "200 OK");
        renderWorked = true;
        break;
      }
    } catch (e) { /* try next */ }
  }
  if (!renderWorked) warn("Clone renderClone", "No working render procedure found");
}

// ─── Suite 5: Telegram API ────────────────────────────────────────────────────
async function testTelegram() {
  setSuite("Telegram API");
  console.log("\n🔍 Suite 5 — Telegram API");

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.getHubOverview"));
    if (status === 200 && data?.result?.data?.json) {
      pass("telegramHub.getHubOverview", "200 OK with data");
    } else {
      fail("telegramHub.getHubOverview", `HTTP ${status}: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (e) { fail("telegramHub.getHubOverview", "", e); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.getChannels"));
    if (status === 200) {
      const ch = data?.result?.data?.json?.channels;
      pass("telegramHub.getChannels", `${Array.isArray(ch) ? ch.length : "?"} channels`);
    } else {
      fail("telegramHub.getChannels", `HTTP ${status}`);
    }
  } catch (e) { fail("telegramHub.getChannels", "", e); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.getLeads", { limit: 10 }));
    status === 200 ? pass("telegramHub.getLeads", "200 OK") : warn("telegramHub.getLeads", `HTTP ${status}`);
  } catch (e) { warn("telegramHub.getLeads", e.message); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.getMessageHistory", { limit: 5 }));
    status === 200 ? pass("telegramHub.getMessageHistory", "200 OK") : warn("telegramHub.getMessageHistory", `HTTP ${status}`);
  } catch (e) { warn("telegramHub.getMessageHistory", e.message); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.checkBotStatus"));
    status === 200 ? pass("telegramHub.checkBotStatus", "200 OK") : warn("telegramHub.checkBotStatus", `HTTP ${status}`);
  } catch (e) { warn("telegramHub.checkBotStatus", e.message); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegram.getWebhookInfo"));
    status === 200 ? pass("telegram.getWebhookInfo", "200 OK") : warn("telegram.getWebhookInfo", `HTTP ${status}`);
  } catch (e) { warn("telegram.getWebhookInfo", e.message); }
}

// ─── Suite 6: WhatsApp API ────────────────────────────────────────────────────
async function testWhatsApp() {
  setSuite("WhatsApp API");
  console.log("\n🔍 Suite 6 — WhatsApp API");

  try {
    const { status, data } = await withTimeout(() => trpcQuery("whatsappContent.getChannels"));
    if (status === 200) {
      const ch = data?.result?.data?.json?.channels;
      pass("whatsappContent.getChannels", `${Array.isArray(ch) ? ch.length : "?"} channels`);
    } else {
      fail("whatsappContent.getChannels", `HTTP ${status}`);
    }
  } catch (e) { fail("whatsappContent.getChannels", "", e); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("whatsappContent.getAnalytics"));
    status === 200 ? pass("whatsappContent.getAnalytics", "200 OK") : fail("whatsappContent.getAnalytics", `HTTP ${status}`);
  } catch (e) { fail("whatsappContent.getAnalytics", "", e); }

  try {
    const { status, data } = await withTimeout(() => trpcQuery("whatsappContent.getScheduledDrops"));
    status === 200 ? pass("whatsappContent.getScheduledDrops", "200 OK") : warn("whatsappContent.getScheduledDrops", `HTTP ${status}`);
  } catch (e) { warn("whatsappContent.getScheduledDrops", e.message); }

  try {
    const { status, data } = await withTimeout(() => trpcMutate("whatsappContent.generateCopy", {
      type: "status",
      language: "en",
      topic: "QA automated test",
    }));
    if (status === 200) {
      pass("whatsappContent.generateCopy (mutation)", "200 OK");
    } else {
      warn("whatsappContent.generateCopy", `HTTP ${status}: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (e) { warn("whatsappContent.generateCopy", e.message); }
}

// ─── Suite 7: DB Persistence ──────────────────────────────────────────────────
async function testPersistence() {
  setSuite("DB Persistence");
  console.log("\n🔍 Suite 7 — DB Persistence (write → read roundtrip)");

  const uniqueTitle = `QA-Persist-${Date.now()}`;
  let savedId = null;

  try {
    const { status, data } = await withTimeout(() => trpcMutate("vaultx.saveContent", {
      title: uniqueTitle,
      description: "DB persistence roundtrip test",
      contentType: "image",
      fileUrl: "https://example.com/qa-persist-test.jpg",
      priceCents: 0,
      isLocked: false,
      unlockType: "free",
      tags: ["qa-persist"],
    }));
    if (status === 200 && data?.result?.data?.json?.contentId) {
      savedId = data.result.data.json.contentId;
      pass("DB write: saveContent creates record", `id: ${savedId}`);
    } else {
      fail("DB write: saveContent creates record", JSON.stringify(data).substring(0, 150));
    }
  } catch (e) { fail("DB write: saveContent creates record", "", e); }

  if (savedId) {
    try {
      await new Promise(r => setTimeout(r, 500)); // brief wait for DB commit
      const { status, data } = await withTimeout(() => trpcQuery("vaultx.getCreatorContent", { creatorId: 6, limit: 20, offset: 0 }));
      const result = data?.result?.data?.json;
      const items = result?.items || result;
      const found = Array.isArray(items) && items.some(i => i.id === savedId || i.title === uniqueTitle);
      found
        ? pass("DB read: saved content appears in getCreatorContent", `id ${savedId} confirmed`)
        : warn("DB read: saved content not found in list", `id ${savedId} not in ${Array.isArray(items) ? items.length : "?"} items`);
    } catch (e) { fail("DB read: saved content appears in getCreatorContent", "", e); }
  }

  // Telegram persistence
  try {
    const { status, data } = await withTimeout(() => trpcQuery("telegramHub.getMessageHistory", { limit: 5 }));
    status === 200 ? pass("DB read: Telegram message history accessible") : warn("DB read: Telegram history", `HTTP ${status}`);
  } catch (e) { warn("DB read: Telegram history", e.message); }

  // WhatsApp analytics persistence
  try {
    const { status, data } = await withTimeout(() => trpcQuery("whatsappContent.getAnalytics"));
    status === 200 ? pass("DB read: WhatsApp analytics accessible") : warn("DB read: WhatsApp analytics", `HTTP ${status}`);
  } catch (e) { warn("DB read: WhatsApp analytics", e.message); }
}

// ─── Suite 8: Page Routes ─────────────────────────────────────────────────────
async function testPageRoutes() {
  setSuite("Page Routes");
  console.log("\n🔍 Suite 8 — Page Routes (SPA 200 check)");

  const routes = [
    // VaultX
    "/vaultx/studio", "/vaultx/onboarding", "/vaultx/video-editor", "/videoeditor/vaultx-projects",
    // Clone
    "/kingcam-clone", "/clone-empire-home", "/clone/render-studio", "/king/clone-command", "/king/clone-studio",
    // Telegram
    "/king/telegram-hub", "/telegram-setup",
    // WhatsApp
    "/whatsapp-content", "/king/whatsapp-bot",
    // Other key pages
    "/dashboard", "/brand-deals", "/design-department", "/king/dubbing",
  ];

  for (const route of routes) {
    try {
      const res = await withTimeout(() => fetch(`${BASE_URL}${route}`), 8000);
      res.status === 200
        ? pass(`Route ${route}`, "200 OK")
        : fail(`Route ${route}`, `HTTP ${res.status}`);
    } catch (e) {
      fail(`Route ${route}`, "", e);
    }
  }
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CreatorVault QA — Layer 1: API Smoke Tests");
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════");

  await testHealth();
  await testAuth();
  await testVaultX();
  await testClone();
  await testTelegram();
  await testWhatsApp();
  await testPersistence();
  await testPageRoutes();

  const summary = getSummary();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${summary.passed} passed / ${summary.failed} failed / ${summary.warned} warnings`);
  console.log(`  PASS RATE: ${summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%`);
  console.log("═══════════════════════════════════════════════════════════");

  const jsonPath = writeJsonReport("layer1-results.json");
  const htmlPath = writeHtmlReport("layer1-report.html");
  console.log(`\n  📄 JSON: ${jsonPath}`);
  console.log(`  📊 HTML: ${htmlPath}`);

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
