/**
 * CreatorVault QA — Reporter
 * Collects test results, writes logs, and generates the final HTML report.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts");
const REPORTS_DIR = path.join(ARTIFACTS_DIR, "reports");
const LOGS_DIR = path.join(ARTIFACTS_DIR, "logs");

// Ensure dirs exist
[ARTIFACTS_DIR, REPORTS_DIR, LOGS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const results = [];
let currentSuite = "General";

export function setSuite(name) {
  currentSuite = name;
}

export function pass(name, detail = "") {
  const r = { suite: currentSuite, name, status: "PASS", detail, ts: new Date().toISOString() };
  results.push(r);
  console.log(`  ✅ PASS  ${name}${detail ? " — " + detail : ""}`);
  return r;
}

export function fail(name, detail = "", error = null) {
  const r = { suite: currentSuite, name, status: "FAIL", detail, error: error?.message || error || "", ts: new Date().toISOString() };
  results.push(r);
  console.error(`  ❌ FAIL  ${name}${detail ? " — " + detail : ""}${error ? "\n         " + (error?.message || error) : ""}`);
  return r;
}

export function warn(name, detail = "") {
  const r = { suite: currentSuite, name, status: "WARN", detail, ts: new Date().toISOString() };
  results.push(r);
  console.warn(`  ⚠️  WARN  ${name}${detail ? " — " + detail : ""}`);
  return r;
}

export function getResults() { return results; }

export function getSummary() {
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;
  return { passed, failed, warned, total: results.length };
}

export function writeJsonReport(filename = "qa-results.json") {
  const out = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(out, JSON.stringify({ summary: getSummary(), results, generatedAt: new Date().toISOString() }, null, 2));
  return out;
}

export function writeHtmlReport(filename = "qa-report.html") {
  const summary = getSummary();
  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

  const rows = results.map(r => {
    const color = r.status === "PASS" ? "#27ae60" : r.status === "FAIL" ? "#e74c3c" : "#f39c12";
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    return `<tr>
      <td style="color:${color};font-weight:bold">${icon} ${r.status}</td>
      <td>${r.suite}</td>
      <td>${r.name}</td>
      <td style="color:#aaa;font-size:12px">${r.detail || ""}</td>
      <td style="color:#e74c3c;font-size:11px;max-width:300px;word-break:break-word">${r.error || ""}</td>
      <td style="color:#666;font-size:11px">${r.ts}</td>
    </tr>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CreatorVault QA Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Inter', system-ui, sans-serif; padding: 32px; }
    h1 { font-size: 28px; color: #fff; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 32px; font-size: 14px; }
    .summary { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
    .stat { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px 28px; min-width: 140px; }
    .stat-value { font-size: 36px; font-weight: 800; }
    .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
    .pass { color: #27ae60; }
    .fail { color: #e74c3c; }
    .warn { color: #f39c12; }
    .total { color: #3498db; }
    .rate { color: ${passRate >= 80 ? "#27ae60" : passRate >= 60 ? "#f39c12" : "#e74c3c"}; }
    table { width: 100%; border-collapse: collapse; background: #111; border-radius: 12px; overflow: hidden; }
    th { background: #1a1a2e; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px; text-align: left; }
    td { padding: 10px 16px; border-bottom: 1px solid #1a1a1a; font-size: 13px; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #161622; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>🛡️ CreatorVault QA Report</h1>
  <div class="subtitle">Generated: ${new Date().toUTCString()} · Target: https://creatorvault.live</div>
  <div class="summary">
    <div class="stat"><div class="stat-value pass">${summary.passed}</div><div class="stat-label">Passed</div></div>
    <div class="stat"><div class="stat-value fail">${summary.failed}</div><div class="stat-label">Failed</div></div>
    <div class="stat"><div class="stat-value warn">${summary.warned}</div><div class="stat-label">Warnings</div></div>
    <div class="stat"><div class="stat-value total">${summary.total}</div><div class="stat-label">Total Tests</div></div>
    <div class="stat"><div class="stat-value rate">${passRate}%</div><div class="stat-label">Pass Rate</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Status</th><th>Suite</th><th>Test</th><th>Detail</th><th>Error</th><th>Timestamp</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const out = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(out, html);
  return out;
}

export function writeLog(content, filename = "qa-run.log") {
  const out = path.join(LOGS_DIR, filename);
  fs.writeFileSync(out, content);
  return out;
}
