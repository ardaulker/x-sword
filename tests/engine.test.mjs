// Kural motoru ve botların testleri: node tests/engine.test.mjs
import assert from 'node:assert/strict';
import {
  createGame, play, currentActor, legalMoves, attackersOf, isSafe, collapseDue, ringOf,
  roundOrder, random, pieceById, threatsFor, SIZE_BY_STARS, NEUTRALS_BY_STARS,
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
  for (let seed = 1; seed <= 40; seed++) {
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
  assert.match(st.log.at(-1).text, /Turkuaz, 1 numarayı aldı!/);
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

test('tek oyunculu: İkiz ve botlar gidince kazanırsın, alınınca kaybedersin', () => {
  const win = soloPosition({ me: [1, 1], twin: [1, 2] });
  play(win, { r: 1, c: 2 }); // İkiz'i al
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

test('normal ve zor arena botları dikkatli oyuncuyu kolaydan çabuk yakalar', () => {
  assert.ok(strength.normal < strength.kolay, `normal ${strength.normal} tur ≥ kolay ${strength.kolay} tur`);
  assert.ok(strength.zor <= strength.normal, `zor ${strength.zor} tur > normal ${strength.normal} tur`);
});

test('yapay zekâ oyuncu: normal ve zor, kolaydan çok daha sık kazanır', () => {
  assert.ok(wins[1] > 3 * wins[0] && (wins[2] + wins[3]) / 2 > 3 * wins[0]);
});

console.log(`\n${passed} test geçti.`);
