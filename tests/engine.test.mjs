// Tests for the rules engine and the bots: node tests/engine.test.mjs
import assert from 'node:assert/strict';
import {
  createGame, endMatch, maxNeutrals, createPuzzle, isWinner, friendly, play, currentActor, legalMoves, attackersOf, isSafe, collapseDue, ringOf,
  roundOrder, random, pieceById, threatsFor, ranking, SIZE_BY_STARS, NEUTRALS_BY_STARS, POINTS, SURVIVOR_BONUS,
} from '../engine/rules.js';
import { chooseMove, targetOf } from '../engine/bots.js';

let passed = 0;
const pending = [];
function test(name, fn) {
  const done = () => { passed++; console.log(`✓ ${name}`); };
  const r = fn();
  if (r && typeof r.then === 'function') pending.push(r.then(done));
  else done();
}

const seats = (n, kind = 'human', level = 'normal') => Array.from({ length: n }, () => ({ kind, level }));

// A small hand-made position: the board is empty except for the given pieces.
// Corners are fixed (s0 top left); order: stars first, then bots by number.
function position(pieces, { n = 2, mode = 'STRAIGHT' } = {}) {
  const st = createGame({ seats: seats(n), seed: 1, neutrals: 0, shuffle: false });
  const stars = st.pieces.filter(p => p.kind === 'star');
  st.pieces = [...stars, ...pieces.map((p, i) => ({ id: `b${i + 1}`, label: String(i + 1), alive: true, ...p }))];
  st.mode = mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  return st;
}

// ---------------------------------------------------------------- rules

test('board size and bot count grow with the number of stars', () => {
  for (const n of [2, 3, 4]) {
    const st = createGame({ seats: seats(n), seed: n });
    assert.equal(st.size, SIZE_BY_STARS[n]);
    assert.equal(st.pieces.filter(p => p.kind !== 'star').length, NEUTRALS_BY_STARS[n]);
    const stars = st.pieces.filter(p => p.kind === 'star');
    for (const b of st.pieces.filter(p => p.kind !== 'star')) {
      for (const s of stars) assert.ok(Math.max(Math.abs(b.r - s.r), Math.abs(b.c - s.c)) >= 3, 'bot too close to a star');
    }
  }
});

test('the same seed builds the same game', () => {
  const a = createGame({ seats: seats(3), seed: 42 }), b = createGame({ seats: seats(3), seed: 42 });
  assert.deepEqual(a.pieces, b.pieces);
});

test('red walks straight and takes diagonally, blue the reverse', () => {
  const st = position([{ kind: 'red', r: 4, c: 4 }, { kind: 'blue', r: 3, c: 3 }, { kind: 'blue', r: 3, c: 4 }]);
  const red = pieceById(st, 'b1');
  const moves = legalMoves(st, red);
  assert.deepEqual(moves.filter(m => m.type === 'walk').map(m => `${m.r},${m.c}`).sort(), ['4,3', '4,5', '5,4']);
  assert.deepEqual(moves.filter(m => m.type === 'take').map(m => m.targetId), ['b2']);
  const blue = pieceById(st, 'b3');
  // Blue at (3,4) takes straight: both the red below and the blue to the left.
  assert.deepEqual(legalMoves(st, blue).filter(m => m.type === 'take').map(m => m.targetId), ['b1', 'b2']);
});

test('a star walks and takes in the mode direction', () => {
  const st = position([{ kind: 'red', r: 2, c: 1 }, { kind: 'red', r: 2, c: 2 }], { mode: 'STRAIGHT' });
  const star = pieceById(st, 's0'); // (1,1)
  assert.deepEqual(legalMoves(st, star, 'STRAIGHT').filter(m => m.type === 'take').map(m => m.targetId), ['b1']);
  assert.deepEqual(legalMoves(st, star, 'DIAGONAL').filter(m => m.type === 'take').map(m => m.targetId), ['b2']);
});

