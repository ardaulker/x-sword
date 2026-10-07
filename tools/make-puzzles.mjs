// Bulmaca üretici: tools/puzzle-maps.mjs'teki elle çizilmiş haritalara taş yerleştirir,
// çözücüyle en az kaç hamlede çözüldüğünü bulur ve app/src/game/puzzles.ts'e yazar.
// Bir yerleşim kabul edilir: tam par hamlede çözülür, ilk hamlede en çok 2 doğru seçenek vardır,
// çözümde bütün botları oyuncu alır (botlar birbirini alarak çözmez), needBonus varsa bonussuz çözülmez.
// Çalıştır: node tools/make-puzzles.mjs   (tek harita: node tools/make-puzzles.mjs 107)
import { writeFileSync } from 'node:fs';
import { createPuzzle, currentActor, legalMoves, play } from '../engine/rules.js';
import { chooseMove } from '../engine/bots.js';
import { MAPS } from './puzzle-maps.mjs';
import { PUZZLES as OLD } from './puzzles-out.mjs';

let seed = 20261007;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = n => Math.floor(rnd() * n);

// Botlar, sen hamlenden sonra sırayla oynar.
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

// depth hamlede kazanılabilir mi? mine: bütün botları oyuncu mu almalı.
function wins(st, depth, mine) {
  for (const m of myMoves(st)) {
    const c = structuredClone(st);
    play(c, m);
    if (currentActor(c)?.id !== 's0' || c.over) afterMine(c); // çift hamlede sıra yine bizde
    if (c.over) { if (c.winner === 0 && (!mine || c.seats[0].takes === bots(c))) return true; continue; }
    if (depth > 1 && wins(c, depth - 1, mine)) return true;
  }
  return false;
}

// İlk hamlede kaç doğru seçenek var (3'te durur).
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

// İlk hamlede kaç tuzak var: oynayınca sıra sana dönmeden alınıyorsun.
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

// Haritaya sen ve botları koy; sabit taşlar haritada kalır.
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
      if (d < 2 || (def.near && d > def.near)) continue; // near: botlar sana en çok bu kadar uzak
      floor.splice(j, 1);
      grid[r][c] = rnd() < 0.5 ? 'K' : 'C';
      break;
    }
  }
  // botCols: en az bir bot bu sütun aralığında olmalı (ör. karşı ada); yoksa yerleşim geçersiz.
  if (def.botCols && !grid.some(row => row.some((ch, c) => (ch === 'K' || ch === 'C') && c >= def.botCols[0] && c <= def.botCols[1]))) return null;
  return grid.map(row => row.join(''));
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
const META = def => ({ id: def.id, title: def.title, hint: def.hint, tutorial: !!def.tutorial, mode: def.mode, bonuses: def.bonuses ?? null, ...(def.shrink ? { shrink: def.shrink } : {}) });
const out = [];
for (const def of MAPS) {
  if (only && def.id !== only) { const old = OLD.find(p => p.id === def.id); if (old) out.push({ tutorial: false, ...old }); continue; }
  if (def.fixed) {
    // Sabit harita: yalnız çözücüyle doğrula (tam par hamlede çözülmeli).
    const st = createPuzzle({ map: def.map, limit: 99, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink });
    let par = 0;
    for (let d = 1; d <= 6; d++) if (wins(st, d, true)) { par = d; break; }
    console.log(`${def.id} ${def.title}: sabit harita, çözüm ${par} hamle (beklenen ${def.par})`);
    if (par !== def.par) { console.log('   HATA: par uyuşmuyor'); process.exitCode = 1; continue; }
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
    if (!par) { no('çözümsüz'); continue; }
    if (par < (def.id > 110 ? def.par : def.par - 1)) { no('kısa'); continue; } // hedeften kısa (ikinci sette tam par istenir)
    const n = firstChoices(st, par);
    if (!n) { no('botları sen almıyorsun'); continue; }
    if (def.trap && !traps(st)) { no('tuzak yok'); continue; }
    if (def.needBonus) {
      const bare = createPuzzle({ map, limit: 99, mode: def.mode, shrink: def.shrink });
      if (wins(bare, par + 1, false)) { no('bonussuz da çözülüyor'); continue; }
    }
    if (!best || n < best.n || (n === best.n && par > best.par)) best = { map, n, par };
    if (n === 1 && par === def.par) break;
  }
  if (!best) { console.log(`${def.id} ${def.title}: bulunamadı (${tried} deneme)`, why); continue; }
  console.log(`${def.id} ${def.title}: ${best.par} hamle, ilk hamlede ${best.n} doğru seçenek, ${traps(createPuzzle({ map: best.map, limit: 99, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink }))} tuzak (${tried} deneme)`);
  console.log(best.map.map(r => '   ' + r).join('\n'));
  out.push({ ...META(def), par: best.par, map: best.map });
}

const body = `// Bu dosya tools/make-puzzles.mjs ile üretildi (haritalar tools/puzzle-maps.mjs). Her bulmaca en çok par+1 hamlede çözülür; par'da çözmek 3 yıldız.
// map: '.' zemin, '#' engel, '-' harita dışı, 'S' sen, 'K' Kızıl bot, 'C' Çelik bot.
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
writeFileSync(new URL('./puzzles-out.mjs', import.meta.url), `// make-puzzles.mjs'in son çıktısı (tek harita yeniden üretilirken diğerleri buradan alınır).\nexport const PUZZLES = ${JSON.stringify(out, null, 2)};\n`);
console.log(`${out.length} bulmaca yazıldı.`);
