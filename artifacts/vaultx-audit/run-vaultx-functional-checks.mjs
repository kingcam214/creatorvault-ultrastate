import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = '/home/ubuntu/creatorvault-main-deployfix';
const outDir = path.join(root, 'artifacts/vaultx-audit');
const read = (p) => fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), 'utf8') : '';
const exists = (p) => fs.existsSync(path.join(root, p));
const files = {
  vaultxRouter: 'server/routers/vaultxRouter.ts',
  acquisitionRouter: 'server/routers/vaultxAcquisitionOperatorRouter.ts',
  acquisitionService: 'server/services/vaultxAutonomousAcquisitionOperator.ts',
  telegramMoneyLoop: 'server/services/telegramMoneyLoop.ts',
  telegramFunnelRouter: 'server/routers/telegramFunnelRouter.ts',
  challengeAutomation: 'server/routers/challengeAutomationRouter.ts',
  aiChatterRouter: 'server/routers/aiChatterRouter.ts',
  checkoutBot: 'server/services/checkoutBot.ts',
  creatorTools: 'server/services/creatorTools.ts',
  qualityGate: 'server/services/qualityGate.ts',
  messagingLaw: 'MESSAGING_DNA_LAW.md',
  brandLaw: 'BRAND_DNA_QUALITY_LAW.md',
};

function listFiles(dir, predicate) {
  const full = path.join(root, dir);
  const results = [];
  const skip = new Set(['node_modules', 'dist', '.git', 'artifacts', 'attached_assets']);
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (predicate(p)) results.push(p);
    }
  }
  walk(full);
  return results;
}

const sourceFiles = listFiles('.', (p) => /\.(ts|tsx|js|mjs)$/.test(p));
const clientFiles = sourceFiles.filter((p) => p.includes('/client/src/'));
const serverFiles = sourceFiles.filter((p) => p.includes('/server/'));

const routerText = read(files.vaultxRouter);
const procedureMatches = [...routerText.matchAll(/\n\s*([A-Za-z0-9_]+):\s*(?:protectedProcedure|publicProcedure)/g)].map((m) => m[1]);
const clientCalls = new Set();
for (const file of clientFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/trpc\.vaultx\.([A-Za-z0-9_]+)/g)) clientCalls.add(m[1]);
}
const missingClientProcedures = [...clientCalls].filter((name) => !procedureMatches.includes(name)).sort();
const unusedProcedures = procedureMatches.filter((name) => !clientCalls.has(name)).sort();

const criticalChecks = [];
function check(name, ok, detail, severity = 'fail') {
  criticalChecks.push({ name, ok: Boolean(ok), severity, detail });
}

for (const [key, rel] of Object.entries(files)) check(`required file exists: ${rel}`, exists(rel), key, 'fail');
check('VaultX router exposes setup/create/upload/revenue procedures', ['setupCreatorProfile','uploadContent','sendMassMessage','getRevenueAnalytics'].every((x) => procedureMatches.includes(x)), `procedures=${procedureMatches.length}`, 'fail');
check('Client VaultX calls resolve to server procedures', missingClientProcedures.length === 0, missingClientProcedures.join(', ') || 'all client calls matched', 'fail');
check('QualityGate contains Messaging DNA validator', read(files.qualityGate).includes('requiresMessagingDna') && read(files.qualityGate).includes('withCreatorVaultMessagingDna') && read(files.qualityGate).includes('CHALLENGE_MOMENTUM_PATTERN'), 'QualityGate messaging/challenge validators present', 'fail');
check('Telegram money loop uses QualityGate before sends/logged drops', read(files.telegramMoneyLoop).includes('qualityGate') && read(files.telegramMoneyLoop).includes('requireMessagingDna'), 'telegramMoneyLoop gated', 'fail');
check('Telegram funnel helpers use QualityGate', read(files.telegramFunnelRouter).includes('qualityGate') && read(files.telegramFunnelRouter).includes('requireMessagingDna'), 'telegramFunnelRouter gated', 'fail');
check('Challenge automation prompts use Messaging DNA', read(files.challengeAutomation).includes('withCreatorVaultMessagingDna') && read(files.challengeAutomation).includes('qualityGate'), 'challengeAutomation upgraded', 'fail');
check('WhatsApp checkout copy uses Messaging DNA QualityGate', read(files.checkoutBot).includes('qualityGate.check') && read(files.checkoutBot).includes('requireMessagingDna'), 'checkoutBot gated', 'fail');
check('Creator tools channel generators use QualityGate', read(files.creatorTools).includes('qualityGate.check') && read(files.creatorTools).includes('withCreatorVaultMessagingDna') && read(files.creatorTools).includes('direct-access'), 'creatorTools gated', 'fail');
check('Dedicated AI chatter router validates generated fan replies', read(files.aiChatterRouter).includes('qualityGate.check') && read(files.aiChatterRouter).includes('withCreatorVaultMessagingDna'), 'aiChatterRouter gated', 'fail');
check('Live Telegram reactivation env vars are not set locally', ['TELEGRAM_LIVE_SENDS_ENABLED','CREATORVAULT_OUTBOUND_APPROVED','CREATORVAULT_OUTBOUND_PROOF_ID','CREATORVAULT_OUTBOUND_REVIEWER'].every((k) => !process.env[k]), 'local environment keeps live sends default-off', 'fail');