test('the order is shuffled once and kept all match; the mode flips every round', () => {
  const st = createGame({ seats: seats(3), seed: 3 });
  const first = [...st.order];
  assert.equal(first.length, st.pieces.length);
  // A bot's number is its place in the order.
  first.forEach((id, i) => { const p = pieceById(st, id); if (p.kind !== 'star') assert.equal(p.label, String(i + 1)); });
  while (st.round === 1) play(st, legalMoves(st, currentActor(st), st.mode)[0] ?? null);
  assert.equal(st.mode, 'DIAGONAL');
  assert.deepEqual(st.order, first.filter(id => pieceById(st, id).alive));
  // Across matches the order and corners vary; stars also land between bots.
  const starFirst = new Set(), corners = new Set();
  for (let seed = 1; seed <= 200; seed++) { // first place with 1/16 chance; 40 seeds are sometimes not enough
    const g = createGame({ seats: seats(2), seed });
    starFirst.add(g.order.indexOf('s0') === 0);
    corners.add(`${pieceById(g, 's0').r},${pieceById(g, 's0').c}`);
  }
  assert.deepEqual([...starFirst].sort(), [false, true]);
  assert.equal(corners.size, 4);
});

test('easy: you move first; in single player the Twin comes right after you', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assert.equal(createGame({ seats: seats(4), seed, firstSeat: 0 }).order[0], 's0');
    assert.deepEqual(createGame({ seats: seats(1), seed, firstSeat: 0 }).order.slice(0, 2), ['s0', 'tw']);
    const solo = createGame({ seats: seats(1), seed });
    assert.equal(solo.order.indexOf('tw'), solo.order.indexOf('s0') + 1);
  }
});

test('a taken bot\'s turn is skipped at once', () => {
  const st = position([{ kind: 'red', r: 8, c: 0 }, { kind: 'red', r: 0, c: 8 }]);
  pieceById(st, 'b1').alive = false;
  play(st, legalMoves(st, currentActor(st), st.mode)[0]); // s0
  play(st, legalMoves(st, currentActor(st), st.mode)[0]); // s1
  assert.equal(currentActor(st).id, 'b2');
});

test('taking: the target leaves, the star\'s take count grows, the log says "took"', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }]);
  play(st, { r: 2, c: 1 });
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.equal(st.seats[0].takes, 1);
  assert.match(st.log.at(-1).text, new RegExp(`Turquoise took #${pieceById(st, 'b1').label}!`));
  assert.ok(!st.log.some(l => /\bate\b|\beat\b/.test(l.text))); // pieces are taken, never eaten
});

test('the game ends when one star is left', () => {
  const st = position([]);
  const s1 = pieceById(st, 's1');
  s1.r = 2; s1.c = 1; // s0 (1,1) can take s1 below it in STRAIGHT mode
  play(st, { r: 2, c: 1 });
  assert.equal(st.over, true);
  assert.equal(st.winner, 0);
  assert.match(st.log.at(-1).text, /Turquoise won/);
});

test('points: bot 10, player 50; the survivor gets +30', () => {
  assert.deepEqual([POINTS.red, POINTS.blue, POINTS.twin, POINTS.star, SURVIVOR_BONUS], [10, 10, 30, 50, 30]);
  const st = position([{ kind: 'blue', r: 2, c: 1 }]);
  play(st, { r: 2, c: 1 });
  assert.equal(st.seats[0].score, 10);
  const end = position([]);
  pieceById(end, 's1').r = 2; pieceById(end, 's1').c = 1;
  play(end, { r: 2, c: 1 });
  assert.equal(end.seats[0].score, 50 + 30);
  assert.equal(end.seats[0].bonus, 30);
});

test('score decides the winner: a player who took a lot but was knocked out beats one who hid and survived', () => {
  const st = position([], { n: 3 });
  st.seats[1].score = 120; st.seats[1].takes = 4;
  // s1 counts as knocked out: s2 can't take it, but the ranking looks at score.
  pieceById(st, 's1').alive = false; st.seats[1].out = true; st.outOrder.push(1);
  pieceById(st, 's2').r = 2; pieceById(st, 's2').c = 1;
  play(st, { r: 2, c: 1 }); // s0 takes s2: 50 + 30 bonus = 80
  assert.equal(st.over, true);
  assert.equal(st.seats[0].score, 80);
  assert.equal(st.winner, 1);
  assert.deepEqual(ranking(st), [1, 0, 2]);
});

test('on equal score the take count decides, then whoever went out later', () => {
  const st = position([], { n: 3 });
  st.seats.forEach(s => { s.score = 50; });
  st.seats[2].takes = 2;
  st.seats[0].out = true; st.seats[1].out = true; st.outOrder.push(0, 1);
  assert.deepEqual(ranking(st), [2, 1, 0]);
});

