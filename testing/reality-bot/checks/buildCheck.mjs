import fs from 'node:fs/promises';
import path from 'node:path';
import { command, nowIso, projectPath, statSummary } from './utils.mjs';

async function listFiles(dir, maxDepth = 3, depth = 0, results = []) {
  if (depth > maxDepth) return results;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await listFiles(full, maxDepth, depth + 1, results);
      else results.push(full);
      if (results.length >= 5000) return results;
    }
  } catch {}
  return results;
}

export async function buildCheck() {
  const dist = projectPath('dist');
  const distPublic = projectPath('dist/public');
  const assets = projectPath('dist/public/assets');
  const publicDir = projectPath('public');
  const summaries = {
    dist: await statSummary(dist),
    distPublic: await statSummary(distPublic),
    assets: await statSummary(assets),
    publicDir: await statSummary(publicDir),
    serverBundle: await statSummary(projectPath('dist/index.js')),
  };
  const assetFiles = await listFiles(assets, 2);
  const jsBundles = assetFiles.filter((file) => file.endsWith('.js'));
  const cssBundles = assetFiles.filter((file) => file.endsWith('.css'));
  const latest = await command('sh', ['-lc', 'find dist/public/assets -maxdepth 2 -type f -printf "%TY-%Tm-%TdT%TH:%TM:%TS %s %p\\n" 2>/dev/null | sort -r | head -n 30'], { timeout: 15000 });
  const warnings = [];
  if (!summaries.dist.exists) warnings.push('dist directory is missing');
  if (!summaries.distPublic.exists) warnings.push('dist/public directory is missing');
  if (!summaries.assets.exists) warnings.push('dist/public/assets directory is missing');
  if (jsBundles.length === 0) warnings.push('No JS bundles found in dist/public/assets');
  return {
    check: 'build_artifacts',
    status: warnings.length ? 'warn' : 'pass',
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    summaries,
    assetFileCount: assetFiles.length,
    jsBundleCount: jsBundles.length,
    cssBundleCount: cssBundles.length,
    sampleJsBundles: jsBundles.slice(0, 40).map((file) => path.relative(process.cwd(), file)),
    latestArtifacts: latest.stdout,
    readOnlyProof: 'Verified existing build artifacts only. No build command was executed.',
    warnings,
  };
}
