#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { systemCheck } from './checks/systemCheck.mjs';
import { pm2Check } from './checks/pm2Check.mjs';
import { nginxCheck } from './checks/nginxCheck.mjs';
import { gitCheck } from './checks/gitCheck.mjs';
import { routerCheck } from './checks/routerCheck.mjs';
import { httpCheck } from './checks/httpCheck.mjs';
import { browserCheck } from './checks/browserCheck.mjs';
import { dbCheck } from './checks/dbCheck.mjs';
import { buildCheck } from './checks/buildCheck.mjs';
import { ensureDir, failSafeError, nowIso, projectPath } from './checks/utils.mjs';

const REPORT_DIR = projectPath('testing/reality-bot/reports');
const SCREENSHOT_DIR = projectPath('testing/reality-bot/screenshots');

async function runCheck(name, fn) {
  const startedAt = nowIso();
  try {
    const result = await fn();
    return { ...result, startedAt, finishedAt: nowIso() };
  } catch (error) {
    return { ...failSafeError(name, error), startedAt, finishedAt: nowIso() };
  }
}

function collectSections(report) {
  const confirmedReal = [];
  const confirmedNotReal = [];
  const partiallyReal = [];
  const cautions = [];
  const highRiskFiles = ['server/routers.ts', '.env', 'ecosystem.config.cjs', 'server/_core/index.ts'];
  const doNotTouch = ['Stripe/payment routes', 'production database rows', 'PM2 process state', 'router imports without explicit authorization', 'environment variables'];

  if (report.checks.system?.status === 'pass' || report.checks.system?.status === 'warn') confirmedReal.push('The VPS responds to read-only system inspection and exposes hostname, uptime, kernel, CPU, memory, disk, and mounts.');
  if (report.checks.pm2?.processes?.some((p) => p.name === 'creatorvault' && p.status === 'online')) confirmedReal.push('The CreatorVault PM2 process is online.');
  if (report.checks.nginx?.active === 'active') confirmedReal.push('Nginx is active.');
  if (report.checks.http?.homepageStatus === '200') confirmedReal.push('The public homepage returns HTTP 200.');
  if (report.checks.browser?.visibleBranding) confirmedReal.push('The homepage renders visible CreatorVault branding in a real browser screenshot.');
  if (report.checks.database?.ok) confirmedReal.push('Database connectivity works using SELECT-only metadata queries.');
  if (report.checks.build_artifacts?.ok) confirmedReal.push('Existing build artifacts are present under dist/public/assets.');

  if (report.checks.browser?.whiteScreenDetected) confirmedNotReal.push('Homepage is not reliably rendering; browser check detected a possible white screen.');
  if (report.checks.router?.missingCount > 0) confirmedNotReal.push(`${report.checks.router.missingCount} router import(s) are unresolved on disk.`);
  if (report.checks.pm2?.processes?.some((p) => p.status !== 'online')) partiallyReal.push('At least one PM2 process is not online.');
  if (report.checks.router?.extensionMismatchCount > 0) partiallyReal.push(`${report.checks.router.extensionMismatchCount} router import extension mismatch(es) were detected; these should be reviewed before any restart.`);
  if (report.checks.git?.dirtyFileCount > 0) partiallyReal.push(`Git working tree has ${report.checks.git.dirtyFileCount} changed or untracked file(s), including Reality Bot artifacts if not committed.`);

  for (const [name, result] of Object.entries(report.checks)) {
    if (result?.warnings?.length) cautions.push(...result.warnings.map((warning) => `${name}: ${warning}`));
    if (result?.status === 'fail') cautions.push(`${name}: check failed and needs review.`);
  }

  const nextSafeActions = [
    'Review the generated reports before any production change.',
    'Run this Reality Bot before and after future deployments or router edits.',
    'Do not restart PM2, rebuild, migrate, or touch payments unless explicitly authorized.',
    'If router warnings exist, inspect them manually before modifying server/routers.ts.',
  ];

  return { confirmedReal, confirmedNotReal, partiallyReal, cautions, nextSafeActions, highRiskFiles, doNotTouch };
}

