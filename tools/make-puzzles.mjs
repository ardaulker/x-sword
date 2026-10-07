// Puzzle generator: places pieces on the hand-drawn maps in tools/puzzle-maps.mjs, finds with the solver
// the fewest moves that solve each one, and writes app/src/game/puzzles.ts.
// A placement is accepted when: it is solved in exactly par moves, the first move has at most 2 right choices,
// the player takes every bot in the solution (bots don't solve it by taking each other), and with needBonus it
// can't be solved without the bonus.
// Run: node tools/make-puzzles.mjs   (one map only: node tools/make-puzzles.mjs 107)
// Regenerate one map at a time: a full run shifts the random sequence and changes every puzzle.
import { writeFileSync } from 'node:fs';
import { createPuzzle, currentActor, legalMoves, play } from '../engine/rules.js';
import { chooseMove } from '../engine/bots.js';
import { MAPS } from './puzzle-maps.mjs';
import { PUZZLES as OLD } from './puzzles-out.mjs';

let seed = 20261007;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = n => Math.floor(rnd() * n);

// The bots play in order after your move.
function afterMine(st) {
  while (!st.over) {
    const a = currentActor(st);
    if (a.id === 's0') break;
    play(st, chooseMove(st, a));
  }
}

function myMoves(st) {
  const a = currentActor(st), out = [...legalMoves(st, a, st.mode)];
  for (const b of ['step', 'double', 'swap']) if (st.seats[0].bonuses[b] > 0) out.push(...legalMoves(st, a, st.mode, b));
  return out;
}

const bots = st => st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue').length;

// Can it be won within depth moves? mine: must the player take every bot.
function wins(st, depth, mine) {
  for (const m of myMoves(st)) {
    const c = structuredClone(st);
    play(c, m);
    if (currentActor(c)?.id !== 's0' || c.over) afterMine(c); // with a double move the turn stays ours
    if (c.over) { if (c.winner === 0 && (!mine || c.seats[0].takes === bots(c))) return true; continue; }
    if (depth > 1 && wins(c, depth - 1, mine)) return true;
  }
  return false;
}

// How many right choices the first move has (stops at 3).
function firstChoices(st, depth) {
  let n = 0;
  for (const m of myMoves(st)) {
    const c = structuredClone(st);
    play(c, m);
    if (currentActor(c)?.id !== 's0' || c.over) afterMine(c);
    const ok = c.over ? c.winner === 0 && c.seats[0].takes === bots(c) : depth > 1 && wins(c, depth - 1, true);
    if (ok && ++n >= 3) break;
  }
  return n;
}

// How many traps the first move has: moves that get you taken before your turn comes back.
function traps(st) {
  let n = 0;
  for (const m of myMoves(st)) {
    const c = structuredClone(st);
    play(c, m);
    if (currentActor(c)?.id !== 's0' || c.over) afterMine(c);
    if (!c.pieces.find(p => p.id === 's0').alive) n++;
  }
  return n;
}