test('bonus: 20 points double step, 40 points double move', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }]);
  const seat = st.seats[0];
  seat.score = 10;
  play(st, { r: 2, c: 1 }); // +10 → 20
  assert.equal(seat.bonuses.step, 2); // the starting one + 20 points
  assert.equal(seat.bonuses.double, 0);
  assert.equal(seat.scoreTier, 1);
  const g = position([{ kind: 'blue', r: 2, c: 1 }]);
  g.seats[0].score = 30; g.seats[0].scoreTier = 1;
  play(g, { r: 2, c: 1 }); // 40
  assert.equal(g.seats[0].bonuses.double, 1);
});

test('armor: a star that survives the first shrink earns armor; passing 6 rounds gives nothing', () => {
  const g = createGame({ seats: seats(2), seed: 9, neutrals: 0, shrinkStart: 1, shrinkEvery: 99 });
  const total = s => Object.values(s.bonuses).reduce((a, b) => a + b, 0);
  const walk = () => play(g, legalMoves(g, currentActor(g), g.mode).find(m => m.type === 'walk') ?? null);
  while (g.round === 1 && !g.over) walk();
  assert.equal(g.ring, 1);
  g.seats.filter(s => !s.out).forEach(s => assert.equal(s.bonuses.armor, 1));
  const before = g.seats.map(total);
  g.round = 6; g.turn = 0;
  while (g.round === 6 && !g.over) walk();
  assert.deepEqual(g.seats.map(total), before);
});

test('armor: the taken star survives and the attacker stays put', () => {
  const st = position([]);
  pieceById(st, 's1').r = 2; pieceById(st, 's1').c = 1;
  st.seats[1].bonuses.armor = 1;
  play(st, { r: 2, c: 1 });
  assert.equal(pieceById(st, 's1').alive, true);
  assert.deepEqual([pieceById(st, 's0').r, pieceById(st, 's0').c], [1, 1]);
  assert.equal(st.seats[1].bonuses.armor, 0);
});

test('double step goes two squares, double move keeps the turn, mirror swaps places', () => {
  const st = position([{ kind: 'red', r: 4, c: 3 }]);
  st.seats[0].bonuses = { armor: 0, step: 1, double: 1, swap: 1 };
  assert.ok(!legalMoves(st, pieceById(st, 's0'), 'STRAIGHT').some(m => m.r === 3));
  assert.ok(legalMoves(st, pieceById(st, 's0'), 'STRAIGHT', 'step').some(m => m.r === 3 && m.c === 1));
  play(st, { r: 1, c: 2, bonus: 'double' });
  assert.equal(currentActor(st).id, 's0');
  assert.equal(st.seats[0].bonuses.double, 0);
  play(st, { r: 4, c: 3, bonus: 'swap' }); // (1,2) ↔ red (4,3): 3 squares away
  assert.deepEqual([pieceById(st, 's0').r, pieceById(st, 's0').c], [4, 3]);
  assert.deepEqual([pieceById(st, 'b1').r, pieceById(st, 'b1').c], [1, 2]);
});

test('the arena shrinks: pieces on the outer ring fall and it can no longer be entered', () => {
  const st = createGame({ seats: seats(2), seed: 5, shrinkStart: 1, shrinkEvery: 1 });
  assert.equal(collapseDue(st), true);
  const onEdge = st.pieces.filter(p => p.alive && ringOf(st, p.r, p.c) === 0).map(p => p.id);
  assert.ok(onEdge.length > 0);
  while (st.round === 1 && !st.over) play(st, legalMoves(st, currentActor(st), st.mode).find(m => ringOf(st, m.r, m.c) > 0) ?? null);
  assert.equal(st.ring, 1);
  for (const id of onEdge) {
    const p = pieceById(st, id);
    if (p.kind !== 'star') assert.equal(p.alive, ringOf(st, p.r, p.c) > 0, `${id} stayed outside but didn\'t fall`);
  }
  for (const p of st.pieces.filter(x => x.alive)) {
    for (const m of legalMoves(st, p)) assert.ok(ringOf(st, m.r, m.c) >= 1);
  }
});

