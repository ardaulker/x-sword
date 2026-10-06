// Kural motoru ve botların testleri: node tests/engine.test.mjs
import assert from 'node:assert/strict';
import {
  createGame, endMatch, maxNeutrals, createPuzzle, isWinner, friendly, play, currentActor, legalMoves, attackersOf, isSafe, collapseDue, ringOf,
  roundOrder, random, pieceById, threatsFor, ranking, SIZE_BY_STARS, NEUTRALS_BY_STARS, POINTS, SURVIVOR_BONUS,
} from '../engine/rules.js';
import { chooseMove, targetOf } from '../engine/bots.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

const seats = (n, kind = 'human', level = 'normal') => Array.from({ length: n }, () => ({ kind, level }));

// Elle kurulmuş küçük bir pozisyon: verilen taşlar dışında tahta boş.
// Köşeler sabit (s0 sol üstte), sıra: önce yıldızlar, sonra botlar numara sırasıyla.
function position(pieces, { n = 2, mode = 'DUZ' } = {}) {
  const st = createGame({ seats: seats(n), seed: 1, neutrals: 0, shuffle: false });
  const stars = st.pieces.filter(p => p.kind === 'star');
  st.pieces = [...stars, ...pieces.map((p, i) => ({ id: `b${i + 1}`, label: String(i + 1), alive: true, ...p }))];
  st.mode = mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  return st;
}

// ---------------------------------------------------------------- kurallar

test('tahta ve bot sayısı yıldız sayısıyla büyür', () => {
  for (const n of [2, 3, 4]) {
    const st = createGame({ seats: seats(n), seed: n });
    assert.equal(st.size, SIZE_BY_STARS[n]);
    assert.equal(st.pieces.filter(p => p.kind !== 'star').length, NEUTRALS_BY_STARS[n]);
    const stars = st.pieces.filter(p => p.kind === 'star');
    for (const b of st.pieces.filter(p => p.kind !== 'star')) {
      for (const s of stars) assert.ok(Math.max(Math.abs(b.r - s.r), Math.abs(b.c - s.c)) >= 3, 'bot yıldıza çok yakın');
    }
  }
});

test('aynı tohum aynı oyunu kurar', () => {
  const a = createGame({ seats: seats(3), seed: 42 }), b = createGame({ seats: seats(3), seed: 42 });
  assert.deepEqual(a.pieces, b.pieces);
});

test('kırmızı düz yürür çapraz alır, mavi tersi', () => {
  const st = position([{ kind: 'red', r: 4, c: 4 }, { kind: 'blue', r: 3, c: 3 }, { kind: 'blue', r: 3, c: 4 }]);
  const red = pieceById(st, 'b1');
  const moves = legalMoves(st, red);
  assert.deepEqual(moves.filter(m => m.type === 'walk').map(m => `${m.r},${m.c}`).sort(), ['4,3', '4,5', '5,4']);
  assert.deepEqual(moves.filter(m => m.type === 'take').map(m => m.targetId), ['b2']);
  const blue = pieceById(st, 'b3');
  // Mavi (3,4) düz alır: alttaki kırmızıyı da soldaki maviyi de.
  assert.deepEqual(legalMoves(st, blue).filter(m => m.type === 'take').map(m => m.targetId), ['b1', 'b2']);
});

test('yıldız modun yönünde yürür ve alır', () => {
  const st = position([{ kind: 'red', r: 2, c: 1 }, { kind: 'red', r: 2, c: 2 }], { mode: 'DUZ' });
  const star = pieceById(st, 's0'); // (1,1)
  assert.deepEqual(legalMoves(st, star, 'DUZ').filter(m => m.type === 'take').map(m => m.targetId), ['b1']);
  assert.deepEqual(legalMoves(st, star, 'CAPRAZ').filter(m => m.type === 'take').map(m => m.targetId), ['b2']);
});

