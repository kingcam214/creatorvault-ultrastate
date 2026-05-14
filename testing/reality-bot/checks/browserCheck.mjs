import fs from 'node:fs/promises';
import path from 'node:path';
import { command, ensureDir, nowIso, pathExists, projectPath } from './utils.mjs';

async function findChromiumExecutable() {
  for (const candidate of ['/snap/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) {
    if (await pathExists(candidate)) return candidate;
  }
  const which = await command('sh', ['-lc', 'command -v chromium || command -v chromium-browser || command -v google-chrome || true']);
  return which.stdout || null;
}

export async function browserCheck(options = {}) {
  const url = options.url || 'https://creatorvault.live/';
  const screenshotDir = projectPath('testing/reality-bot/screenshots');
  await ensureDir(screenshotDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(screenshotDir, `homepage-${timestamp}.png`);
  const warnings = [];
  let browser;
  try {
    const { chromium } = await import('playwright');
    const executablePath = await findChromiumExecutable();
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    };
    if (executablePath) launchOptions.executablePath = executablePath;
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.locator('#root').waitFor({ state: 'attached', timeout: 15000 }).catch(() => warnings.push('Root application node did not attach within 15 seconds'));
    const title = await page.title();
    const bodyText = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
    const rootBox = await page.locator('#root').boundingBox().catch(() => null);
    const heroVisible = /Creator Empire OS|CreatorVault|Your Creator/i.test(bodyText);
    const whiteScreen = !bodyText.trim() || (rootBox && rootBox.height < 100);
    const jsLoaded = Boolean(await page.locator('#root').count().catch(() => 0));
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 30000 });
    const st = await fs.stat(screenshotPath);
    if (!heroVisible) warnings.push('Expected homepage branding/hero text was not detected');
    if (whiteScreen) warnings.push('Possible white screen detected');
    if (!jsLoaded) warnings.push('Root application node was not detected');
    return {
      check: 'browser',
      status: warnings.length ? 'warn' : 'pass',
      ok: warnings.length === 0,
      generatedAt: nowIso(),
      url,
      httpStatus: response?.status() || null,
      title,
      visibleBranding: heroVisible,
      whiteScreenDetected: Boolean(whiteScreen),
      jsLoaded,
      screenshotPath,
      screenshotSizeBytes: st.size,
      bodyExcerpt: bodyText.slice(0, 1000),
      warnings,
    };
  } catch (error) {
    return {
      check: 'browser',
      status: 'fail',
      ok: false,
      generatedAt: nowIso(),
      url,
      screenshotPath,
      error: String(error?.stack || error?.message || error),
      warnings: ['Browser screenshot check failed'],
    };
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}
