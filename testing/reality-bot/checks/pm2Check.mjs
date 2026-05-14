import { command, nowIso } from './utils.mjs';

export async function pm2Check() {
  const version = await command('pm2', ['--version'], { timeout: 10000 });
  const list = await command('pm2', ['jlist'], { timeout: 15000, maxBuffer: 1024 * 1024 * 20 });
  const warnings = [];
  let processes = [];
  if (!list.ok) {
    warnings.push('pm2 jlist failed');
  } else {
    try {
      const parsed = JSON.parse(list.stdout || '[]');
      processes = parsed.map((proc) => {
        const env = proc.pm2_env || {};
        return {
          id: proc.pm_id,
          name: proc.name,
          status: env.status,
          restarts: env.restart_time,
          uptimeMs: env.pm_uptime ? Date.now() - env.pm_uptime : null,
          pid: proc.pid,
          memoryBytes: proc.monit?.memory ?? null,
          cpuPercent: proc.monit?.cpu ?? null,
          execMode: env.exec_mode,
          nodeEnv: env.NODE_ENV || env.env?.NODE_ENV || null,
          watching: Boolean(env.watch),
        };
      });
    } catch (error) {
      warnings.push(`Unable to parse pm2 jlist JSON: ${error.message}`);
    }
  }
  for (const proc of processes) {
    if (proc.status !== 'online') warnings.push(`PM2 process ${proc.name} is ${proc.status}`);
    if ((proc.restarts || 0) >= 50) warnings.push(`PM2 process ${proc.name} has high restart count: ${proc.restarts}`);
    if ((proc.uptimeMs || 0) < 5 * 60 * 1000) warnings.push(`PM2 process ${proc.name} uptime is under five minutes`);
  }
  return {
    check: 'pm2',
    status: warnings.length ? 'warn' : 'pass',
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    pm2Version: version.stdout || null,
    processCount: processes.length,
    processes,
    warnings,
    commands: { version, list: { ...list, stdout: '[parsed]' } },
  };
}