test('sıra maç başında bir kez karılır, bütün maç aynı kalır; mod her tur değişir', () => {
  const st = createGame({ seats: seats(3), seed: 3 });
  const first = [...st.order];
  assert.equal(first.length, st.pieces.length);
  // Botun numarası sıradaki yeridir.
  first.forEach((id, i) => { const p = pieceById(st, id); if (p.kind !== 'star') assert.equal(p.label, String(i + 1)); });
  while (st.round === 1) play(st, legalMoves(st, currentActor(st), st.mode)[0] ?? null);
  assert.equal(st.mode, 'CAPRAZ');
  assert.deepEqual(st.order, first.filter(id => pieceById(st, id).alive));
  // Farklı maçlarda sıra ve köşeler değişir; yıldızlar botların arasına da düşer.
  const starFirst = new Set(), corners = new Set();
  for (let seed = 1; seed <= 200; seed++) { // 1/16 şansla ilk sıra; 40 tohum bazen yetmez
    const g = createGame({ seats: seats(2), seed });
    starFirst.add(g.order.indexOf('s0') === 0);
    corners.add(`${pieceById(g, 's0').r},${pieceById(g, 's0').c}`);
  }
  assert.deepEqual([...starFirst].sort(), [false, true]);
  assert.equal(corners.size, 4);
});

test('kolay: ilk sen oynarsın; tek oyunculu modda İkiz hemen arkandan gelir', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assert.equal(createGame({ seats: seats(4), seed, firstSeat: 0 }).order[0], 's0');
    assert.deepEqual(createGame({ seats: seats(1), seed, firstSeat: 0 }).order.slice(0, 2), ['s0', 'tw']);
    const solo = createGame({ seats: seats(1), seed });
    assert.equal(solo.order.indexOf('tw'), solo.order.indexOf('s0') + 1);
  }
});

test('alınan botun sırası beklenmeden atlanır', () => {
  const st = position([{ kind: 'red', r: 8, c: 0 }, { kind: 'red', r: 0, c: 8 }]);
  pieceById(st, 'b1').alive = false;
  play(st, legalMoves(st, currentActor(st), st.mode)[0]); // s0
  play(st, legalMoves(st, currentActor(st), st.mode)[0]); // s1
  assert.equal(currentActor(st).id, 'b2');
});

test('almak: hedef çıkar, yıldızın alma sayısı artar, kayıtta "aldı" yazar', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }]);
  play(st, { r: 2, c: 1 });
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.equal(st.seats[0].takes, 1);
  assert.match(st.log.at(-1).text, new RegExp(`Turkuaz, ${pieceById(st, 'b1').label} numarayı aldı!`));
  assert.ok(!st.log.some(l => /yedi|yedin/.test(l.text)));
});

test('son yıldız kalınca oyun biter', () => {
  const st = position([]);
  const s1 = pieceById(st, 's1');
  s1.r = 2; s1.c = 1; // s0 (1,1) DÜZ modda aşağıdaki s1'i alabilir
  play(st, { r: 2, c: 1 });
  assert.equal(st.over, true);
  assert.equal(st.winner, 0);
  assert.match(st.log.at(-1).text, /Turkuaz kazandı/);
});

test('puan: bot 10, oyuncu 50; ayakta kalan +30 alır', () => {
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

test('kazananı skor belirler: çok alan ama elenen oyuncu, saklanıp ayakta kalanı geçer', () => {
  const st = position([], { n: 3 });
  st.seats[1].score = 120; st.seats[1].takes = 4;
  // s1 elenmiş gibi: s2 onu alamaz ama sıralama skora bakar.
  pieceById(st, 's1').alive = false; st.seats[1].out = true; st.outOrder.push(1);
  pieceById(st, 's2').r = 2; pieceById(st, 's2').c = 1;
  play(st, { r: 2, c: 1 }); // s0, s2'yi alır: 50 + 30 bonus = 80
  assert.equal(st.over, true);
  assert.equal(st.seats[0].score, 80);
  assert.equal(st.winner, 1);
  assert.deepEqual(ranking(st), [1, 0, 2]);
});

test('eşit skorda alma sayısı, o da eşitse geç elenen önde', () => {
  const st = position([], { n: 3 });
  st.seats.forEach(s => { s.score = 50; });
  st.seats[2].takes = 2;
  st.seats[0].out = true; st.seats[1].out = true; st.outOrder.push(0, 1);
  assert.deepEqual(ranking(st), [2, 1, 0]);
});

test('bonus: 20 puan çift adım, 40 puan çift hamle', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }]);
  const seat = st.seats[0];
  seat.score = 10;
  play(st, { r: 2, c: 1 }); // +10 → 20
  assert.equal(seat.bonuses.step, 2); // başlangıçtaki + 20 puan
  assert.equal(seat.bonuses.double, 0);
  assert.equal(seat.scoreTier, 1);
  const g = position([{ kind: 'blue', r: 2, c: 1 }]);
  g.seats[0].score = 30; g.seats[0].scoreTier = 1;
  play(g, { r: 2, c: 1 }); // 40
  assert.equal(g.seats[0].bonuses.double, 1);
});