function mdList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None detected.';
}

function renderMarkdown(report) {
  const sections = collectSections(report);
  return `# CreatorVault Reality Bot Report

**Generated:** ${report.generatedAt}  
**Mode:** Read-only infrastructure verification  
**Production Mutation:** None intentionally performed by this tool.  

## Summary

| Check | Status | OK |
|---|---:|---:|
${Object.entries(report.checks).map(([name, result]) => `| ${name} | ${result.status || 'unknown'} | ${result.ok ? 'yes' : 'no'} |`).join('\n')}

## CONFIRMED REAL

${mdList(sections.confirmedReal)}

## CONFIRMED NOT REAL

${mdList(sections.confirmedNotReal)}

## PARTIALLY REAL

${mdList(sections.partiallyReal)}

## CAUTIONS

${mdList(sections.cautions)}

## NEXT SAFE ACTIONS

${mdList(sections.nextSafeActions)}

## HIGH-RISK FILES

${mdList(sections.highRiskFiles)}

## DO NOT TOUCH

${mdList(sections.doNotTouch)}

## Proof Pointers

| Artifact | Path |
|---|---|
| Full JSON report | testing/reality-bot/reports/reality-report.json |
| Markdown report | testing/reality-bot/reports/reality-report.md |
| Router resolution report | testing/reality-bot/reports/router-resolution-report.json |
| Browser proof | testing/reality-bot/reports/browser-proof.json |
| System health | testing/reality-bot/reports/system-health.json |
| Homepage screenshot | ${report.checks.browser?.screenshotPath || 'not generated'} |

## Read-Only Safety Confirmation

This tool performs inspection commands, HTTP requests, SELECT-only database metadata queries, and browser screenshot capture. It does **not** run production builds, restart PM2, migrate the database, modify Stripe or payments, change environment variables, or edit router imports.
`;
}

async function main() {
  await ensureDir(REPORT_DIR);
  await ensureDir(SCREENSHOT_DIR);

  const checks = {};
  checks.system = await runCheck('system', systemCheck);
  checks.pm2 = await runCheck('pm2', pm2Check);
  checks.nginx = await runCheck('nginx', nginxCheck);
  checks.git = await runCheck('git', gitCheck);
  checks.router = await runCheck('router', routerCheck);
  checks.database = await runCheck('database', dbCheck);
  checks.http = await runCheck('http', httpCheck);
  checks.browser = await runCheck('browser', browserCheck);
  checks.build_artifacts = await runCheck('build_artifacts', buildCheck);

  const report = {
    name: 'CreatorVault Reality Bot',
    version: '1.0.0',
    generatedAt: nowIso(),
    mode: 'read-only',
    safety: {
      restartedPm2: false,
      ranBuild: false,
      migratedDatabase: false,
      touchedStripe: false,
      touchedPayments: false,
      editedRouters: false,
      modifiedEnvVars: false,
    },
    checks,
  };

  const markdown = renderMarkdown(report);
  await fs.writeFile(path.join(REPORT_DIR, 'reality-report.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.writeFile(path.join(REPORT_DIR, 'reality-report.md'), markdown);
  await fs.writeFile(path.join(REPORT_DIR, 'router-resolution-report.json'), JSON.stringify(checks.router, null, 2) + '\n');
  await fs.writeFile(path.join(REPORT_DIR, 'browser-proof.json'), JSON.stringify(checks.browser, null, 2) + '\n');
  await fs.writeFile(path.join(REPORT_DIR, 'system-health.json'), JSON.stringify({ system: checks.system, pm2: checks.pm2, nginx: checks.nginx, http: checks.http, database: checks.database, git: checks.git, build_artifacts: checks.build_artifacts }, null, 2) + '\n');

  console.log(markdown);
  const failed = Object.values(checks).filter((result) => result.status === 'fail').length;
  process.exitCode = failed ? 2 : 0;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(2);
});
