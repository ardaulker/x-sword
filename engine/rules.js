// X Sword kural motoru.
// Ekrana dokunmaz: aynı kurallar tarayıcıda, testlerde ve ileride çevrimiçi sunucuda çalışır.

// 1 yıldız: tek oyunculu mod (sen + aynan İkiz + arena botları).
export const SIZE_BY_STARS = { 1: 9, 2: 9, 3: 11, 4: 13 };
export const NEUTRALS_BY_STARS = { 1: 14, 2: 14, 3: 21, 4: 28 };
export const SEAT_NAMES = ['Turkuaz', 'Mor', 'Sarı', 'Pembe'];

// Puan: bir yıldız (oyuncu) almak 50, İkiz'i almak 30, bir botu almak 10. Yalnız yıldızlar puan toplar.
// Maçın sonunda ayakta kalan yıldız +30 hayatta kalma bonusu alır.
export const POINTS = { star: 50, twin: 30, red: 10, blue: 10 };
export const SURVIVOR_BONUS = 30;
const SEAT_NAMES_ACC = ["Turkuaz'ı", "Mor'u", "Sarı'yı", "Pembe'yi"];

const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CROSS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const flip = mode => (mode === 'DUZ' ? 'CAPRAZ' : 'DUZ');
export const modeLabel = mode => (mode === 'DUZ' ? 'DÜZ' : 'ÇAPRAZ');

// Kırmızı düz yürür, çapraz alır. Mavi tersi. Yıldız ve İkiz modun yönünde hem yürür hem alır.
export function walkDirs(piece, mode) {
  if (piece.kind === 'red') return STRAIGHT;
  if (piece.kind === 'blue') return CROSS;
  return mode === 'DUZ' ? STRAIGHT : CROSS;
}

export function takeDirs(piece, mode) {
  if (piece.kind === 'red') return CROSS;
  if (piece.kind === 'blue') return STRAIGHT;
  return mode === 'DUZ' ? STRAIGHT : CROSS;
}