test('zırh: ilk daralmayı atlatan yıldız bir zırh kazanır, 6 tur geçmek bonus vermez', () => {
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

test('zırh: alınan yıldız kurtulur, saldıran yerinde kalır', () => {
  const st = position([]);
  pieceById(st, 's1').r = 2; pieceById(st, 's1').c = 1;
  st.seats[1].bonuses.armor = 1;
  play(st, { r: 2, c: 1 });
  assert.equal(pieceById(st, 's1').alive, true);
  assert.deepEqual([pieceById(st, 's0').r, pieceById(st, 's0').c], [1, 1]);
  assert.equal(st.seats[1].bonuses.armor, 0);
});

test('çift adım iki kare gider, çift hamle sırayı bırakmaz, ayna yer değiştirir', () => {
  const st = position([{ kind: 'red', r: 4, c: 3 }]);
  st.seats[0].bonuses = { armor: 0, step: 1, double: 1, swap: 1 };
  assert.ok(!legalMoves(st, pieceById(st, 's0'), 'DUZ').some(m => m.r === 3));
  assert.ok(legalMoves(st, pieceById(st, 's0'), 'DUZ', 'step').some(m => m.r === 3 && m.c === 1));
  play(st, { r: 1, c: 2, bonus: 'double' });
  assert.equal(currentActor(st).id, 's0');
  assert.equal(st.seats[0].bonuses.double, 0);
  play(st, { r: 4, c: 3, bonus: 'swap' }); // (1,2) ↔ kırmızı (4,3): 3 kare uzakta
  assert.deepEqual([pieceById(st, 's0').r, pieceById(st, 's0').c], [4, 3]);
  assert.deepEqual([pieceById(st, 'b1').r, pieceById(st, 'b1').c], [1, 2]);
});

test('arena daralır: dış halkadakiler düşer, oraya artık gidilemez', () => {
  const st = createGame({ seats: seats(2), seed: 5, shrinkStart: 1, shrinkEvery: 1 });
  assert.equal(collapseDue(st), true);
  const onEdge = st.pieces.filter(p => p.alive && ringOf(st, p.r, p.c) === 0).map(p => p.id);
  assert.ok(onEdge.length > 0);
  while (st.round === 1 && !st.over) play(st, legalMoves(st, currentActor(st), st.mode).find(m => ringOf(st, m.r, m.c) > 0) ?? null);
  assert.equal(st.ring, 1);
  for (const id of onEdge) {
    const p = pieceById(st, id);
    if (p.kind !== 'star') assert.equal(p.alive, ringOf(st, p.r, p.c) > 0, `${id} dışarıda kaldı ama düşmedi`);
  }
  for (const p of st.pieces.filter(x => x.alive)) {
    for (const m of legalMoves(st, p)) assert.ok(ringOf(st, m.r, m.c) >= 1);
  }
});

test('arena 6 turda bir daralır: 6., 12., 18. turun sonunda', () => {
  const st = createGame({ seats: seats(2), seed: 2 });
  const due = [];
  for (let r = 1; r <= 20; r++) { st.round = r; if (collapseDue(st)) due.push(r); }
  assert.deepEqual(due, [6, 12, 18]);
});

test('tehdit: kim alabilir, modu doğru hesaplar', () => {
  const st = position([{ kind: 'red', r: 4, c: 4 }, { kind: 'blue', r: 6, c: 4 }]);
  assert.deepEqual(attackersOf(st, 5, 5).map(p => p.id), ['b1']);   // kırmızı çapraz alır
  assert.deepEqual(attackersOf(st, 5, 4).map(p => p.id), ['b2']);   // mavi düz alır, kırmızı alamaz
  // s1 (7,7) bu tur henüz oynamadı: DÜZ modda (6,7)'yi alır, (6,6)'yı alamaz.
  assert.deepEqual(attackersOf(st, 6, 7).map(p => p.id), ['s1']);
  assert.deepEqual(attackersOf(st, 6, 6).map(p => p.id), []);
});

test('oyun her zaman biter (daralan arena sayesinde)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const n = 1 + (seed % 4);
    const st = createGame({ seats: seats(n, 'bot', 'normal'), seed });
    let guard = 0;
    while (!st.over && guard++ < 20000) play(st, chooseMove(st, currentActor(st)));
    assert.ok(st.over, `tohum ${seed} bitmedi`);
  }
});

