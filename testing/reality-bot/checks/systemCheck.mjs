import os from 'node:os';
import { command, commandText, nowIso, statusFromFlags } from './utils.mjs';

function parseDf(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(1).map((line) => {
    const parts = line.trim().split(/\s+/);
    return {
      filesystem: parts[0],
      size: parts[1],
      used: parts[2],
      available: parts[3],
      usePercent: parts[4],
      mountedOn: parts.slice(5).join(' '),
      usePercentNumber: Number(String(parts[4] || '').replace('%', '')),
    };
  });
}

export async function systemCheck() {
  const [hostname, uptime, kernel, memory, cpu, disk, mounts] = await Promise.all([
    commandText('hostname'),
    commandText('uptime'),
    commandText('uname', ['-a']),
    command('free', ['-h']),
    command('sh', ['-lc', "lscpu | egrep 'Model name|CPU\\(s\\)|Thread|Core|Socket|Architecture'"], { timeout: 10000 }),
    command('df', ['-h', '/', '/root']),
    command('mount'),
  ]);
  const disks = parseDf(disk.stdout || '');
  const rootDisk = disks.find((entry) => entry.mountedOn === '/') || disks[0];
  const warnings = [];
  if (rootDisk?.usePercentNumber >= 85) warnings.push(`Root disk usage is high at ${rootDisk.usePercent}`);
  if (os.loadavg()[0] > os.cpus().length * 2) warnings.push('Load average is unusually high');
  return {
    check: 'system',
    status: statusFromFlags([warnings.length > 0]),
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    hostname,
    uptime,
    kernel,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    loadAverage: os.loadavg(),
    cpus: os.cpus().length,
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
      freePercent: Number(((os.freemem() / os.totalmem()) * 100).toFixed(2)),
      freeOutput: memory.stdout,
    },
    cpu: cpu.stdout,
    disk: disks,
    mounts: mounts.stdout.split(/\r?\n/).filter(Boolean).slice(0, 200),
    warnings,
    commands: { memory, cpu, disk, mounts },
  };
}
