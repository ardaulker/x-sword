// Layout check: opens every screen (and a match) on small, normal and wide phones and in landscape, in Turkish and German
// (the longest words), and reports text or boxes that stick out of the screen or out of their own box.
// Run after a build: node tests/layout.mjs   (uses `vite preview` on the built app)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../app/node_modules/playwright-core/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4196, BASE = `http://localhost:${PORT}/`;
const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: join(root, 'app'), stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ } await new Promise(r => setTimeout(r, 500)); }
const browser = await chromium.launch({ executablePath: CHROME });

const SIZES = [[320, 568], [375, 667], [390, 844], [430, 932], [844, 390], [768, 1024]];
const ROUTES = ['', 'settings', 'legal', 'puzzles', 'stats', 'profile', 'multiplayer', 'rules', 'play'];
let issues = 0;

for (const lang of ['tr', 'de']) for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true });
  await ctx.addInitScript(l => { localStorage.setItem('xsword-lang', l); localStorage.setItem('xsword-settings', JSON.stringify({ tips: false, sound: false, music: false })); }, lang);
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(`${BASE}#/${route}`); await page.reload();
    await page.waitForTimeout(route === 'play' ? 5500 : 700);
    const found = await page.evaluate(() => {
      const out = [];
      const W = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);
      for (const el of document.querySelectorAll('button, .panel, .sheet, h1, h2, h3, b, .menu-play-text span, .toast, .pill, .seg button')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (el.matches('.bonus, .bonus-info, .seat-x')) continue; // a count badge and 44 px tap areas stick out on purpose
        if (r.right > W + 1 || r.left < -1) out.push(`${el.className || el.tagName} "${(el.textContent || '').trim().slice(0, 30)}" leaves the screen (${Math.round(r.left)}..${Math.round(r.right)})`);
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto' && getComputedStyle(el).overflowX !== 'scroll' && el.clientWidth > 0) out.push(`${el.className || el.tagName} "${(el.textContent || '').trim().slice(0, 30)}" text overflows its box`);
      }
      return [...new Set(out)].slice(0, 6);
    });
    for (const f of found) {
      issues++;
      const line = `${lang} ${w}×${h} #/${route}: ${f}`;
      console.log(`✗ ${line}`);
      if (process.env.GITHUB_ACTIONS) console.log(`::error title=Layout::${line}`); // shows as a public annotation on the run
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${issues ? `${issues} layout issue(s)` : 'no layout issues'}.`);
process.exit(issues ? 1 : 0);