// ---------------------------------------------------------------- tek oyunculu mod ve ayna İkiz

// Tek oyunculu pozisyon: s0, İkiz ve verilen botlar.
function soloPosition({ me, twin, bots = [], mode = 'DUZ' }) {
  const st = createGame({ seats: [{ kind: 'human' }], seed: 1, neutrals: 0, shuffle: false });
  Object.assign(pieceById(st, 's0'), { r: me[0], c: me[1] });
  Object.assign(pieceById(st, 'tw'), { r: twin[0], c: twin[1] });
  st.pieces.push(...bots.map((p, i) => ({ id: `b${i + 1}`, label: String(i + 1), alive: true, ...p })));
  st.mode = mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  return st;
}

test('tek oyunculu mod: 9×9, oyuncu + İkiz + botlar; İkiz oyuncudan hemen sonra oynar', () => {
  const st = createGame({ seats: [{ kind: 'human' }], seed: 7, shuffle: false });
  assert.equal(st.size, 9);
  assert.equal(st.solo, true);
  assert.equal(st.pieces.filter(p => p.kind === 'twin').length, 1);
  assert.equal(st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue').length, NEUTRALS_BY_STARS[1]);
  assert.deepEqual(st.order.slice(0, 2), ['s0', 'tw']);
});

test('İkiz senin yaptığın yönün aynısını yapar', () => {
  const st = soloPosition({ me: [1, 1], twin: [5, 5] });
  play(st, { r: 1, c: 2 }); // sağa
  const tw = currentActor(st);
  assert.equal(tw.id, 'tw');
  play(st, chooseMove(st, tw));
  assert.deepEqual([tw.r, tw.c], [5, 6]);
});

test('İkiz o yön kapalıysa yerinde kalır, doluysa oradaki taşı alır', () => {
  const blocked = soloPosition({ me: [1, 1], twin: [5, 8] });
  play(blocked, { r: 1, c: 2 });
  assert.equal(chooseMove(blocked, currentActor(blocked)), null);

  const st = soloPosition({ me: [1, 1], twin: [5, 5], bots: [{ kind: 'red', r: 5, c: 6 }] });
  play(st, { r: 1, c: 2 });
  play(st, chooseMove(st, currentActor(st)));
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.deepEqual([pieceById(st, 'tw').r, pieceById(st, 'tw').c], [5, 6]);
});

test('İkiz seni alamaz; önizleme bunu kesin bilir', () => {
  // (1,2)'ye gidersen İkiz (2,2)'den sağa, (2,3)'e gider. Düz komşu olsa da tehdit değildir.
  const st = soloPosition({ me: [1, 1], twin: [2, 2] });
  const me = pieceById(st, 's0');
  assert.deepEqual(attackersOf(st, 1, 2, ['s0']).map(p => p.id), ['tw']);
  assert.deepEqual(threatsFor(st, me, { r: 1, c: 2, type: 'walk' }).attackers, []);
});

test('tek oyunculu: botlar gidince kazanırsın (İkiz kalsa da), alınınca kaybedersin', () => {
  const win = soloPosition({ me: [1, 1], twin: [6, 7], bots: [{ kind: 'red', r: 1, c: 2 }] });
  play(win, { r: 1, c: 2 }); // son botu al: İkiz hayatta olsa da kazanırsın
  assert.equal(pieceById(win, 'tw').alive, true);
  assert.equal(win.over, true);
  assert.equal(win.winner, 0);

  // Aşağı inersen (2,1)'e gelirsin; (3,2)'deki kırmızı oraya çapraz alır.
  const lose = soloPosition({ me: [1, 1], twin: [6, 7], bots: [{ kind: 'red', r: 3, c: 2 }] });
  play(lose, { r: 2, c: 1 });
  play(lose, chooseMove(lose, currentActor(lose)));
  play(lose, chooseMove(lose, currentActor(lose)));
  assert.equal(pieceById(lose, 's0').alive, false);
  assert.equal(lose.over, true);
  assert.equal(lose.winner, null);
});

// ---------------------------------------------------------------- botlar

test('hedef: bot, en az hamlede alabileceği yıldızı kovalar; kolay en yakına gider', () => {
  // Mavi çapraz yürür, düz alır: (3,3)'ten s0'ın (1,1) düz komşularına hiç varamaz,
  // s1'in (7,6) komşularına varır. s0 daha yakın olsa da hedefi s1'dir.
  const st = position([{ kind: 'blue', r: 3, c: 3 }]);
  const s1 = pieceById(st, 's1');
  s1.r = 7; s1.c = 6;
  const blue = pieceById(st, 'b1');
  assert.equal(targetOf(st, blue, 'normal').id, 's1');
  assert.equal(targetOf(st, blue, 'zor').id, 's1');
  assert.equal(targetOf(st, blue, 'kolay').id, 's0');
  assert.equal(targetOf(st, pieceById(st, 's0')), null);
});

// "Dikkatli oyuncu": güvenli kare varsa oraya gider, güvenli alma varsa onu yapar.
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
    if (a.kind !== 'star' && neutralLevel !== 'kolay' && move) {
      decisions++;
      const legal = legalMoves(st, a, st.mode);
      const takesStar = move.type === 'take' && pieceById(st, move.targetId).kind === 'star';
      if (!takesStar && !isSafe(st, a, move) && legal.some(m => isSafe(st, a, m))) blunders++;
    }
    play(st, move);
  }
  return { st, blunders, decisions };
}

