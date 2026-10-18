// Monkey test: plays whole matches in the real app (dev server + Chrome), choosing random legal moves (bonuses too), and reports
// crashes, console errors, stuck matches and replays that do not reproduce the match. Slow (minutes); not part of CI.
// Run: node tests/monkey.mjs [matchesPerScenario]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../app/node_modules/playwright-core/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const N = Number(process.argv[2] ?? 2);
const PORT = 5197, BASE = `http://localhost:${PORT}/`;
const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p));
const ENGINE = `/@fs${root}/engine/rules.js`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: join(root, 'app'), stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ } await new Promise(r => setTimeout(r, 500)); }
const browser = await chromium.launch({ executablePath: CHROME });

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const SCENARIOS = [
  { name: 'solo easy 9', setup: { players: 1, level: 'easy', aiLevel: 'normal', boardSize: 9, bots: 14 } },
  { name: 'solo hard 13', setup: { players: 1, level: 'hard', aiLevel: 'normal', boardSize: 13, bots: 30 } },
  { name: '2p normal obstacles', setup: { players: 2, level: 'normal', aiLevel: 'normal', boardSize: 9, bots: 12, obstacles: true } },
  { name: '3p hard personas', setup: { players: 3, level: 'hard', aiLevel: 'hard', boardSize: 11, bots: 20, personas: true } },
  { name: '4p teams 15', setup: { players: 4, level: 'normal', aiLevel: 'normal', boardSize: 15, bots: 40, teams: true, obstacles: true } },
  { name: 'daily', setup: { players: 1, level: 'normal', aiLevel: 'normal', boardSize: 9, bots: 14, daily: new Date().toISOString().slice(0, 10) } },
];

let problems = 0;
const report = (what, why) => { problems++; console.error(`✗ ${what}: ${why}`); };

async function runMatch(label, setup, seedTag) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('xsword-settings', JSON.stringify({ tips: false, music: false, sound: false, haptics: false, fastBots: true, quick: true, speed: 'fast' }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}#/`);
  await page.waitForSelector('.menu');
  await page.evaluate(s => { const c = window.xsword; location.hash = '#/play'; c.newGame({ ...c.setup, moveSeconds: 20, puzzle: null, daily: null, ...s }); }, setup);
  const result = await page.evaluate(async ({ engine, tag }) => {
    const m = await import(engine);
    const c = window.xsword;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let last = '', lastChange = Date.now(), myMoves = 0, undos = 0, pauses = 0;
    while (true) {
      const v = c.getSnapshot(), st = c.state;
      const sig = `${v.phase}|${c.moves.length}|${v.sheet?.type ?? ''}`;
      if (sig !== last) { last = sig; lastChange = Date.now(); }
      if (Date.now() - lastChange > 20000) return { stuck: sig, round: st.round };
      if (st.over) break;
      if (v.sheet?.type === 'results' && st.decided && !st.over) { if (Math.random() < 0.5) c.resume(); else c.endNow(); await wait(50); continue; }
      if (v.sheet?.type === 'coach') { c.closeCoach(); await wait(50); continue; }
      if (v.phase === 'mine') {
        const me = c.myStar();
        // Now and then: pause and resume, undo (Easy only), or use a bonus.
        if (Math.random() < 0.03) { c.pause(); await wait(30); c.unpause(); pauses++; }
        if (c.canUndo && Math.random() < 0.05) { c.undo(); undos++; await wait(60); continue; }
        const held = Object.entries(st.seats[me.seat].bonuses).filter(([k, n]) => n > 0 && k !== 'armor').map(([k]) => k);
        let bonus = null;
        if (held.length && Math.random() < 0.3) { bonus = held[Math.floor(Math.random() * held.length)]; c.selectBonus(bonus); }
        const moves = m.legalMoves(st, me, st.mode, bonus).filter(x => (x.bonus ?? null) === bonus);
        const pool = moves.length ? moves : m.legalMoves(st, me, st.mode);
        if (!pool.length) { await wait(100); continue; }
        // Prefer takes and safe squares half the time, so matches last and reach the shrinks.
        const takes = pool.filter(x => x.type === 'take');
        const pick = takes.length && Math.random() < 0.5 ? takes[0] : pool[Math.floor(Math.random() * pool.length)];
        c.select(pick);
        myMoves++;
        if (myMoves > 400) return { tooLong: true, round: st.round };
      }
      await wait(40);
    }
    // The replay of this match must end in the same state.
    const spec = c.replaySpec();
    let replayOk = null;
    if (spec) {
      const R = c.constructor;
      const r = new R();
      r.loadReplay(spec);
      r.seek(1e9);
      replayOk = m.stateHash(r.state) === m.stateHash(c.state) && r.state.winner === c.state.winner;
      r.dispose();
    }
    const st = c.state;
    return { over: true, round: st.round, winner: st.winner, moves: c.moves.length, myMoves, undos, pauses, replayOk, ring: st.ring, tag };
  }, { engine: ENGINE, tag: seedTag });
  await page.waitForTimeout(2200); // the result card
  const sheet = await page.evaluate(() => window.xsword.getSnapshot().sheet?.type ?? null);
  if (await page.locator('.crash').count()) report(label, 'crash screen');
  if (errors.length) report(label, errors.slice(0, 3).join(' | ').slice(0, 400));
  if (result.stuck) report(label, `stuck at ${result.stuck} (round ${result.round})`);
  if (result.tooLong) report(label, `no end after 400 of my moves (round ${result.round})`);
  if (result.replayOk === false) report(label, 'the replay link does not reproduce the match');
  if (result.over && sheet !== 'results') report(label, `no result card at the end (sheet: ${sheet})`);
  console.log(`${result.over ? '✓' : '·'} ${label}: ${JSON.stringify(result)}`);
  await ctx.close();
}

for (const sc of SCENARIOS.filter(s => !ONLY || ONLY.test(s.name))) for (let i = 0; i < N; i++) await runMatch(`${sc.name} #${i + 1}`, sc.setup, i);
await browser.close();
console.log(`\n${problems ? `${problems} problem(s)` : 'no problems'}.`);
process.exit(problems ? 1 : 0);