const vaultxGaps = [];
function gap(id, title, evidence, impact, recommendation, severity = 'high') { vaultxGaps.push({ id, severity, title, evidence, impact, recommendation }); }
if (!routerText.includes('validateVaultxWorkflowCopy') || !/sendMassMessage:[\s\S]*validateVaultxWorkflowCopy\(input\.messageText/.test(routerText)) {
  gap('VX-GATE-001', 'VaultX mass-message composer can store and fan out creator text without Messaging DNA validation.', 'server/routers/vaultxRouter.ts sendMassMessage inserts messageText directly into vaultx_mass_messages and vaultx_messages.', 'A creator-facing broadcast path can still become generic, long, or weak even though Telegram/WhatsApp helper paths are governed.', 'Add QualityGate.validateVaultxMessage or validateTelegramMessage to sendMassMessage before insertion and require locked-message mechanism language when isLocked is true.');
}
if (!/saveAiChatterConfig:[\s\S]*validateVaultxChatterConfig\(input\)/.test(routerText) || !read(files.aiChatterRouter).includes('qualityGate.check')) {
  gap('VX-GATE-002', 'AI chatter persona and greeting configuration is not quality-gated.', 'server/routers/vaultxRouter.ts saveAiChatterConfig persists personaDescription and greetingMessage directly.', 'A weak greeting or generic persona can become the first paid-DM experience and break the cheat-code positioning.', 'Validate greetingMessage/personaDescription through Messaging DNA before saving; reject placeholders, generic helper language, and missing mechanism/value language.');
}
if (!/uploadContent:[\s\S]*validateVaultxMetadata\(input\.title/.test(routerText)) {
  gap('VX-GATE-003', 'VaultX content title and description are not checked for premium mechanism copy.', 'server/routers/vaultxRouter.ts uploadContent stores title and description directly.', 'Drop cards can look like ordinary content libraries instead of revenue routes.', 'Validate upload title/description and generate a money-route caption if the creator submits weak metadata.');
}
if (/recipientCount:\s*0/.test(routerText)) {
  gap('VX-FUNC-001', 'sendMassMessage returns recipientCount: 0 even after fan-out.', 'server/routers/vaultxRouter.ts updates sent_count but returns a hard-coded recipientCount: 0.', 'Creator dashboard can under-report action taken, making automation feel broken or fake.', 'Return subs.length so the sender sees exact reach immediately.');
}
if (read(files.acquisitionService).includes('setInterval') && !read(files.acquisitionService).includes('CREATORVAULT_OUTBOUND_PROOF_ID')) {
  gap('VX-AUTO-001', 'Autonomous acquisition loop needs explicit live-send gate proof in its own service.', 'server/services/vaultxAutonomousAcquisitionOperator.ts contains recurring loop logic; live output safety should be obvious at the service boundary.', 'Recurring agents must feel powerful but controlled; hidden safety reliance is fragile.', 'Add explicit environment approval checks and dry-run mode labels at operator start and before outbound actions.');
}
if (!read(files.messagingLaw).includes('VaultX Challenge') || !read(files.messagingLaw).includes('AI Agent Challenge')) {
  gap('VX-LAW-001', 'Messaging DNA law may not fully spell out challenge-specific VaultX lanes.', 'MESSAGING_DNA_LAW.md should name VaultX Challenge and AI Agent Challenge standards.', 'Challenge automation can drift into generic motivational copy.', 'Add explicit challenge acceptance, scoreboard, proof, and next-action language requirements.');
}

let qualityGovernor = { ok: false, output: '' };
try {
  qualityGovernor.output = execSync('npm run quality-governor', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  qualityGovernor.ok = qualityGovernor.output.includes('"ok": true');
} catch (error) {
  qualityGovernor.output = `${error.stdout || ''}\n${error.stderr || ''}`;
}

const result = {
  generatedAt: new Date().toISOString(),
  procedureCount: procedureMatches.length,
  serverProcedures: procedureMatches,
  clientVaultxCalls: [...clientCalls].sort(),
  missingClientProcedures,
  unusedProcedures,
  criticalChecks,
  qualityGovernor,
  gaps: vaultxGaps,
  summary: {
    failChecks: criticalChecks.filter((c) => !c.ok && c.severity === 'fail').length,
    warningChecks: criticalChecks.filter((c) => !c.ok && c.severity !== 'fail').length,
    gapCount: vaultxGaps.length,
    highGapCount: vaultxGaps.filter((g) => g.severity === 'high').length,
  },
};

const jsonPath = path.join(outDir, 'vaultx-functional-checks.json');
const mdPath = path.join(outDir, 'vaultx-functional-checks.md');
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');
const checkRows = criticalChecks.map((c) => `| ${c.ok ? 'PASS' : 'FAIL'} | ${c.severity} | ${c.name} | ${String(c.detail).replace(/\|/g, '\\|')} |`).join('\n');
const gapRows = vaultxGaps.map((g) => `| ${g.id} | ${g.severity} | ${g.title} | ${g.recommendation.replace(/\|/g, '\\|')} |`).join('\n') || '| None | none | No gaps detected | No action |';
fs.writeFileSync(mdPath, `# VaultX Functional Check Report\n\nGenerated: ${result.generatedAt}\n\n## Baseline\n\n| Metric | Value |\n|---|---:|\n| Server procedures | ${result.procedureCount} |\n| Client VaultX calls | ${clientCalls.size} |\n| Missing client procedures | ${missingClientProcedures.length} |\n| Quality governor passed | ${qualityGovernor.ok ? 'yes' : 'no'} |\n| High-priority gaps | ${result.summary.highGapCount} |\n\n## Critical Checks\n\n| Status | Severity | Check | Detail |\n|---|---|---|---|\n${checkRows}\n\n## Gaps Requiring Upgrade\n\n| ID | Severity | Gap | Recommended Fix |\n|---|---|---|---|\n${gapRows}\n\n## Notes\n\nThis harness performs safe functional verification through static route/UI alignment, governance coverage checks, and local quality governor execution. It does not send Telegram, WhatsApp, payment, or email traffic.\n`);
console.log(JSON.stringify(result.summary, null, 2));
console.log(mdPath);
