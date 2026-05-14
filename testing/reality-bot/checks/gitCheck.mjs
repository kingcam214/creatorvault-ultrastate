import { command, nowIso } from './utils.mjs';

export async function gitCheck() {
  const branch = await command('git', ['branch', '--show-current'], { timeout: 10000 });
  const statusShort = await command('git', ['status', '--short', '--branch'], { timeout: 10000 });
  const porcelain = await command('git', ['status', '--porcelain=v1'], { timeout: 10000 });
  const lastCommit = await command('git', ['log', '-1', '--pretty=format:%H%n%an%n%ae%n%aI%n%s'], { timeout: 10000 });
  const aheadBehind = await command('sh', ['-lc', 'git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || true'], { timeout: 10000 });
  const remote = await command('git', ['remote', '-v'], { timeout: 10000 });
  const dirtyLines = (porcelain.stdout || '').split(/\r?\n/).filter(Boolean);
  const commitParts = (lastCommit.stdout || '').split(/\r?\n/);
  const [aheadRaw, behindRaw] = (aheadBehind.stdout || '0 0').trim().split(/\s+/);
  const warnings = [];
  if (dirtyLines.length) warnings.push(`Git working tree has ${dirtyLines.length} changed/untracked file(s)`);
  if (Number(behindRaw || 0) > 0) warnings.push(`Branch is behind upstream by ${behindRaw} commit(s)`);
  return {
    check: 'git',
    status: warnings.length ? 'warn' : 'pass',
    ok: warnings.length === 0,
    generatedAt: nowIso(),
    branch: branch.stdout,
    statusShort: statusShort.stdout,
    dirtyFileCount: dirtyLines.length,
    dirtyFiles: dirtyLines.slice(0, 200),
    ahead: Number(aheadRaw || 0),
    behind: Number(behindRaw || 0),
    lastCommit: {
      hash: commitParts[0] || null,
      authorName: commitParts[1] || null,
      authorEmail: commitParts[2] || null,
      authoredAt: commitParts[3] || null,
      subject: commitParts.slice(4).join('\n') || null,
    },
    remote: remote.stdout,
    warnings,
    commands: { branch, statusShort, porcelain, lastCommit, aheadBehind, remote },
  };
}