test('the arena shrinks every 6 rounds: at the end of rounds 6, 12, 18', () => {
  const st = createGame({ seats: seats(2), seed: 2 });
  const due = [];
  for (let r = 1; r <= 20; r++) { st.round = r; if (collapseDue(st)) due.push(r); }
  assert.deepEqual(due, [6, 12, 18]);
});

test('threats: who can take, with the mode worked out correctly', () => {
  const st = position([{ kind: 'red', r: 4, c: 4 }, { kind: 'blue', r: 6, c: 4 }]);
  assert.deepEqual(attackersOf(st, 5, 5).map(p => p.id), ['b1']);   // red takes diagonally
  assert.deepEqual(attackersOf(st, 5, 4).map(p => p.id), ['b2']);   // blue takes straight, red can't
  // s1 (7,7) hasn't moved this round yet: in STRAIGHT mode it takes (6,7), not (6,6).
  assert.deepEqual(attackersOf(st, 6, 7).map(p => p.id), ['s1']);
  assert.deepEqual(attackersOf(st, 6, 6).map(p => p.id), []);
});

test('the game always ends (thanks to the shrinking arena)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const n = 1 + (seed % 4);
    const st = createGame({ seats: seats(n, 'bot', 'normal'), seed });
    let guard = 0;
    while (!st.over && guard++ < 20000) play(st, chooseMove(st, currentActor(st)));
    assert.ok(st.over, `seed ${seed} did not finish`);
  }
});

// ---------------------------------------------------------------- single-player mode and the mirror Twin

// Single-player position: s0, the Twin and the given bots.
function soloPosition({ me, twin, bots = [], mode = 'STRAIGHT' }) {
  const st = createGame({ seats: [{ kind: 'human' }], seed: 1, neutrals: 0, shuffle: false });
  Object.assign(pieceById(st, 's0'), { r: me[0], c: me[1] });
  Object.assign(pieceById(st, 'tw'), { r: twin[0], c: twin[1] });
  st.pieces.push(...bots.map((p, i) => ({ id: `b${i + 1}`, label: String(i + 1), alive: true, ...p })));
  st.mode = mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  return st;
}

