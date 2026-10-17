// Takes the raw App Store screenshots: the web game in real Chrome at an iPhone 6.9" viewport, in Turkish and English, for
// eight scenes (menu, a take with the sword stroke, bonuses, a puzzle with a hunter, new game, bonus guide, achievements, a
// solved puzzle). Needs the dev server (the scenes drive the match through `window.xsword`, which exists only in dev builds).
// Run:  node tools/make-store-screenshots.mjs <outDir>   then   python3 tools/compose-store-screenshots.py <outDir>
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../app/node_modules/playwright-core/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, 'store/raw'));
const PORT = 5199, BASE = `http://localhost:${PORT}/`;
const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p));
if (!CHROME) { console.error('no Chrome: set CHROME_PATH'); process.exit(1); }
const ENGINE = `/@fs${root}/engine/rules.js`;

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: join(root, 'app'), stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ } await new Promise(r => setTimeout(r, 500)); }
const browser = await chromium.launch({ executablePath: CHROME });

const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const NAMES = { tr: 'Kılıç 482', en: 'Sword 482' };
const STATS = {
  matches: 18, wins: 7, takes: 140, bestScore: 190, bestRounds: 14, totalMs: 5400000, dailyPlayed: 4,
  puzzleStars: { 201: 3, 202: 3, 203: 2, 101: 3, 102: 3, 103: 2, 104: 3, 105: 2 },
  cleanWins: 2, hardWins: 1, pairTakes: 1, onlineMatches: 0, fourWins: 0, winStreak: 2, bestStreak: 3,
};

async function scene(lang, no, name, run) {
  const ctx = await browser.newContext({ viewport: { width: 440, height: 860 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([l, n, stats, days]) => {
    localStorage.setItem('xsword-lang', l);
    localStorage.setItem('xsword-settings', JSON.stringify({ tips: false, music: false, sound: false, haptics: false }));
    localStorage.setItem('xsword-profile', JSON.stringify({ v: 1, id: 'store-shot', name: n, color: 0, provider: 'guest', providerId: null, providerName: null, createdAt: Date.now() }));
    localStorage.setItem('xsword-stats', JSON.stringify(stats));
    localStorage.setItem('xsword-daily-days', JSON.stringify(days));
    localStorage.setItem('xsword-rewards-seen', JSON.stringify(['night', 'none', 'emerald', 'ember', 'ice', 'violet', 'flame', 'bolt', 'crystal', 'gold']));
    localStorage.setItem('xsword-achievements-seen', JSON.stringify(['first-take', 'collector', 'regular', 'winner', 'hard-won', 'pure-sword', 'double-take', 'streak', 'puzzle-master']));
  }, [lang, NAMES[lang], STATS, [day(3), day(2), day(1), day(0)]]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}#/`);
  await page.waitForSelector('.menu', { timeout: 15000 });
  await run(page);
  const dir = join(out, lang);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${no}-${name}.png`) });
  if (errors.length) console.error(`! ${lang}/${name}: ${errors.join(' | ').slice(0, 200)}`);
  console.log(`✓ ${lang}/${no}-${name}`);
  await ctx.close();
}

// Helpers that run inside the page.
const waitMine = page => page.waitForFunction(() => window.xsword?.getSnapshot().phase === 'mine', null, { timeout: 30000 });
const startPuzzle = (page, id) => page.evaluate(id => { const c = window.xsword; location.hash = '#/play'; c.setup = { ...c.setup, puzzle: id }; c.newGame(c.setup); }, id);
const takeNow = (page) => page.evaluate(async engine => {
  const m = await import(engine);
  const c = window.xsword, a = c.myStar();
  const mv = m.legalMoves(c.state, a, c.state.mode).find(x => x.type === 'take');
  c.select(mv); c.confirm();
}, ENGINE);
const quickMatch = async page => { await page.evaluate(() => { const c = window.xsword; location.hash = '#/play'; c.newGame({ ...c.setup, puzzle: null, daily: null, players: 1, level: 'normal' }); }); await waitMine(page); };

for (const lang of ['tr', 'en']) {
  await scene(lang, '01', 'menu', async page => { await page.waitForTimeout(800); });
  await scene(lang, '02', 'take', async page => {
    // A full match; a bot is moved next to your star so a take is possible, then you take it and the sword stroke is on screen.
    await quickMatch(page);
    await page.evaluate(async engine => {
      const m = await import(engine), c = window.xsword, a = c.myStar();
      const step = m.legalMoves(c.state, a, c.state.mode).find(x => x.type === 'walk');
      const bot = c.state.pieces.find(p => p.alive && (p.kind === 'red' || p.kind === 'blue'));
      bot.r = step.r; bot.c = step.c; c.state.seats[0].score = 20; c.emit({});
    }, ENGINE);
    await takeNow(page); await page.waitForTimeout(200);
  });
  await scene(lang, '03', 'bonuses', async page => {
    await quickMatch(page);
    await page.evaluate(() => { const c = window.xsword; c.state.seats[0].bonuses = { armor: 1, step: 1, double: 1, swap: 1 }; c.state.seats[0].score = 24; c.emit({}); c.selectBonus('double'); });
    await page.waitForTimeout(600);
  });
  await scene(lang, '04', 'hunter', async page => { await startPuzzle(page, 101); await waitMine(page); await page.waitForTimeout(900); });
  await scene(lang, '05', 'new-game', async page => {
    await page.locator('.menu-btn, .menu-play').filter({ hasText: lang === 'tr' ? 'Yeni oyun' : 'New game' }).first().click();
    await page.waitForSelector('.sheet');
    await page.locator('.sheet [role=radio]').filter({ hasText: /^2/ }).first().click();
    await page.waitForTimeout(500);
  });
  await scene(lang, '06', 'bonus-guide', async page => { await quickMatch(page); await page.evaluate(() => { window.xsword.state.seats[0].score = 24; window.xsword.openBonusGuide(); }); await page.waitForSelector('.sheet'); await page.waitForTimeout(600); });
  await scene(lang, '07', 'achievements', async page => {
    await page.goto(`${BASE}#/stats`); await page.reload(); await page.waitForSelector('.ach');
    await page.evaluate(() => document.querySelector('.rules-body').scrollTo(0, document.querySelector('.rules-body h2').offsetTop - 70));
    await page.waitForTimeout(500);
  });
  await scene(lang, '08', 'solved', async page => { await startPuzzle(page, 201); await waitMine(page); await takeNow(page); await page.waitForSelector('.sheet', { timeout: 15000 }); await page.waitForTimeout(1800); });
}
await browser.close();
stop();