test('normal ve zor arena botları, güvenli seçenek varken alınacağı kareye gitmez', () => {
  for (const level of ['normal', 'zor']) {
    let blunders = 0, decisions = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runGame({ n: 2, neutralLevel: level, seed, policy: ['careful', 'careful'] });
      blunders += r.blunders; decisions += r.decisions;
    }
    console.log(`   ${level}: ${decisions} bot kararı, ${blunders} gereksiz risk`);
    assert.equal(blunders, 0);
  }
});

// İki "dikkatli oyuncu" (her hamlede güvenli kare arar) arena botlarına karşı.
// Maç, ilk yıldız düşünce biter: maç ne kadar kısaysa arena botları o kadar tehlikeli.
console.log('\nGüç ölçümü — 2 dikkatli oyuncu, 9×9, 300 maç:');
const strength = {};
for (const level of ['kolay', 'normal', 'zor']) {
  let rounds = 0, byBots = 0, botTakes = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const { st } = runGame({ n: 2, neutralLevel: level, seed, policy: ['careful', 'careful'] });
    rounds += st.round;
    if (st.log.some(l => /^⚔️ \d+ numara, (Turkuaz'ı|Mor'u)/.test(l.text))) byBots++;
    botTakes += st.log.filter(l => /^⚔️ \d+ numara, \d+ numarayı/.test(l.text)).length;
  }
  strength[level] = rounds / 300;
  console.log(`   arena botları ${level.padEnd(6)}: maç ortalama ${(rounds / 300).toFixed(1)} tur, yıldızı botlar aldı %${(100 * byBots / 300).toFixed(0)}, botlar birbirini maç başı ${(botTakes / 300).toFixed(1)} kez aldı`);
}