// Tohumlu rastgele sayı (mulberry32): aynı tohum aynı oyunu verir, testler tekrarlanabilir.
export function random(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const pieceById = (state, id) => state.pieces.find(p => p.id === id);
export const starOf = (state, seat) => state.pieces.find(p => p.kind === 'star' && p.seat === seat);
export const pieceAt = (state, r, c) => state.pieces.find(p => p.alive && p.r === r && p.c === c) || null;
export const ringOf = (state, r, c) => Math.min(r, c, state.size - 1 - r, state.size - 1 - c);
export const inArena = (state, r, c) =>
  r >= 0 && c >= 0 && r < state.size && c < state.size && ringOf(state, r, c) >= state.ring;

export const nameOf = (state, p) =>
  p.kind === 'star' ? state.seats[p.seat].name : p.kind === 'twin' ? 'İkiz' : `${p.label} numara`;
const accOf = (state, p) =>
  p.kind === 'star' ? SEAT_NAMES_ACC[p.seat] : p.kind === 'twin' ? "İkiz'i" : `${p.label} numarayı`;

function log(state, text) {
  state.log.push({ round: state.round, text });
}

// Yıldızlar köşelerden bir kare içeride, birbirinden eşit uzaklıkta başlar; 4 kişide saat yönünde.
// Maçta bu diziliş rastgele döndürülür ya da aynalanır, koltuklar da köşelere rastgele dağılır.
function startCells(n, size) {
  const a = 1, b = size - 2, mid = (size - 1) / 2;
  if (n === 1) return [[a, a]];
  if (n === 2) return [[a, a], [b, b]];
  if (n === 3) return [[a, a], [a, b], [b, mid]];
  return [[a, a], [a, b], [b, b], [b, a]];
}

function shuffle(state, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Tahtanın 8 simetrisinden biri: 4 dönüş × ayna.
function randomSymmetry(state, size) {
  const k = Math.floor(random(state) * 8), m = size - 1;
  return ([r, c]) => {
    let p = k >= 4 ? [r, m - c] : [r, c];
    for (let i = 0; i < k % 4; i++) p = [p[1], m - p[0]];
    return p;
  };
}

// seats: [{ kind: 'human' | 'bot', level: 'kolay' | 'normal' | 'zor' }], 1–4 tane.
// Tek koltuk tek oyunculu moddur: oyuncunun aynası İkiz de tahtaya girer, son kalan kazanır.
// firstSeat: bu koltuk hep ilk oynar (kolay zorlukta oyuncu). Verilmezse herkesin yeri rastgeledir.
// shuffle: false ise köşeler ve sıra sabit kalır (yalnız testler için).
export function createGame({
  seats, neutralLevel = 'normal', seed, shrinkStart = 6, shrinkEvery = 6, neutrals, firstSeat = null, shuffle: mix = true,
} = {}) {
  const n = seats?.length;
  if (!(n >= 1 && n <= 4)) throw new Error('Bir maçta 1–4 yıldız olur.');
  const size = SIZE_BY_STARS[n];
  const state = {
    size, round: 1, mode: 'DUZ', ring: 0, shrinkStart, shrinkEvery, neutralLevel,
    rng: ((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0) || 1,
    seats: seats.map((s, i) => ({
      index: i, name: SEAT_NAMES[i], kind: s.kind === 'bot' ? 'bot' : 'human',
      level: s.level || 'normal', takes: 0, score: 0, bonus: 0, out: false,
    })),
    pieces: [], order: [], turn: 0, over: false, winner: null, outOrder: [], log: [],
    solo: n === 1, lastStep: null, matchOrder: [],
  };

  let starts = startCells(n, size);
  if (mix) starts = shuffle(state, starts.map(randomSymmetry(state, size)));
  starts.forEach(([r, c], i) => state.pieces.push({ id: `s${i}`, kind: 'star', seat: i, r, c, alive: true }));

  // Arena botları hiçbir yıldızın iki kare yakınına konmaz: kimse ilk turda alınmaz.
  const free = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (starts.every(([sr, sc]) => Math.max(Math.abs(r - sr), Math.abs(c - sc)) >= 3)) free.push([r, c]);
    }
  }
  shuffle(state, free);
  // Tek oyunculu modda oyuncunun aynası İkiz de rastgele bir kareden başlar.
  if (state.solo) {
    const [r, c] = free.pop();
    state.pieces.push({ id: 'tw', kind: 'twin', mirrors: 's0', label: 'İkiz', r, c, alive: true });
  }
  const count = Math.min(neutrals ?? NEUTRALS_BY_STARS[n], free.length);
  const reds = Math.ceil(count / 2);
  for (let i = 0; i < count; i++) {
    const [r, c] = free[i];
    state.pieces.push({ id: `b${i + 1}`, kind: i < reds ? 'red' : 'blue', label: String(i + 1), r, c, alive: true });
  }

  state.matchOrder = matchOrder(state, firstSeat, mix);
  state.order = roundOrder(state);
  log(state, 'Oyun başladı. Mod: DÜZ.');
  return state;
}

// Hamle sırası maç başında bir kez karılır ve bütün maç aynı kalır: yıldızlar ve botlar tek sırada.
// İkiz hep aynası olduğu yıldızdan hemen sonra gelir. Botun numarası bu sıradaki yeridir.
function matchOrder(state, firstSeat, mix) {
  let ids = state.pieces.filter(p => p.kind !== 'twin').map(p => p.id);
  if (mix) shuffle(state, ids);
  if (firstSeat != null) ids = [`s${firstSeat}`, ...ids.filter(id => id !== `s${firstSeat}`)];
  for (const tw of state.pieces.filter(p => p.kind === 'twin')) ids.splice(ids.indexOf(tw.mirrors) + 1, 0, tw.id);
  ids.forEach((id, i) => {
    const p = pieceById(state, id);
    if (p.kind === 'red' || p.kind === 'blue') p.label = String(i + 1);
  });
  return ids;
}

export function roundOrder(state) {
  return state.matchOrder.filter(id => pieceById(state, id).alive);
}

export function currentActor(state) {
  return state.over ? null : pieceById(state, state.order[state.turn]);
}

export function isBotTurn(state) {
  const a = currentActor(state);
  return !!a && (a.kind !== 'star' || state.seats[a.seat].kind === 'bot');
}

// Bir yıldızın bir sonraki hamlesindeki mod: bu tur sırası daha gelmediyse bu turun modu,
// geldiyse bir sonraki turun modu. Arena botlarında mod önemsizdir.
export function nextMode(state, p) {
  if (p.kind === 'red' || p.kind === 'blue') return state.mode;
  return state.order.indexOf(p.id) >= state.turn ? state.mode : flip(state.mode);
}

export function legalMoves(state, piece, mode = nextMode(state, piece)) {
  const moves = [];
  for (const [dr, dc] of walkDirs(piece, mode)) {
    const r = piece.r + dr, c = piece.c + dc;
    if (inArena(state, r, c) && !pieceAt(state, r, c)) moves.push({ r, c, type: 'walk' });
  }
  for (const [dr, dc] of takeDirs(piece, mode)) {
    const r = piece.r + dr, c = piece.c + dc;
    const target = inArena(state, r, c) && pieceAt(state, r, c);
    if (target && target.id !== piece.id) moves.push({ r, c, type: 'take', targetId: target.id });
  }
  return moves;
}

// İkiz, aynası olduğu yıldızın az önce yaptığı yönün aynısını oynar: o kare boşsa yürür,
// doluysa oradaki taşı alır, tahta dışıysa ya da çöktüyse yerinde kalır.
export function twinMove(state, twin) {
  const s = state.lastStep;
  if (!s || s.id !== twin.mirrors || (!s.dr && !s.dc)) return null;
  return legalMoves(state, twin, state.mode).find(m => m.r === twin.r + s.dr && m.c === twin.c + s.dc) ?? null;
}

const twinOf = (state, piece) =>
  state.pieces.find(p => p.kind === 'twin' && p.alive && p.mirrors === piece.id) ?? null;

// (r, c)'deki bir taşı, onun bir sonraki hamlesinden önce alabilecek taşlar.
// İki hamle arasında herkes bir kez oynar ve bir taş ya yürür ya alır; bu yüzden
// alabilecek olan, şu an o kareye kendi alma yönünde komşu olan taştır.
export function attackersOf(state, r, c, except = []) {
  const out = [];
  for (const p of state.pieces) {
    if (!p.alive || except.includes(p.id)) continue;
    if (Math.abs(p.r - r) > 1 || Math.abs(p.c - c) > 1) continue;
    if (takeDirs(p, nextMode(state, p)).some(([dr, dc]) => p.r + dr === r && p.c + dc === c)) out.push(p);
  }
  return out;
}

// Arena her 6 turda bir (6., 12., 18. … turun sonunda) dış halkasını kaybeder.
export function collapseDue(state) {
  return state.round >= state.shrinkStart
    && (state.round - state.shrinkStart) % state.shrinkEvery === 0
    && state.ring < (state.size - 1) / 2;
}

export function nextCollapseRound(state) {
  if (state.ring >= (state.size - 1) / 2) return null;
  if (state.round < state.shrinkStart) return state.shrinkStart;
  const into = (state.round - state.shrinkStart) % state.shrinkEvery;
  return state.round + (into === 0 ? 0 : state.shrinkEvery - into);
}

// Şu an oynayan taş için: bu kare, tekrar sırası gelmeden çökecek mi?
export const doomedAt = (state, r, c) => collapseDue(state) && ringOf(state, r, c) === state.ring;

// Hamle önizlemesi: piece bu hamleyi yaparsa onu kimler alabilir, kare çökecek mi?
// Yıldızın kendi İkiz'i tahmin edilmez, kesin bilinir: aynı yönde gelir.
export function threatsFor(state, piece, move) {
  const target = move.type === 'take' ? pieceById(state, move.targetId) : null;
  const from = [piece.r, piece.c];
  piece.r = move.r; piece.c = move.c;
  if (target) target.alive = false;
  try {
    const twin = twinOf(state, piece);
    const attackers = attackersOf(state, move.r, move.c, twin ? [piece.id, twin.id] : [piece.id]);
    if (twin && twin.r + move.r - from[0] === move.r && twin.c + move.c - from[1] === move.c) attackers.push(twin);
    return { attackers, doomed: doomedAt(state, move.r, move.c) };
  } finally {
    [piece.r, piece.c] = from;
    if (target) target.alive = true;
  }
}

export function isSafe(state, piece, move) {
  const t = threatsFor(state, piece, move);
  return !t.doomed && t.attackers.length === 0;
}

// Sıradaki taşın hamlesini uygular. move null ise sıra geçer (hamlesi olmayan taş için).
export function play(state, move) {
  const actor = currentActor(state);
  if (!actor) return state;
  if (move) {
    const m = legalMoves(state, actor, state.mode).find(x => x.r === move.r && x.c === move.c);
    if (!m) throw new Error(`Geçersiz hamle: ${nameOf(state, actor)} → ${move.r},${move.c}`);
    state.lastStep = { id: actor.id, dr: m.r - actor.r, dc: m.c - actor.c };
    if (m.type === 'take') takePiece(state, actor, pieceById(state, m.targetId));
    actor.r = m.r; actor.c = m.c;
  } else {
    state.lastStep = { id: actor.id, dr: 0, dc: 0 };
    if (actor.kind === 'star') log(state, `${nameOf(state, actor)} hamle yapamadı, sıra geçti.`);
  }
  state.turn++;
  settle(state);
  return state;
}

function takePiece(state, actor, target) {
  target.alive = false;
  if (actor.kind === 'star') {
    state.seats[actor.seat].takes++;
    state.seats[actor.seat].score += POINTS[target.kind];
  }
  log(state, `⚔️ ${nameOf(state, actor)}, ${accOf(state, target)} aldı!`);
  if (target.kind === 'star') starOut(state, target);
  checkOver(state);
}

function starOut(state, star) {
  const seat = state.seats[star.seat];
  seat.out = true;
  seat.outRound = state.round;
  state.outOrder.push(star.seat);
  checkOver(state);
}

// Maç, çok oyunculuda tek yıldız kalınca biter; kazananı skor belirler (ranking).
// Tek oyunculu: İkiz ve bütün botlar gidince kazanırsın, alınınca kaybedersin.
function checkOver(state) {
  if (state.over) return;
  const alive = state.pieces.filter(p => p.kind === 'star' && p.alive);
  if (state.solo) {
    if (alive.length && state.pieces.some(p => p.alive && p.kind !== 'star')) return;
    state.over = true;
    if (alive.length) survivorBonus(state, 0);
    state.winner = alive.length ? 0 : null;
    log(state, alive.length ? '🏆 Kazandın! Arenada tek sen kaldın.' : '❌ Alındın! Oyun bitti.');
    return;
  }
  if (alive.length > 1) return;
  state.over = true;
  if (alive.length) survivorBonus(state, alive[0].seat);
  state.winner = ranking(state)[0];
  const w = state.seats[state.winner];
  log(state, `🏆 ${w.name} kazandı! (${w.score} puan)`);
}

function survivorBonus(state, seat) {
  state.seats[seat].bonus = SURVIVOR_BONUS;
  state.seats[seat].score += SURVIVOR_BONUS;
}

// Alınmış taşların sırası beklenmeden atlanır; tur bitince mod değişir, arena gerekirse daralır.
function settle(state) {
  while (!state.over) {
    while (state.turn < state.order.length && !pieceById(state, state.order[state.turn]).alive) state.turn++;
    if (state.turn < state.order.length) return;
    endRound(state);
  }
}

function endRound(state) {
  if (collapseDue(state)) collapse(state);
  if (state.over) return;
  state.round++;
  state.mode = flip(state.mode);
  state.order = roundOrder(state);
  state.turn = 0;
  log(state, `— Tur ${state.round} · ${modeLabel(state.mode)} —`);
}

function collapse(state) {
  const ring = state.ring;
  const fallen = state.pieces.filter(p => p.alive && ringOf(state, p.r, p.c) === ring);
  fallen.forEach(p => { p.alive = false; });
  state.ring++;
  const side = state.size - 2 * state.ring;
  log(state, fallen.length
    ? `🌀 Arena daraldı (${side}×${side})! Dışarıda kalan düştü: ${fallen.map(p => nameOf(state, p)).join(', ')}.`
    : `🌀 Arena daraldı (${side}×${side}).`);
  fallen.filter(p => p.kind === 'star').forEach(p => starOut(state, p));
  checkOver(state);
}

// Kazanan önce, sonra en son çıkandan ilk çıkana.
// Sıralama: önce skor, sonra alma sayısı, sonra hayatta kalma (ayakta kalan > geç elenen > erken elenen).
export function ranking(state) {
  const lasted = s => (s.out ? state.outOrder.indexOf(s.index) : state.seats.length);
  return [...state.seats]
    .sort((a, b) => b.score - a.score || b.takes - a.takes || lasted(b) - lasted(a))
    .map(s => s.index);
}
