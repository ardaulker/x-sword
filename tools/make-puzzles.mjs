// Bulmaca üretici: rastgele pozisyonlar dener, çözücüyle en az kaç hamlede çözüldüğünü bulur ve app/src/game/puzzles.ts'e yazar.
// Çalıştır: node tools/make-puzzles.mjs
import { writeFileSync } from 'node:fs';
import { createPuzzle, currentActor, legalMoves, play } from '../engine/rules.js';
import { chooseMove } from '../engine/bots.js';

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

// Kalan hamle hakkıyla kazanılabilir mi? Kazandıran ilk hamle sayısını da döndürür.
function solve(st, depth) {
  let wins = 0;
  for (const m of legalMoves(st, currentActor(st), st.mode)) {
    const c = structuredClone(st);
    play(c, m);
    afterMine(c);
    if (c.over) { if (c.winner === 0) wins++; continue; }
    if (depth > 1 && solve(c, depth - 1).wins) wins++;
  }
  return { wins };
}

const found = { 2: [], 3: [], 4: [] };
const want = { 2: 5, 3: 5, 4: 4 };
console.log('başladı');
const t0 = Date.now();
let tried = 0;
while (Object.keys(want).some(k => found[k].length < want[k]) && Date.now() - t0 < 420000) {
  tried++;
  const me = [1 + pick(7), 1 + pick(7)];
  const n = 2 + pick(3); // 2–4 bot
  const bots = [], used = new Set([`${me}`]);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 20; k++) {
      const r = pick(9), c = pick(9);
      const dist = Math.max(Math.abs(r - me[0]), Math.abs(c - me[1]));
      if (used.has(`${r},${c}`) || dist < 2 || dist > 5) continue;
      used.add(`${r},${c}`); bots.push({ kind: rnd() < 0.5 ? 'red' : 'blue', r, c }); break;
    }
  }
  if (bots.length < 2) continue;
  const mode = rnd() < 0.5 ? 'DUZ' : 'CAPRAZ';
  const st = createPuzzle({ me, bots, limit: 99, mode });
  let par = 0, firstWins = 0;
  for (let d = 2; d <= 4; d++) {
    const r = solve(st, d);
    if (r.wins) { par = d; firstWins = r.wins; break; }
  }
  if (!par || firstWins > 3 || found[par].length >= want[par]) continue;
  found[par].push({ me, bots, par, mode });
  console.log(`bulmaca: ${n} bot, ${par} hamle, ${firstWins} çözüm (${tried}. deneme)`);
}
const all = [...found[2], ...found[3], ...found[4]].map((p, i) => ({ id: i + 1, ...p }));
const body = `// Bu dosya tools/make-puzzles.mjs ile üretildi. Her bulmaca en çok par+1 hamlede çözülür; par'da çözmek 3 yıldız.\nimport type { Mode } from '../../../engine/rules.js';\n\nexport interface PuzzleDef {\n  id: number;\n  me: [number, number];\n  bots: { kind: 'red' | 'blue'; r: number; c: number }[];\n  par: number;\n  mode: Mode;\n}\n\nexport const PUZZLES: PuzzleDef[] = ${JSON.stringify(all, null, 2)};\n`;
writeFileSync(new URL('../app/src/game/puzzles.ts', import.meta.url), body);
console.log(`${all.length} bulmaca yazıldı (${tried} deneme, ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