test('single-player mode: 9×9, player + Twin + bots; the Twin moves right after the player', () => {
  const st = createGame({ seats: [{ kind: 'human' }], seed: 7, shuffle: false });
  assert.equal(st.size, 9);
  assert.equal(st.solo, true);
  assert.equal(st.pieces.filter(p => p.kind === 'twin').length, 1);
  assert.equal(st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue').length, NEUTRALS_BY_STARS[1]);
  assert.deepEqual(st.order.slice(0, 2), ['s0', 'tw']);
});

test('the Twin plays the same direction you played', () => {
  const st = soloPosition({ me: [1, 1], twin: [5, 5] });
  play(st, { r: 1, c: 2 }); // right
  const tw = currentActor(st);
  assert.equal(tw.id, 'tw');
  play(st, chooseMove(st, tw));
  assert.deepEqual([tw.r, tw.c], [5, 6]);
});

test('the Twin stays put if that direction is blocked and takes the piece there if occupied', () => {
  const blocked = soloPosition({ me: [1, 1], twin: [5, 8] });
  play(blocked, { r: 1, c: 2 });
  assert.equal(chooseMove(blocked, currentActor(blocked)), null);

  const st = soloPosition({ me: [1, 1], twin: [5, 5], bots: [{ kind: 'red', r: 5, c: 6 }] });
  play(st, { r: 1, c: 2 });
  play(st, chooseMove(st, currentActor(st)));
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.deepEqual([pieceById(st, 'tw').r, pieceById(st, 'tw').c], [5, 6]);
});

test('the Twin can\'t take you; the preview knows this for sure', () => {
  // If you go to (1,2), the Twin goes right from (2,2) to (2,3). Even as a straight neighbor it is no threat.
  const st = soloPosition({ me: [1, 1], twin: [2, 2] });
  const me = pieceById(st, 's0');
  assert.deepEqual(attackersOf(st, 1, 2, ['s0']).map(p => p.id), ['tw']);
  assert.deepEqual(threatsFor(st, me, { r: 1, c: 2, type: 'walk' }).attackers, []);
});

test('single player: you win when the bots are gone (even with the Twin left), you lose when taken', () => {
  const win = soloPosition({ me: [1, 1], twin: [6, 7], bots: [{ kind: 'red', r: 1, c: 2 }] });
  play(win, { r: 1, c: 2 }); // take the last bot: you win even though the Twin is alive
  assert.equal(pieceById(win, 'tw').alive, true);
  assert.equal(win.over, true);
  assert.equal(win.winner, 0);

  // Going down puts you on (2,1); the red at (3,2) takes it diagonally.
  const lose = soloPosition({ me: [1, 1], twin: [6, 7], bots: [{ kind: 'red', r: 3, c: 2 }] });
  play(lose, { r: 2, c: 1 });
  play(lose, chooseMove(lose, currentActor(lose)));
  play(lose, chooseMove(lose, currentActor(lose)));
  assert.equal(pieceById(lose, 's0').alive, false);
  assert.equal(lose.over, true);
  assert.equal(lose.winner, null);
});

// ---------------------------------------------------------------- bots

test('target: a bot chases the star it can take in the fewest moves; easy goes for the nearest', () => {
  // Blue walks diagonally and takes straight: from (3,3) it can never reach a straight neighbor of s0 (1,1),
  // but it can reach s1's (7,6). Even though s0 is closer, its target is s1.
  const st = position([{ kind: 'blue', r: 3, c: 3 }]);
  const s1 = pieceById(st, 's1');
  s1.r = 7; s1.c = 6;
  const blue = pieceById(st, 'b1');
  assert.equal(targetOf(st, blue, 'normal').id, 's1');
  assert.equal(targetOf(st, blue, 'hard').id, 's1');
  assert.equal(targetOf(st, blue, 'easy').id, 's0');
  assert.equal(targetOf(st, pieceById(st, 's0')), null);
});

// "Careful player": goes to a safe square if there is one, makes a safe take if there is one.
function carefulMove(st, piece) {
  const moves = legalMoves(st, piece, st.mode);
  if (!moves.length) return null;
  const safe = moves.filter(m => isSafe(st, piece, m));
  const safeTakes = safe.filter(m => m.type === 'take');
  const pool = safeTakes.length ? safeTakes : safe.length ? safe : moves;
  return pool[Math.floor(random(st) * pool.length)];
}

function runGame({ n, neutralLevel, seed, policy }) {
  const st = createGame({ seats: policy.map(p => (p === 'careful' ? { kind: 'human' } : { kind: 'bot', level: p })), neutralLevel, seed });
  let guard = 0, blunders = 0, decisions = 0;
  while (!st.over && guard++ < 20000) {
    const a = currentActor(st);
    if (a.kind === 'star' && st.seats[a.seat].kind === 'human') { play(st, carefulMove(st, a)); continue; }
    const move = chooseMove(st, a);
    if (a.kind !== 'star' && neutralLevel !== 'easy' && move) {
      decisions++;
      const legal = legalMoves(st, a, st.mode);
      const takesStar = move.type === 'take' && pieceById(st, move.targetId).kind === 'star';
      if (!takesStar && !isSafe(st, a, move) && legal.some(m => isSafe(st, a, m))) blunders++;
    }
    play(st, move);
  }
  return { st, blunders, decisions };
}

test('normal and hard arena bots never step where they would be taken while a safe option exists', () => {
  for (const level of ['normal', 'hard']) {
    let blunders = 0, decisions = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runGame({ n: 2, neutralLevel: level, seed, policy: ['careful', 'careful'] });
      blunders += r.blunders; decisions += r.decisions;
    }
    console.log(`   ${level}: ${decisions} bot decisions, ${blunders} needless risks`);
    assert.equal(blunders, 0);
  }
});