console.log('\nYapay zekâ oyuncu güç ölçümü — 4 bot yıldız, 13×13, Normal arena, 120 maç:');
const wins = [0, 0, 0, 0];
const levels = ['kolay', 'normal', 'zor', 'zor'];
for (let seed = 1; seed <= 120; seed++) {
  const rot = seed % 4;
  const policy = levels.map((_, i) => levels[(i + rot) % 4]);
  const { st } = runGame({ n: 4, neutralLevel: 'normal', seed, policy });
  if (st.winner != null) wins[(st.winner + rot) % 4]++;
}
console.log(`   kazanma: Kolay ${wins[0]}, Normal ${wins[1]}, Zor ${wins[2] + wins[3]} (iki koltuk)`);

console.log('\nDikkatli oyuncu, tek yapay zekâ rakibe karşı — 9×9, Normal arena, 150 maç:');
const vsAi = {};
for (const level of ['kolay', 'normal', 'zor']) {
  let won = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const flip = seed % 2;
    const policy = flip ? [level, 'careful'] : ['careful', level];
    const { st } = runGame({ n: 2, neutralLevel: 'normal', seed, policy });
    if (st.winner === (flip ? 1 : 0)) won++;
  }
  vsAi[level] = won;
  console.log(`   rakip ${level.padEnd(6)}: dikkatli oyuncu %${(100 * won / 150).toFixed(0)} kazandı`);
}

console.log('\nZor yapay zekâ, Normal yapay zekâya karşı — 9×9, Normal arena, 200 maç:');
{
  let zor = 0, normal = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const flip = seed % 2;
    const { st } = runGame({ n: 2, neutralLevel: 'normal', seed, policy: flip ? ['zor', 'normal'] : ['normal', 'zor'] });
    if (st.winner == null) continue;
    if (st.winner === (flip ? 0 : 1)) zor++; else normal++;
  }
  console.log(`   Zor ${zor} · Normal ${normal}`);
}

test('normal ve zor arena botları dikkatli oyuncuyu kolaydan çabuk yakalar', () => {
  assert.ok(strength.normal < strength.kolay, `normal ${strength.normal} tur ≥ kolay ${strength.kolay} tur`);
  assert.ok(strength.zor <= strength.normal, `zor ${strength.zor} tur > normal ${strength.normal} tur`);
});

test('yapay zekâ oyuncu: normal ve zor, kolaydan çok daha sık kazanır', () => {
  assert.ok(wins[1] > 3 * wins[0] && (wins[2] + wins[3]) / 2 > 3 * wins[0]);
});

console.log(`\n${passed} test geçti.`);

test('İkiz bir taş alınca sahibi çift puan ve ayna bonusu kazanır', () => {
  const st = soloPosition({ me: [1, 1], twin: [5, 5], bots: [{ kind: 'red', r: 5, c: 6 }, { kind: 'blue', r: 8, c: 8 }] });
  play(st, { r: 1, c: 2 });
  play(st, chooseMove(st, currentActor(st)));
  assert.equal(pieceById(st, 'b1').alive, false);
  assert.equal(st.seats[0].score, POINTS.red * 2);
  assert.equal(st.seats[0].bonuses.swap, 1);
  assert.equal(st.seats[0].bonuses.step, 2);
});

