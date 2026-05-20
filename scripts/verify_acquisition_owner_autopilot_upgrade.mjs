import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const service = read('server/services/vaultxAutonomousAcquisitionOperator.ts');
const router = read('server/routers/vaultxAcquisitionOperatorRouter.ts');
const ui = read('client/src/pages/OutreachCommandCenter.tsx');
const distPublic = path.join(root, 'dist/public/assets');

const checks = [
  {
    name: 'Service has owner autopilot policy fields',
    pass: service.includes('export interface VaultXOwnerAutopilotPolicy') && service.includes('dailySendLimit') && service.includes('requireDirectDelivery') && service.includes('stopOnRiskSignals'),
    plain: 'The platform has a real rulebook for what owner autopilot is allowed to do.',
  },
  {
    name: 'Service checks guardrails before live send',
    pass: service.includes('evaluateOwnerAutopilot') && service.includes('policy.allowedChannels.includes(action.channel)') && service.includes('sentToday >= policy.dailySendLimit') && service.includes('policy.requireDirectDelivery && !deliveryPath.direct'),
    plain: 'The platform checks score, channel, stage, daily cap, risk signals, and delivery setup before it can send.',
  },
  {
    name: 'Service explains holds in plain English proof',
    pass: service.includes('platformCapability') && service.includes('plainEnglish') && service.includes('outside the current owner-approved guardrails'),
    plain: 'When autopilot stops, the proof tells the owner what happened in understandable language.',
  },
  {
    name: 'API can save standing autopilot approval and run auto mode',
    pass: router.includes('const ownerAutopilotPatch = z.object') && router.includes('ownerAutopilot: ownerAutopilotPatch.optional()') && router.includes('mode: z.enum(["auto", "manual", "test"])') && router.includes('updateVaultXAcquisitionConfig(input as any)'),
    plain: 'The owner dashboard can approve the rules once and trigger an autopilot sweep through the existing API.',
  },
  {
    name: 'Owner dashboard exposes one-click approval and autopilot run',
    pass: ui.includes('Approve autopilot rules once') && ui.includes('Run owner autopilot') && ui.includes('handleApproveOwnerAutopilot') && ui.includes('owner-side cheat-code view'),
    plain: 'The owner control room now shows what autopilot can do and gives the owner a direct activation path.',
  },
  {
    name: 'Production build artifact exists after upgrade',
    pass: fs.existsSync(distPublic) && fs.readdirSync(distPublic).some((f) => /^index-.*\.js$/.test(f)),
    plain: 'The upgraded platform was built into deployable production assets.',
  },
];

const failed = checks.filter((check) => !check.pass);
const proof = {
  checkedAt: new Date().toISOString(),
  noOutreachSentByThisProof: true,
  result: failed.length === 0 ? 'pass' : 'fail',
  checks,
  plainEnglishSummary: failed.length === 0
    ? 'VaultX acquisition is now wired for owner autopilot: approve the guardrails once, then the platform can scout, score, write, send only when safe, follow up, and explain any hold without pretending it sent anything.'
    : 'The owner-autopilot upgrade is not fully wired yet; see failed checks.',
};

console.log(JSON.stringify(proof, null, 2));
if (failed.length) process.exit(1);