// Two "careful players" (looking for a safe square every move) against the arena bots.
// The shorter the match, the more dangerous the arena bots.
console.log('\nStrength check — 2 careful players, 9×9, 300 matches:');
const strength = {};
for (const level of ['easy', 'normal', 'hard']) {
  let rounds = 0, byBots = 0, botTakes = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const { st } = runGame({ n: 2, neutralLevel: level, seed, policy: ['careful', 'careful'] });
    rounds += st.round;
    if (st.log.some(l => /^⚔️ #\d+ took (Turquoise|Purple)!/.test(l.text))) byBots++;
    botTakes += st.log.filter(l => /^⚔️ #\d+ took #\d+!/.test(l.text)).length;
  }
  strength[level] = rounds / 300;
  console.log(`   arena bots ${level.padEnd(6)}: average match ${(rounds / 300).toFixed(1)} rounds, a star was taken by bots in ${(100 * byBots / 300).toFixed(0)}%, bots took each other ${(botTakes / 300).toFixed(1)} times per match`);
}

console.log('\nAI player strength — 4 bot stars, 13×13, Normal arena, 120 matches:');
const wins = [0, 0, 0, 0];
const levels = ['easy', 'normal', 'hard', 'hard'];
for (let seed = 1; seed <= 120; seed++) {
  const rot = seed % 4;
  const policy = levels.map((_, i) => levels[(i + rot) % 4]);
  const { st } = runGame({ n: 4, neutralLevel: 'normal', seed, policy });
  if (st.winner != null) wins[(st.winner + rot) % 4]++;
}
console.log(`   wins: Easy ${wins[0]}, Normal ${wins[1]}, Hard ${wins[2] + wins[3]} (two seats)`);

console.log('\nCareful player against one AI rival — 9×9, Normal arena, 150 matches:');
const vsAi = {};
for (const level of ['easy', 'normal', 'hard']) {
  let won = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const flip = seed % 2;
    const policy = flip ? [level, 'careful'] : ['careful', level];
    const { st } = runGame({ n: 2, neutralLevel: 'normal', seed, policy });
    if (st.winner === (flip ? 1 : 0)) won++;
  }
  vsAi[level] = won;
  console.log(`   rival ${level.padEnd(6)}: the careful player won ${(100 * won / 150).toFixed(0)}%`);
}

console.log('\nHard AI against Normal AI — 9×9, Normal arena, 200 matches:');
{
  let hard = 0, normal = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const flip = seed % 2;
    const { st } = runGame({ n: 2, neutralLevel: 'normal', seed, policy: flip ? ['hard', 'normal'] : ['normal', 'hard'] });
    if (st.winner == null) continue;
    if (st.winner === (flip ? 0 : 1)) hard++; else normal++;
  }
  console.log(`   Hard ${hard} · Normal ${normal}`);
}

test('normal and hard arena bots catch the careful player faster than easy', () => {
  assert.ok(strength.normal < strength.easy, `normal ${strength.normal} rounds ≥ easy ${strength.easy} rounds`);
  assert.ok(strength.hard <= strength.normal, `hard ${strength.hard} rounds > normal ${strength.normal} rounds`);
});

test('AI player: normal and hard win far more often than easy', () => {
  assert.ok(wins[1] > 3 * wins[0] && (wins[2] + wins[3]) / 2 > 3 * wins[0]);
});

test('when the Twin takes a piece its owner earns double points and a mirror bonus', () => {
  const st = soloPosition({ me: [1, 1], twin: [5, 5], bots: [{ kind: 'red', r: 5, c: 6 }, { kind: 'blue', r: 8, c: 8 }] });
  play(st, { r: 1, c: 2 });
  play(st, chooseMove(st, currentActor(st)));
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.equal(st.seats[0].score, POINTS.red * 2);
  assert.equal(st.seats[0].bonuses.swap, 1);
  assert.equal(st.seats[0].bonuses.step, 2);
});

test('multiplayer with keep going: the winner is decided when one star is left, the match goes on', () => {
  const mk = keep => {
    const st = position([{ kind: 'blue', r: 8, c: 8 }]);
    st.keepGoing = keep;
    Object.assign(pieceById(st, 's1'), { r: 2, c: 1 });
    play(st, { r: 2, c: 1 }); // s0 takes s1
    return st;
  };
  const st = mk(true);
  assert.equal(st.decided, true);
  assert.equal(st.over, false);
  assert.equal(st.winner, 0);
  assert.equal(endMatch(st).over, true);
  assert.equal(mk(false).over, true);
});

test('single player: 13×13 board and the most bots', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const st = createGame({ seats: seats(1), seed, size: 13, neutrals: 999 });
    assert.equal(st.size, 13);
    assert.equal(st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue').length, maxNeutrals(13));
    assert.equal(new Set(st.pieces.map(p => `${p.r},${p.c}`)).size, st.pieces.length);
  }
  assert.equal(createGame({ seats: seats(2), seed: 1, size: 13 }).size, 13);
  assert.equal(createGame({ seats: seats(3), seed: 1, size: 9 }).size, 11); // at least the default
  assert.equal(createGame({ seats: seats(2), seed: 1, size: 7 }).size, 9);
});