test('çok oyunculu, devam açıkken: tek yıldız kalınca kazanan belli olur, maç sürer', () => {
  const mk = keep => {
    const st = position([{ kind: 'blue', r: 8, c: 8 }]);
    st.keepGoing = keep;
    Object.assign(pieceById(st, 's1'), { r: 2, c: 1 });
    play(st, { r: 2, c: 1 }); // s0, s1'i alır
    return st;
  };
  const st = mk(true);
  assert.equal(st.decided, true);
  assert.equal(st.over, false);
  assert.equal(st.winner, 0);
  assert.equal(endMatch(st).over, true);
  assert.equal(mk(false).over, true);
});

test('tek oyunculu: 13×13 tahta ve en çok bot', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const st = createGame({ seats: seats(1), seed, size: 13, neutrals: 999 });
    assert.equal(st.size, 13);
    assert.equal(st.pieces.filter(p => p.kind === 'red' || p.kind === 'blue').length, maxNeutrals(13));
    assert.equal(new Set(st.pieces.map(p => `${p.r},${p.c}`)).size, st.pieces.length);
  }
  assert.equal(createGame({ seats: seats(2), seed: 1, size: 13 }).size, 13);
  assert.equal(createGame({ seats: seats(3), seed: 1, size: 9 }).size, 11); // en az varsayılan kadar
  assert.equal(createGame({ seats: seats(2), seed: 1, size: 7 }).size, 9);
});

test('ayna: 50 puanda gelir, tahtanın her yerindeki taşla yer değiştirir', () => {
  const st = position([{ kind: 'blue', r: 2, c: 1 }, { kind: 'red', r: 8, c: 8 }]);
  const seat = st.seats[0];
  seat.score = 40; seat.scoreTier = 2;
  play(st, { r: 2, c: 1 }); // +10 → 50
  assert.equal(seat.bonuses.swap, 1);
  const me = pieceById(st, 's0');
  const far = legalMoves(st, me, st.mode, 'swap').find(m => m.type === 'swap' && m.targetId === 'b2');
  assert.ok(far, 'uzaktaki bota geçiş olmalı');
  assert.equal(legalMoves(st, me, st.mode, 'swap').some(m => m.targetId === 'tw'), false);
});

test('ikinci daralmayı atlatan yıldıza çift hamle gelir', () => {
  const g = createGame({ seats: seats(2), seed: 9, neutrals: 0, shrinkStart: 1, shrinkEvery: 1 });
  const mid = (g.size - 1) / 2;
  const walk = () => play(g, legalMoves(g, currentActor(g), g.mode).filter(m => m.type === 'walk')
    .sort((x, y) => Math.hypot(x.r - mid, x.c - mid) - Math.hypot(y.r - mid, y.c - mid))[0] ?? null);
  let guard = 0;
  while (g.ring < 2 && !g.over && guard++ < 50) walk();
  assert.equal(g.ring, 2);
  g.seats.filter(s => !s.out).forEach(s => { assert.equal(s.bonuses.armor, 1); assert.equal(s.bonuses.double, 1); });
});

