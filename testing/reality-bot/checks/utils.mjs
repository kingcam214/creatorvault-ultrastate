import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export function nowIso() {
  return new Date().toISOString();
}

export async function command(cmd, args = [], options = {}) {
  const startedAt = nowIso();
  try {
    const result = await execFileAsync(cmd, args, {
      timeout: options.timeout ?? 15000,
      maxBuffer: options.maxBuffer ?? 1024 * 1024 * 10,
      cwd: options.cwd,
      env: options.env ?? process.env,
    });
    return {
      ok: true,
      cmd,
      args,
      startedAt,
      finishedAt: nowIso(),
      stdout: String(result.stdout ?? '').trim(),
      stderr: String(result.stderr ?? '').trim(),
      code: 0,
    };
  } catch (error) {
    return {
      ok: false,
      cmd,
      args,
      startedAt,
      finishedAt: nowIso(),
      stdout: String(error.stdout ?? '').trim(),
      stderr: String(error.stderr ?? error.message ?? '').trim(),
      code: typeof error.code === 'number' ? error.code : 1,
    };
  }
}

export async function commandText(cmd, args = [], options = {}) {
  const result = await command(cmd, args, options);
  return result.stdout || result.stderr || '';
}

export function statusFromFlags(flags = []) {
  if (flags.some(Boolean)) return 'warn';
  return 'pass';
}

export function failSafeError(name, error) {
  return {
    check: name,
    status: 'fail',
    ok: false,
    error: String(error?.stack || error?.message || error),
    generatedAt: nowIso(),
  };
}

export async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export function projectPath(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

export async function loadDotEnvReadOnly(envPath = '.env') {
  try {
    const raw = await fs.readFile(projectPath(envPath), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
    return { loaded: true, path: envPath };
  } catch (error) {
    return { loaded: false, path: envPath, error: String(error.message || error) };
  }
}

export function redactConnectionString(value = '') {
  return String(value).replace(/:\/\/([^:]+):([^@]+)@/, '://$1:[REDACTED]@');
}

export async function statSummary(filePath) {
  try {
    const st = await fs.stat(filePath);
    return {
      path: filePath,
      exists: true,
      sizeBytes: st.size,
      modifiedAt: st.mtime.toISOString(),
      isDirectory: st.isDirectory(),
      isFile: st.isFile(),
    };
  } catch (error) {
    return {
      path: filePath,
      exists: false,
      error: String(error.message || error),
    };
  }
}
