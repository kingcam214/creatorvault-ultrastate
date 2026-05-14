import { command, nowIso } from './utils.mjs';

const DEFAULT_ROUTES = [
  '/',
  '/login',
  '/king/clone-command',
  '/king/reality',
  '/vaultx',
  '/api/health',
];

async function checkUrl(url) {
  const result = await command('curl', ['-k', '-L', '-sS', '-o', '/dev/null', '-w', 'code=%{http_code} final=%{url_effective} time=%{time_total} type=%{content_type} size=%{size_download}', url], { timeout: 25000 });
  const parsed = {};
  for (const part of String(result.stdout || '').split(/\s+/)) {
    const [key, ...rest] = part.split('=');
    if (key) parsed[key] = rest.join('=');
  }
  return { url, ok: result.ok, parsed, command: result };
}

export async function httpCheck(options = {}) {
  const baseUrl = options.baseUrl || 'https://creatorvault.live';
  const routes = options.routes || DEFAULT_ROUTES;
  const checks = [];
  for (const route of routes) {
    const url = route.startsWith('http') ? route : `${baseUrl}${route}`;
    checks.push(await checkUrl(url));
  }
  const warnings = [];
  for (const item of checks) {
    const code = Number(item.parsed.code || 0);
    if (!(code >= 200 && code < 500)) warnings.push(`${item.url} returned ${item.parsed.code || 'unknown'}`);
    if (code >= 500) warnings.push(`${item.url} has server error status ${code}`);
  }
  const homepage = checks.find((item) => item.url === `${baseUrl}/` || item.url === baseUrl);
  return {
    check: 'http',
    status: warnings.length ? 'warn' : 'pass',
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    baseUrl,
    homepageStatus: homepage?.parsed?.code || null,
    routes: checks.map(({ url, parsed, ok }) => ({ url, ok, ...parsed })),
    warnings,
  };
}