test('kızıl ve çelik botlar eşit sayıda ve yıldızların çevresinde dengeli dağılır', () => {
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
  console.log(`   yıldız çevresinde kızıl-çelik farkı: ortalama ${(total / n).toFixed(2)}, en kötü ${worst}`);
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

test('takımlı maç: takım arkadaşı alınmaz, bir takım kalınca maç biter', () => {
  const st = createGame({ seats: seats(4, 'bot', 'normal'), seed: 5, teams: true, shuffle: false, neutrals: 0 });
  assert.deepEqual(st.teams, [0, 1, 0, 1]);
  const s0 = pieceById(st, 's0'), s2 = pieceById(st, 's2'), s1 = pieceById(st, 's1');
  assert.ok(friendly(st, s0, s2) && !friendly(st, s0, s1));
  Object.assign(s2, { r: s0.r, c: s0.c + 1 });
  st.mode = 'DUZ';
  assert.equal(legalMoves(st, s0, 'DUZ').some(m => m.type === 'take' && m.targetId === 's2'), false);
  // takım 1'in iki yıldızı da gidince takım 0 kazanır
  const wins = [0, 0];
  for (let seed = 1; seed <= 20; seed++) {
    const g = simulate({ seats: seats(4, 'bot', 'normal'), seed, teams: true });
    assert.ok(g.over);
    if (g.winner != null) { wins[g.winTeam]++; assert.ok(isWinner(g, g.winner)); }
  }
  console.log(`   takım galibiyetleri (20 maç): A ${wins[0]} · B ${wins[1]}`);
});

test('engel kareleri: birbirine değmez, taş üstüne gelmez, hamle içine girmez', () => {
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
  const g = simulate({ seats: seats(3, 'bot', 'zor'), seed: 7, obstacles: true });
  assert.ok(g.over);
});

test('kişilikler: yapay zekâ rakiplere dağıtılır, maç tamamlanır', () => {
  const st = createGame({ seats: seats(4, 'bot', 'normal'), seed: 3, personas: true });
  assert.ok(st.seats.every(s => ['hunter', 'careful', 'opportunist'].includes(s.persona)));
  const wins = { hunter: 0, careful: 0, opportunist: 0 };
  for (let seed = 1; seed <= 90; seed++) {
    const g = simulate({ seats: seats(4, 'bot', 'zor'), seed, personas: true });
    if (g.winner != null) wins[g.seats[g.winner].persona]++;
  }
  console.log(`   kişilik galibiyetleri (90 maç, 4 Zor): avcı ${wins.hunter} · temkinli ${wins.careful} · fırsatçı ${wins.opportunist}`);
  assert.ok(Object.values(wins).every(w => w >= 8), 'bir kişilik neredeyse hiç kazanmıyor');
});

test('bulmaca: hamle hakkı bitince kaybedersin, botlar bitince kazanırsın', () => {
  const st = createPuzzle({ me: [4, 4], bots: [{ kind: 'red', r: 4, c: 5 }], limit: 2 });
  assert.equal(st.puzzle.limit, 2);
  play(st, { r: 4, c: 5 }); // botu al
  assert.equal(st.over, true);
  assert.equal(st.winner, 0);
  const lose = createPuzzle({ me: [0, 0], bots: [{ kind: 'blue', r: 8, c: 8 }], limit: 1 });
  play(lose, { r: 0, c: 1 });
  for (let i = 0; i < 4 && !lose.over; i++) play(lose, chooseMove(lose, currentActor(lose)));
  assert.equal(lose.over, true);
  assert.equal(lose.winner, null);
});

test('numaralar her tur ayakta kalanlara göre baştan verilir, sıra değişmez', () => {
  const st = createGame({ seats: [{ kind: 'human' }, { kind: 'bot', level: 'normal' }], neutrals: 6, seed: 5, size: 9 });
  const before = st.order.slice();
  const dead = before.filter(id => id !== 's0' && id !== 's1' && !id.startsWith('t'))[1];
  pieceById(st, dead).alive = false;
  const next = roundOrder(st);
  assert.deepEqual(next, before.filter(id => id !== dead));
  next.forEach((id, i) => { const p = pieceById(st, id); if (p.kind === 'red' || p.kind === 'blue') assert.equal(p.label, String(i + 1)); });
});

test('bulmaca haritası: şekil ve engel kapalı, botlar yürümez, menzile gireni alır', async () => {
  const { PUZZLES } = await import('../tools/puzzles-out.mjs');
  assert.ok(PUZZLES.length >= 10);
  for (const def of PUZZLES) {
    const st = createPuzzle({ map: def.map, limit: def.par + 1, mode: def.mode, bonuses: def.bonuses });
    const me = currentActor(st);
    assert.equal(me.id, 's0');
    for (const m of legalMoves(st, me, st.mode)) assert.ok(!st.blocked.has(m.r * st.size + m.c));
  }
  const st = createPuzzle({ map: ['S....', '.....', '..K..'], limit: 5, mode: 'DUZ' });
  const bot = st.pieces.find(p => p.kind === 'red');
  play(st, { r: st.pieces[0].r, c: 1 }); // botun menzili dışında kal
  assert.deepEqual([bot.r, bot.c], [3, 2]);
  assert.ok(st.holes.size > 0);
});