test('mirror: comes at 50 points and swaps with a piece anywhere on the board', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }, { kind: 'red', r: 8, c: 8 }]);
  const seat = st.seats[0];
  seat.score = 40; seat.scoreTier = 2;
  play(st, { r: 2, c: 1 }); // +10 → 50
  assert.equal(seat.bonuses.swap, 1);
  const me = pieceById(st, 's0');
  const far = legalMoves(st, me, st.mode, 'swap').find(m => m.type === 'swap' && m.targetId === 'b2');
  assert.ok(far, 'a swap with the far bot should be possible');
  assert.equal(legalMoves(st, me, st.mode, 'swap').some(m => m.targetId === 'tw'), false);
});

test('a star that survives the second shrink gets a double move', () => {
  const g = createGame({ seats: seats(2), seed: 9, neutrals: 0, shrinkStart: 1, shrinkEvery: 1 });
  const mid = (g.size - 1) / 2;
  const walk = () => play(g, legalMoves(g, currentActor(g), g.mode).filter(m => m.type === 'walk')
    .sort((x, y) => Math.hypot(x.r - mid, x.c - mid) - Math.hypot(y.r - mid, y.c - mid))[0] ?? null);
  let guard = 0;
  while (g.ring < 2 && !g.over && guard++ < 50) walk();
  assert.equal(g.ring, 2);
  g.seats.filter(s => !s.out).forEach(s => { assert.equal(s.bonuses.armor, 1); assert.equal(s.bonuses.double, 1); });
});

test('red and blue bots are equal in number and balanced around the stars', () => {
  let total = 0, n = 0, worst = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const stars of [1, 2, 4]) {
      const st = createGame({ seats: seats(stars), seed });
      const bots = st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue');
      const reds = bots.filter(p => p.kind === 'red').length;
      assert.ok(Math.abs(reds - (bots.length - reds)) <= 1);
      for (const star of st.pieces.filter(p => p.kind === 'star')) {
        const near = bots.filter(p => Math.max(Math.abs(p.r - star.r), Math.abs(p.c - star.c)) <= 4);
        const diff = Math.abs(near.filter(p => p.kind === 'red').length - near.filter(p => p.kind === 'blue').length);
        total += diff; n++; worst = Math.max(worst, diff);
      }
    }
  }
  console.log(`   red-blue difference around stars: average ${(total / n).toFixed(2)}, worst ${worst}`);
  assert.ok(total / n < 0.8 && worst <= 3);
});

function simulate(opts, guard = 6000) {
  const st = createGame(opts);
  let n = 0;
  while (!st.over && n++ < guard) {
    const a = currentActor(st);
    play(st, chooseMove(st, a));
  }
  return st;
}

test('team match: a teammate can\'t be taken, the match ends when one team is left', () => {
  const st = createGame({ seats: seats(4, 'bot', 'normal'), seed: 5, teams: true, shuffle: false, neutrals: 0 });
  assert.deepEqual(st.teams, [0, 1, 0, 1]);
  const s0 = pieceById(st, 's0'), s2 = pieceById(st, 's2'), s1 = pieceById(st, 's1');
  assert.ok(friendly(st, s0, s2) && !friendly(st, s0, s1));
  Object.assign(s2, { r: s0.r, c: s0.c + 1 });
  st.mode = 'STRAIGHT';
  assert.equal(legalMoves(st, s0, 'STRAIGHT').some(m => m.type === 'take' && m.targetId === 's2'), false);
  // team 0 wins when both stars of team 1 are gone
  const wins = [0, 0];
  for (let seed = 1; seed <= 20; seed++) {
    const g = simulate({ seats: seats(4, 'bot', 'normal'), seed, teams: true });
    assert.ok(g.over);
    if (g.winner != null) { wins[g.winTeam]++; assert.ok(isWinner(g, g.winner)); }
  }
  console.log(`   team wins (20 matches): A ${wins[0]} · B ${wins[1]}`);
});

