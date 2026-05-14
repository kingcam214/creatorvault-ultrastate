import fs from 'node:fs/promises';
import path from 'node:path';
import { nowIso, pathExists, projectPath } from './utils.mjs';

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

async function resolveImport(baseDir, rel) {
  const rawBase = path.resolve(baseDir, rel);
  const candidates = EXTENSIONS.map((ext) => rawBase + ext);
  candidates.push(path.join(rawBase, 'index.ts'), path.join(rawBase, 'index.js'));
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return { exists: true, resolved: candidate, candidates, resolvedBy: 'direct' };
  }

  const parsed = path.parse(rawBase);
  if (parsed.ext) {
    const withoutExplicitExt = path.join(parsed.dir, parsed.name);
    const mismatchCandidates = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].map((ext) => withoutExplicitExt + ext);
    for (const candidate of mismatchCandidates) {
      if (await pathExists(candidate)) return { exists: true, resolved: candidate, candidates: [...candidates, ...mismatchCandidates], resolvedBy: 'extension-mismatch' };
    }
  }

  return { exists: false, resolved: null, candidates, resolvedBy: 'unresolved' };
}

function parseImports(source) {
  const imports = [];
  const regex = /import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["'];?/g;
  let match;
  while ((match = regex.exec(source))) {
    const rel = match[1];
    if (rel.startsWith('./routers') || rel.startsWith('./swarmEngineRouter') || rel.includes('/routers/')) {
      imports.push({ rel, index: match.index, statement: match[0].replace(/\s+/g, ' ').trim() });
    }
  }
  return imports;
}

export async function routerCheck() {
  const routersFile = projectPath('server/routers.ts');
  const source = await fs.readFile(routersFile, 'utf8');
  const imports = parseImports(source);
  const baseDir = path.dirname(routersFile);
  const seen = new Map();
  const resolved = [];
  const missing = [];
  const extensionMismatches = [];
  const duplicateImports = [];

  for (const item of imports) {
    const result = await resolveImport(baseDir, item.rel);
    const record = { ...item, ...result };
    resolved.push(record);
    if (!result.exists) missing.push(record);
    if (seen.has(item.rel)) duplicateImports.push({ rel: item.rel, firstIndex: seen.get(item.rel), duplicateIndex: item.index });
    else seen.set(item.rel, item.index);
    const explicitExt = path.extname(item.rel);
    if (result.exists && explicitExt && path.extname(result.resolved) && explicitExt !== path.extname(result.resolved)) {
      extensionMismatches.push({ rel: item.rel, resolved: result.resolved, importedExtension: explicitExt, diskExtension: path.extname(result.resolved), resolvedBy: result.resolvedBy });
    }
  }

  const specificTelegram = resolved.find((item) => item.rel.includes('telegramFunnelRouter')) || null;
  const warnings = [];
  if (missing.length) warnings.push(`${missing.length} router import(s) unresolved`);
  if (extensionMismatches.length) warnings.push(`${extensionMismatches.length} import extension mismatch(es)`);
  if (duplicateImports.length) warnings.push(`${duplicateImports.length} duplicate import(s)`);

  return {
    check: 'router',
    status: warnings.length ? 'warn' : 'pass',
    ok: missing.length === 0,
    generatedAt: nowIso(),
    routersFile,
    importCount: imports.length,
    presentCount: imports.length - missing.length,
    missingCount: missing.length,
    extensionMismatchCount: extensionMismatches.length,
    duplicateImportCount: duplicateImports.length,
    missing: missing.map(({ rel, statement, candidates }) => ({ rel, statement, candidates })),
    extensionMismatches,
    duplicateImports,
    specificChecks: { telegramFunnelRouter: specificTelegram },
    warnings,
  };
}
