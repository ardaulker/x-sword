// X Sword kural motoru.
// Ekrana dokunmaz: aynı kurallar tarayıcıda, testlerde ve ileride çevrimiçi sunucuda çalışır.

export const SIZE_BY_STARS = { 2: 9, 3: 11, 4: 13 };
export const NEUTRALS_BY_STARS = { 2: 14, 3: 21, 4: 28 };
export const SEAT_NAMES = ['Turkuaz', 'Mor', 'Sarı', 'Pembe'];
const SEAT_NAMES_ACC = ["Turkuaz'ı", "Mor'u", "Sarı'yı", "Pembe'yi"];

const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CROSS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const flip = mode => (mode === 'DUZ' ? 'CAPRAZ' : 'DUZ');
export const modeLabel = mode => (mode === 'DUZ' ? 'DÜZ' : 'ÇAPRAZ');

// Kırmızı düz yürür, çapraz alır. Mavi tersi. Yıldız modun yönünde hem yürür hem alır.
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

export const nameOf = (state, p) => (p.kind === 'star' ? state.seats[p.seat].name : `${p.label} numara`);
const accOf = (state, p) => (p.kind === 'star' ? SEAT_NAMES_ACC[p.seat] : `${p.label} numarayı`);

function log(state, text) {
  state.log.push({ round: state.round, text });
}

// Yıldızlar köşelerden bir kare içeride, birbirinden eşit uzaklıkta başlar; 4 kişide saat yönünde.
function startCells(n, size) {
  const a = 1, b = size - 2, mid = (size - 1) / 2;
  if (n === 2) return [[a, a], [b, b]];
  if (n === 3) return [[a, a], [a, b], [b, mid]];
  return [[a, a], [a, b], [b, b], [b, a]];
}

// seats: [{ kind: 'human' | 'bot', level: 'kolay' | 'normal' | 'zor' }], 2–4 tane.
export function createGame({ seats, neutralLevel = 'normal', seed, shrinkStart = 8, shrinkEvery = 4, neutrals } = {}) {
  const n = seats?.length;
  if (!(n >= 2 && n <= 4)) throw new Error('Bir maçta 2–4 yıldız olur.');
  const size = SIZE_BY_STARS[n];
  const state = {
    size, round: 1, mode: 'DUZ', ring: 0, shrinkStart, shrinkEvery, neutralLevel,
    rng: ((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0) || 1,
    seats: seats.map((s, i) => ({
      index: i, name: SEAT_NAMES[i], kind: s.kind === 'bot' ? 'bot' : 'human',
      level: s.level || 'normal', takes: 0, out: false,
    })),
    pieces: [], order: [], turn: 0, over: false, winner: null, outOrder: [], log: [],
  };

  const starts = startCells(n, size);
  starts.forEach(([r, c], i) => state.pieces.push({ id: `s${i}`, kind: 'star', seat: i, r, c, alive: true }));

  // Arena botları hiçbir yıldızın iki kare yakınına konmaz: kimse ilk turda alınmaz.
  const free = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (starts.every(([sr, sc]) => Math.max(Math.abs(r - sr), Math.abs(c - sc)) >= 3)) free.push([r, c]);
    }
  }
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  const count = Math.min(neutrals ?? NEUTRALS_BY_STARS[n], free.length);
  const reds = Math.ceil(count / 2);
  for (let i = 0; i < count; i++) {
    const [r, c] = free[i];
    state.pieces.push({ id: `b${i + 1}`, kind: i < reds ? 'red' : 'blue', label: String(i + 1), r, c, alive: true });
  }

  state.order = roundOrder(state);
  log(state, 'Oyun başladı. Mod: DÜZ.');
  return state;
}

// Önce yıldızlar oynar; her tur başlayan koltuk bir kayar. Sonra arena botları numara sırasıyla.
export function roundOrder(state) {
  const n = state.seats.length, rot = (state.round - 1) % n;
  const stars = [];
  for (let i = 0; i < n; i++) {
    const p = starOf(state, (i + rot) % n);
    if (p.alive) stars.push(p.id);
  }
  const bots = state.pieces.filter(p => p.kind !== 'star' && p.alive).map(p => p.id);
  return [...stars, ...bots];
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
  if (p.kind !== 'star') return state.mode;
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

// Arena 8. turdan sonra her 4 turda bir, tur sonunda dış halkasını kaybeder.
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
export function threatsFor(state, piece, move) {
  const target = move.type === 'take' ? pieceById(state, move.targetId) : null;
  const from = [piece.r, piece.c];
  piece.r = move.r; piece.c = move.c;
  if (target) target.alive = false;
  try {
    return { attackers: attackersOf(state, move.r, move.c, [piece.id]), doomed: doomedAt(state, move.r, move.c) };
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
    if (m.type === 'take') takePiece(state, actor, pieceById(state, m.targetId));
    actor.r = m.r; actor.c = m.c;
  } else if (actor.kind === 'star') {
    log(state, `${nameOf(state, actor)} hamle yapamadı, sıra geçti.`);
  }
  state.turn++;
  settle(state);
  return state;
}

function takePiece(state, actor, target) {
  target.alive = false;
  if (actor.kind === 'star') state.seats[actor.seat].takes++;
  log(state, `⚔️ ${nameOf(state, actor)}, ${accOf(state, target)} aldı!`);
  if (target.kind === 'star') starOut(state, target);
}

function starOut(state, star) {
  const seat = state.seats[star.seat];
  seat.out = true;
  seat.outRound = state.round;
  state.outOrder.push(star.seat);
  checkOver(state);
}

function checkOver(state) {
  if (state.over) return;
  const alive = state.pieces.filter(p => p.kind === 'star' && p.alive);
  if (alive.length > 1) return;
  state.over = true;
  state.winner = alive.length ? alive[0].seat : null;
  log(state, alive.length ? `🏆 ${state.seats[state.winner].name} kazandı!` : 'Berabere! Arenada yıldız kalmadı.');
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
}

// Kazanan önce, sonra en son çıkandan ilk çıkana.
export function ranking(state) {
  const out = [...state.outOrder].reverse();
  return state.winner == null ? out : [state.winner, ...out];
}