test('obstacle squares: never touch each other, never under a piece, never a move target', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const n of [1, 2, 4]) {
      const st = createGame({ seats: seats(n), seed, obstacles: true });
      assert.ok(st.blocked.size >= 4);
      const cells = [...st.blocked].map(k => [Math.floor(k / st.size), k % st.size]);
      for (const [r, c] of cells) {
        assert.equal(st.pieces.some(p => p.r === r && p.c === c), false);
        for (const [a, b] of cells) if (a !== r || b !== c) assert.ok(Math.max(Math.abs(a - r), Math.abs(b - c)) >= 2);
      }
      for (const p of st.pieces) for (const m of legalMoves(st, p, st.mode)) assert.equal(st.blocked.has(m.r * st.size + m.c), false);
    }
  }
  const g = simulate({ seats: seats(3, 'bot', 'hard'), seed: 7, obstacles: true });
  assert.ok(g.over);
});

test('personalities: assigned to AI rivals, the match completes', () => {
  const st = createGame({ seats: seats(4, 'bot', 'normal'), seed: 3, personas: true });
  assert.ok(st.seats.every(s => ['hunter', 'careful', 'opportunist'].includes(s.persona)));
  const wins = { hunter: 0, careful: 0, opportunist: 0 };
  for (let seed = 1; seed <= 90; seed++) {
    const g = simulate({ seats: seats(4, 'bot', 'hard'), seed, personas: true });
    if (g.winner != null) wins[g.seats[g.winner].persona]++;
  }
  console.log(`   personality wins (90 matches, 4 Hard): hunter ${wins.hunter} · careful ${wins.careful} · opportunist ${wins.opportunist}`);
  assert.ok(Object.values(wins).every(w => w >= 8), 'one personality almost never wins');
});

test('puzzle: you lose when out of moves, you win when the bots are gone', () => {
  const st = createPuzzle({ me: [4, 4], bots: [{ kind: 'red', r: 4, c: 5 }], limit: 2 });
  assert.equal(st.puzzle.limit, 2);
  play(st, { r: 4, c: 5 }); // take the bot
  assert.equal(st.over, true);
  assert.equal(st.winner, 0);
  const lose = createPuzzle({ me: [0, 0], bots: [{ kind: 'blue', r: 8, c: 8 }], limit: 1 });
  play(lose, { r: 0, c: 1 });
  for (let i = 0; i < 4 && !lose.over; i++) play(lose, chooseMove(lose, currentActor(lose)));
  assert.equal(lose.over, true);
  assert.equal(lose.winner, null);
});

test('numbers are reassigned among survivors every round, the order is unchanged', () => {
  const st = createGame({ seats: [{ kind: 'human' }, { kind: 'bot', level: 'normal' }], neutrals: 6, seed: 5, size: 9 });
  const before = st.order.slice();
  const dead = before.filter(id => id !== 's0' && id !== 's1' && !id.startsWith('t'))[1];
  pieceById(st, dead).alive = false;
  const next = roundOrder(st);
  assert.deepEqual(next, before.filter(id => id !== dead));
  next.forEach((id, i) => { const p = pieceById(st, id); if (p.kind === 'red' || p.kind === 'blue') assert.equal(p.label, String(i + 1)); });
});

test('puzzle map: shape and obstacles are closed, bots don\'t walk, they take whoever steps into reach', async () => {
  const { PUZZLES } = await import('../tools/puzzles-out.mjs');
  assert.ok(PUZZLES.length >= 10);
  for (const def of PUZZLES) {
    const st = createPuzzle({ map: def.map, limit: def.par + 1, mode: def.mode, bonuses: def.bonuses });
    const me = currentActor(st);
    assert.equal(me.id, 's0');
    for (const m of legalMoves(st, me, st.mode)) assert.ok(!st.blocked.has(m.r * st.size + m.c));
  }
  const st = createPuzzle({ map: ['S....', '.....', '..R..'], limit: 5, mode: 'STRAIGHT' });
  const bot = st.pieces.find(p => p.kind === 'red');
  play(st, { r: st.pieces[0].r, c: 1 }); // stay out of the bot's reach
  assert.deepEqual([bot.r, bot.c], [3, 2]);
  assert.ok(st.holes.size > 0);
});

await Promise.all(pending);
console.log(`\n${passed} tests passed.`);
