// Smoke test: opens the built game in a real Chrome and visits the screens. It fails on any console error, uncaught
// exception or crash screen. Run after a build:  npm --prefix app run build && node tests/smoke.mjs
// Chrome: CHROME_PATH, or the usual install paths (the GitHub runner has google-chrome). No browser download is needed.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from '../app/node_modules/playwright-core/index.mjs';

const PORT = 4199, BASE = `http://localhost:${PORT}/`;
const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p));
if (!CHROME) { console.error('✗ no Chrome found: set CHROME_PATH'); process.exit(1); }

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: new URL('../app/', import.meta.url), stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 500)); }

const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
let failures = 0, checks = 0;
const fail = (what, why) => { failures++; console.error(`✗ ${what}: ${why}`); };
const ok = what => { checks++; console.log(`✓ ${what}`); };

async function visit(lang, label, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(l => { localStorage.setItem('xsword-lang', l); localStorage.setItem('xsword-settings', JSON.stringify({ tips: false, music: false })); }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  try {
    await fn(page);
    if (await page.locator('.crash').count()) throw new Error('the crash screen is showing');
    if (errors.length) throw new Error(errors.join(' | ').slice(0, 300));
    ok(`${label} [${lang}]`);
  } catch (e) { fail(`${label} [${lang}]`, e.message.split('\n')[0]); }
  await ctx.close();
}

const open = async (page, hash, selector = '#root > *') => { await page.goto(`${BASE}#/${hash}`); await page.reload(); await page.waitForSelector(selector, { timeout: 8000 }); };

for (const lang of ['en', 'tr']) {
  for (const route of ['', 'rules', 'settings', 'legal', 'legal/privacy', 'puzzles', 'stats', 'profile', 'multiplayer', 'replay/garbage', 'oyun']) {
    await visit(lang, `route #/${route}`, async page => {
      await open(page, route, route === 'oyun' ? '.board-frame' : '#root > *');
      await page.waitForTimeout(500);
      const text = (await page.locator('#root').innerText()).trim();
      if (text.length < 5) throw new Error('the screen is empty');
    });
  }
}

for (const lang of ['en', 'tr']) {
  await visit(lang, 'match from Quick match plays on', async page => {
    await open(page, '', '.menu');
    await page.locator('button', { hasText: lang === 'tr' ? 'Hızlı oyun' : 'Quick match' }).click();
    await page.waitForSelector('.countdown', { timeout: 8000 });
    await page.waitForSelector('.countdown', { state: 'detached', timeout: 8000 });
    await page.waitForSelector('.board-frame', { timeout: 8000 });
    await page.waitForTimeout(3000); // the first mode card and the first moves
  });
  await visit(lang, 'a puzzle with a hunter opens', async page => {
    await open(page, 'puzzles', '#root > *');
    await page.locator('.puzzle-btn', { hasText: lang === 'tr' ? 'Koridor' : 'Corridor' }).first().click();
    await page.waitForSelector('.board-frame .is-walker', { timeout: 8000 });
  });
}

await browser.close();
stop();
console.log(`\n${failures ? `${failures} failed` : 'all passed'}, ${checks} checks ok.`);
process.exit(failures ? 1 : 0);