// Place you and the bots on the map; fixed pieces stay where the map has them.
function place(def) {
  const grid = def.map.map(row => [...row]);
  const floor = [];
  grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === '.') floor.push([r, c]); }));
  const take = () => floor.splice(pick(floor.length), 1)[0];
  let me = null;
  grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'S') me = [r, c]; }));
  if (!me) { me = take(); grid[me[0]][me[1]] = 'S'; }

  for (let i = 0; i < def.bots; i++) {
    for (let k = 0; k < 30; k++) {
      const j = pick(floor.length), [r, c] = floor[j];
      const d = Math.max(Math.abs(r - me[0]), Math.abs(c - me[1]));
      if (d < 2 || (def.near && d > def.near)) continue; // near: bots at most this far from you
      floor.splice(j, 1);
      grid[r][c] = rnd() < 0.5 ? 'R' : 'B';
      break;
    }
  }
  // botCols: at least one bot must be in this column range (e.g. the other island); otherwise the placement is invalid.
  if (def.botCols && !grid.some(row => row.some((ch, c) => (ch === 'R' || ch === 'B') && c >= def.botCols[0] && c <= def.botCols[1]))) return null;
  return grid.map(row => row.join(''));
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
const META = def => ({ id: def.id, title: def.title, hint: def.hint, tutorial: !!def.tutorial, mode: def.mode, bonuses: def.bonuses ?? null, ...(def.shrink ? { shrink: def.shrink } : {}) });
const out = [];
for (const def of MAPS) {
  if (only && def.id !== only) { const old = OLD.find(p => p.id === def.id); if (old) out.push({ tutorial: false, ...old }); continue; }
  if (def.fixed) {
    // Fixed map: only verify it with the solver (it must be solved in exactly par moves).
    const st = createPuzzle({ map: def.map, limit: 99, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink });
    let par = 0;
    for (let d = 1; d <= 6; d++) if (wins(st, d, true)) { par = d; break; }
    console.log(`${def.id} ${def.title}: fixed map, solved in ${par} moves (expected ${def.par})`);
    if (par !== def.par) { console.log('   ERROR: par does not match'); process.exitCode = 1; continue; }
    out.push({ ...META(def), par, map: def.map });
    continue;
  }
  const t0 = Date.now();
  let best = null, tried = 0;
  const why = {};
  const no = k => { why[k] = (why[k] ?? 0) + 1; };
  while (Date.now() - t0 < (process.env.T ? Number(process.env.T) : 60000)) {
    tried++;
    const map = place(def);
    if (!map) continue;
    const st = createPuzzle({ map, limit: 99, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink });
    if (bots(st) < def.bots) { no('az bot'); continue; }
    let par = 0;
    for (let d = def.bots; d <= def.par; d++) if (wins(st, d, false)) { par = d; break; }
    if (!par) { no('unsolvable'); continue; }
    if (par < (def.id > 110 ? def.par : def.par - 1)) { no('too short'); continue; } // shorter than the target (the second set requires exact par)
    const n = firstChoices(st, par);
    if (!n) { no('player does not take the bots'); continue; }
    if (def.trap && !traps(st)) { no('no trap'); continue; }
    if (def.needBonus) {
      const bare = createPuzzle({ map, limit: 99, mode: def.mode, shrink: def.shrink });
      if (wins(bare, par + 1, false)) { no('solvable without the bonus'); continue; }
    }
    if (!best || n < best.n || (n === best.n && par > best.par)) best = { map, n, par };
    if (n === 1 && par === def.par) break;
  }
  if (!best) { console.log(`${def.id} ${def.title}: not found (${tried} tries)`, why); continue; }
  console.log(`${def.id} ${def.title}: ${best.par} moves, ${best.n} right first move(s), ${traps(createPuzzle({ map: best.map, limit: 99, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink }))} trap(s) (${tried} tries)`);
  console.log(best.map.map(r => '   ' + r).join('\n'));
  out.push({ ...META(def), par: best.par, map: best.map });
}

const body = `// Generated by tools/make-puzzles.mjs (maps in tools/puzzle-maps.mjs). Each puzzle allows at most par+1 moves; solving in par gives 3 stars.
// map: '.' floor, '#' obstacle, '-' off the map, 'S' you, 'R' red bot, 'B' blue bot.
import type { BonusKind, Mode } from '../../../engine/rules.js';

export interface PuzzleDef {
  id: number;
  title: string;
  hint: string;
  tutorial: boolean;
  mode: Mode;
  par: number;
  bonuses: Partial<Record<BonusKind, number>> | null;
  shrink?: { start: number; every: number };
  map: string[];
}

export const PUZZLES: PuzzleDef[] = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(new URL('../app/src/game/puzzles.ts', import.meta.url), body);
writeFileSync(new URL('./puzzles-out.mjs', import.meta.url), `// Last output of make-puzzles.mjs (when one map is regenerated, the others are taken from here).\nexport const PUZZLES = ${JSON.stringify(out, null, 2)};\n`);
console.log(`${out.length} puzzles written.`);
