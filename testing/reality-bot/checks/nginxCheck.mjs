import { command, nowIso } from './utils.mjs';

async function curl(url) {
  return command('curl', ['-k', '-sS', '-o', '/dev/null', '-w', 'code=%{http_code} time=%{time_total} remote=%{remote_ip} ssl=%{ssl_verify_result}', url], { timeout: 20000 });
}

function parseCurl(result) {
  const data = {};
  for (const part of String(result.stdout || '').split(/\s+/)) {
    const [key, ...rest] = part.split('=');
    if (key) data[key] = rest.join('=');
  }
  return data;
}

export async function nginxCheck() {
  const active = await command('systemctl', ['is-active', 'nginx'], { timeout: 10000 });
  const status = await command('systemctl', ['status', 'nginx', '--no-pager'], { timeout: 10000, maxBuffer: 1024 * 1024 * 3 });
  const local = await curl('http://127.0.0.1/');
  const domainHttp = await curl('http://creatorvault.live/');
  const domainHttps = await curl('https://creatorvault.live/');
  const parsed = {
    local: parseCurl(local),
    domainHttp: parseCurl(domainHttp),
    domainHttps: parseCurl(domainHttps),
  };
  const warnings = [];
  if ((active.stdout || '').trim() !== 'active') warnings.push('Nginx is not active');
  for (const [name, value] of Object.entries(parsed)) {
    const code = Number(value.code || 0);
    if (!(code >= 200 && code < 400)) warnings.push(`${name} returned HTTP ${value.code || 'unknown'}`);
  }
  return {
    check: 'nginx',
    status: warnings.length ? 'warn' : 'pass',
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    active: active.stdout,
    reverseProxy: parsed,
    warnings,
    commands: { active, status, local, domainHttp, domainHttps },
  };
}
