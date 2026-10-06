// X Sword kural motoru.
// Ekrana dokunmaz: aynı kurallar tarayıcıda, testlerde ve ileride çevrimiçi sunucuda çalışır.

// 1 yıldız: tek oyunculu mod (sen + aynan İkiz + arena botları).
export const SIZE_BY_STARS = { 1: 9, 2: 9, 3: 11, 4: 13 };
export const NEUTRALS_BY_STARS = { 1: 14, 2: 14, 3: 21, 4: 28 };
// Tahta ve bot sayısı seçilebilir; tahta en az oyuncu sayısının varsayılanı kadar olur (9, 11, 13), en çok 15.
// Tahtanın üçte biri botla dolarsa daha fazlası oynanmaz.
export const BOARD_SIZES = [9, 11, 13, 15];
export const maxNeutrals = size => Math.floor(size * size / 3);
// Seçilen tahtada, varsayılan kalabalıkla aynı yoğunlukta bot sayısı.
export const defaultNeutrals = (stars, size) =>
  Math.min(maxNeutrals(size), Math.round(NEUTRALS_BY_STARS[stars] * size * size / SIZE_BY_STARS[stars] ** 2));
export const SEAT_NAMES = ['Turkuaz', 'Mor', 'Sarı', 'Pembe'];

// Puan: bir yıldız (oyuncu) almak 50, İkiz'i almak 30, bir botu almak 10. Yalnız yıldızlar puan toplar.
// Maçın sonunda ayakta kalan yıldız +30 hayatta kalma bonusu alır.
export const POINTS = { star: 50, twin: 30, red: 10, blue: 10 };
export const SURVIVOR_BONUS = 30;

// Bonuslar şartla kazanılır: 20 puan çift adım, 40 puan çift hamle, 60 puan ikisinden biri (tohumdan),
// 50 puan ayna (istediğin taşla yer değiştir), ilk daralmayı atlatınca zırh, ikinci daralmayı atlatınca çift hamle.
// Tek oyunculuda İkiz bir taş alınca da ayna gelir.
// Zırh kendiliğinden çalışır (seni alan taş geri döner). Diğerleri sırandayken hamleyle birlikte kullanılır.
export const BONUS_KINDS = ['armor', 'step', 'double', 'swap'];
export const BONUS_SCORES = [20, 40, 60];
export const TWIN_TAKE_MULT = 2;
export const SWAP_SCORE = 50;
// Herkes bir çift adımla başlar: köşeden erken sıkışmamak için.
const startBonuses = () => ({ armor: 0, step: 1, double: 0, swap: 0 });
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
  r >= 0 && c >= 0 && r < state.size && c < state.size && ringOf(state, r, c) >= state.ring
  && !(state.blocked && state.blocked.has(r * state.size + c));

// Takımlı maçta aynı takımdaki iki yıldız birbirini almaz.
export const friendly = (state, a, b) =>
  !!state.teams && a.kind === 'star' && b.kind === 'star' && a.id !== b.id && state.teams[a.seat] === state.teams[b.seat];

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
  seats, neutralLevel = 'normal', seed, shrinkStart = 6, shrinkEvery = 6, neutrals, firstSeat = null, shuffle: mix = true, keepGoing = false, size: sizeOpt = null, personas = false, obstacles = false, teams = false,
} = {}) {
  const n = seats?.length;
  if (!(n >= 1 && n <= 4)) throw new Error('Bir maçta 1–4 yıldız olur.');
  const size = BOARD_SIZES.includes(sizeOpt) && sizeOpt >= SIZE_BY_STARS[n] ? sizeOpt : SIZE_BY_STARS[n];
  const state = {
    size, round: 1, mode: 'DUZ', ring: 0, shrinkStart, shrinkEvery, neutralLevel,
    rng: ((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0) || 1,
    seats: seats.map((s, i) => ({
      index: i, name: SEAT_NAMES[i], kind: s.kind === 'bot' ? 'bot' : 'human',
      level: s.level || 'normal', takes: 0, score: 0, bonus: 0, out: false,
      bonuses: startBonuses(), scoreTier: 0, swapGiven: false, persona: null, team: null,
    })),
    pieces: [], order: [], turn: 0, over: false, winner: null, outOrder: [], log: [],
    solo: n === 1, lastStep: null, matchOrder: [], keepGoing: !!keepGoing, decided: false,
    blocked: null, teams: teams && n === 4 ? [0, 1, 0, 1] : null, winTeam: null, puzzle: null,
  };

  if (state.teams) state.seats.forEach((s, i) => { s.team = state.teams[i]; });
  // Yapay zekâ rakiplere kişilik: avcı, temkinli, fırsatçı (sıra tohumdan).
  if (personas) {
    const kinds = shuffle(state, ['hunter', 'careful', 'opportunist']);
    state.seats.filter(s => s.kind === 'bot').forEach((s, i) => { s.persona = kinds[i % kinds.length]; });
  }

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
  // Engel kareleri: birbirine değmeyen sütunlar, tahta hiç bölünmez.
  if (obstacles) {
    const want = Math.floor(size * size / 14), chosen = [];
    for (const [r, c] of free) {
      if (chosen.length >= want) break;
      if (chosen.every(([a, b]) => Math.max(Math.abs(a - r), Math.abs(b - c)) >= 2)) chosen.push([r, c]);
    }
    state.blocked = new Set(chosen.map(([r, c]) => r * size + c));
    for (let i = free.length - 1; i >= 0; i--) if (state.blocked.has(free[i][0] * size + free[i][1])) free.splice(i, 1);
  }
  // Tek oyunculu modda oyuncunun aynası İkiz de rastgele bir kareden başlar.
  if (state.solo) {
    const [r, c] = free.pop();
    state.pieces.push({ id: 'tw', kind: 'twin', mirrors: 's0', label: 'İkiz', r, c, alive: true });
  }
  const count = Math.min(neutrals ?? defaultNeutrals(n, size), free.length, maxNeutrals(size));
  const kinds = balancedKinds(state, free.slice(0, count), starts);
  for (let i = 0; i < count; i++) {
    const [r, c] = free[i];
    state.pieces.push({ id: `b${i + 1}`, kind: kinds[i], label: String(i + 1), r, c, alive: true });
  }

  state.matchOrder = matchOrder(state, firstSeat, mix);
  state.order = roundOrder(state);
  log(state, 'Oyun başladı. Mod: DÜZ.');
  return state;
}

// Kızıl ve Çelik botlar toplamda eşit, ama yakın çevrede de dengeli dağılır: hiçbir yıldızın etrafı tek renk olmaz.
// Her bot, kendi yakınındaki ve yakınındaki yıldızların çevresindeki farka bakıp azınlıktaki rengi alır.
function balancedKinds(state, cells, starts) {
  const reds = Math.ceil(cells.length / 2);
  let redLeft = reds, blueLeft = cells.length - reds;
  const placed = []; // { r, c, v } v: kızıl +1, çelik -1
  const near = (r, c, a, b, d) => Math.max(Math.abs(r - a), Math.abs(c - b)) <= d;
  const kinds = [];
  for (const [r, c] of cells) {
    let local = 0;
    for (const p of placed) if (near(r, c, p.r, p.c, 3)) local += p.v;
    // Yıldızın çevresindeki fark daha ağır basar.
    for (const [sr, sc] of starts) {
      if (!near(r, c, sr, sc, 4)) continue;
      for (const p of placed) if (near(p.r, p.c, sr, sc, 4)) local += p.v;
    }
    let want = local > 0 ? 'blue' : local < 0 ? 'red' : random(state) < 0.5 ? 'red' : 'blue';
    if (want === 'red' && !redLeft) want = 'blue';
    else if (want === 'blue' && !blueLeft) want = 'red';
    if (want === 'red') redLeft--; else blueLeft--;
    placed.push({ r, c, v: want === 'red' ? 1 : -1 });
    kinds.push(want);
  }
  // İyileştirme: bir kızılla bir çeliğin yerini değiştirmek dengeyi artırıyorsa değiştir.
  const cost = () => {
    let sum = 0;
    for (const [sr, sc] of starts) {
      let d = 0;
      for (const p of placed) if (near(p.r, p.c, sr, sc, 4)) d += p.v;
      sum += 3 * d * d;
    }
    for (const p of placed) {
      let d = 0;
      for (const q of placed) if (near(p.r, p.c, q.r, q.c, 3)) d += q.v;
      sum += d * d;
    }
    return sum;
  };
  if (placed.length > 3) {
    let best = cost();
    for (let it = 0; it < 250; it++) {
      const i = Math.floor(random(state) * placed.length), j = Math.floor(random(state) * placed.length);
      if (placed[i].v === placed[j].v) continue;
      placed[i].v *= -1; placed[j].v *= -1;
      const c = cost();
      if (c < best) best = c; else { placed[i].v *= -1; placed[j].v *= -1; }
    }
    placed.forEach((p, i) => { kinds[i] = p.v > 0 ? 'red' : 'blue'; });
  }
  return kinds;
}

// Bulmaca: elle kurulmuş küçük pozisyon. Amaç, en çok `limit` hamlede bütün arena botlarını almak.
export function createPuzzle({ me, bots, limit, mode = 'DUZ', size = 9 }) {
  const st = createGame({ seats: [{ kind: 'human' }], size, neutrals: 0, seed: 1, shuffle: false, shrinkStart: 999, neutralLevel: 'normal' });
  st.pieces = st.pieces.filter(p => p.kind !== 'twin');
  const star = st.pieces.find(p => p.kind === 'star');
  [star.r, star.c] = me;
  st.seats[0].bonuses = { armor: 0, step: 0, double: 0, swap: 0 };
  bots.forEach((b, i) => st.pieces.push({ id: `b${i + 1}`, kind: b.kind, label: String(i + 1), r: b.r, c: b.c, alive: true }));
  st.mode = mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  st.puzzle = { limit, used: 0 };
  st.log = [];
  return st;
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

// Her tur ayakta kalanlar baştan numaralanır: sıra aynı kalır, numaralar sıkışır (1, 2, 3, ...).
// Bot adı ("5 numara") da bu numarayı izler.
export function roundOrder(state) {
  const ids = state.matchOrder.filter(id => pieceById(state, id).alive);
  ids.forEach((id, i) => {
    const p = pieceById(state, id);
    if (p.kind === 'red' || p.kind === 'blue') p.label = String(i + 1);
  });
  return ids;
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

// bonus: yıldızın elindeki bir bonusla açılan hamleler de eklenir (hamle o bonusu taşır).
export function legalMoves(state, piece, mode = nextMode(state, piece), bonus = null) {
  const moves = baseMoves(state, piece, mode);
  if (!bonus || piece.kind !== 'star' || !(state.seats[piece.seat].bonuses[bonus] > 0)) return moves;
  if (bonus === 'double') return moves.map(m => ({ ...m, bonus }));
  if (bonus === 'step') {
    // İki kare: aradaki kare boş olmalı; ikinci kare boşsa yürür, doluysa alır.
    const out = [];
    for (const [dr, dc] of walkDirs(piece, mode)) {
      const r1 = piece.r + dr, c1 = piece.c + dc, r = piece.r + 2 * dr, c = piece.c + 2 * dc;
      if (!inArena(state, r1, c1) || pieceAt(state, r1, c1) || !inArena(state, r, c)) continue;
      const t = pieceAt(state, r, c);
      if (t && friendly(state, piece, t)) continue;
      out.push(t ? { r, c, type: 'take', targetId: t.id, bonus } : { r, c, type: 'walk', bonus });
    }
    return [...moves, ...out];
  }
  if (bonus === 'swap') {
    const out = state.pieces
      .filter(p => p.alive && p.id !== piece.id && p.kind !== 'twin')
      .map(p => ({ r: p.r, c: p.c, type: 'swap', targetId: p.id, bonus }));
    return [...moves, ...out];
  }
  return moves;
}

function baseMoves(state, piece, mode) {
  const moves = [];
  for (const [dr, dc] of walkDirs(piece, mode)) {
    const r = piece.r + dr, c = piece.c + dc;
    if (inArena(state, r, c) && !pieceAt(state, r, c)) moves.push({ r, c, type: 'walk' });
  }
  for (const [dr, dc] of takeDirs(piece, mode)) {
    const r = piece.r + dr, c = piece.c + dc;
    const target = inArena(state, r, c) && pieceAt(state, r, c);
    if (target && target.id !== piece.id && !friendly(state, piece, target)) moves.push({ r, c, type: 'take', targetId: target.id });
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
export function attackersOf(state, r, c, except = [], victim = null) {
  const out = [];
  for (const p of state.pieces) {
    if (!p.alive || except.includes(p.id)) continue;
    if (victim && friendly(state, p, victim)) continue;
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
    const attackers = attackersOf(state, move.r, move.c, twin ? [piece.id, twin.id] : [piece.id], piece);
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
    const m = legalMoves(state, actor, state.mode, move.bonus ?? null)
      .find(x => x.r === move.r && x.c === move.c && (x.bonus ?? null) === (move.bonus ?? null));
    if (!m) throw new Error(`Geçersiz hamle: ${nameOf(state, actor)} → ${move.r},${move.c}`);
    if (m.bonus) {
      state.seats[actor.seat].bonuses[m.bonus]--;
      log(state, `✨ ${nameOf(state, actor)} bonus kullandı: ${BONUS_NAMES[m.bonus]}.`);
    }
    if (state.puzzle && actor.id === 's0') state.puzzle.used++;
    state.lastStep = { id: actor.id, dr: m.r - actor.r, dc: m.c - actor.c };
    if (m.type === 'swap') {
      const other = pieceById(state, m.targetId);
      [other.r, other.c] = [actor.r, actor.c];
      actor.r = m.r; actor.c = m.c;
    } else if (m.type === 'take' && !takePiece(state, actor, pieceById(state, m.targetId))) {
      // Zırh aldı: hamle boşa gider, alan taş yerinde kalır.
    } else {
      actor.r = m.r; actor.c = m.c;
    }
    // Çift hamle: aynı yıldız bir kez daha oynar.
    if (m.bonus === 'double' && !state.over && actor.alive) { state.lastStep = { id: actor.id, dr: 0, dc: 0 }; return state; }
  } else {
    state.lastStep = { id: actor.id, dr: 0, dc: 0 };
    if (actor.kind === 'star') log(state, `${nameOf(state, actor)} hamle yapamadı, sıra geçti.`);
  }
  state.turn++;
  settle(state);
  // Bulmaca: hamle hakkı bitti ve bot kaldıysa bulmaca başarısız.
  if (state.puzzle && !state.over && state.puzzle.used >= state.puzzle.limit && currentActor(state)?.id === 's0') {
    state.over = true; state.winner = null;
    log(state, '❌ Hamle hakkın bitti.');
  }
  return state;
}

export const BONUS_NAMES = { armor: 'Zırh', step: 'Çift adım', double: 'Çift hamle', swap: 'Ayna' };

// Alma gerçekleşirse true. Zırhlı yıldız alınmaz: zırhı gider, saldıran geri döner.
function takePiece(state, actor, target) {
  if (target.kind === 'star' && state.seats[target.seat].bonuses.armor > 0) {
    state.seats[target.seat].bonuses.armor--;
    log(state, `🛡️ ${nameOf(state, target)} zırhıyla kurtuldu!`);
    return false;
  }
  target.alive = false;
  if (actor.kind === 'star') {
    state.seats[actor.seat].takes++;
    addScore(state, state.seats[actor.seat], POINTS[target.kind]);
  } else if (actor.kind === 'twin') {
    // İkiz'in aldığı taş zor bir iştir: sahibine çift puan ve bir ayna bonusu getirir.
    const seat = state.seats[pieceById(state, actor.mirrors).seat];
    if (!seat.out) {
      addScore(state, seat, POINTS[target.kind] * TWIN_TAKE_MULT);
      seat.bonuses.swap++;
      log(state, `🎁 ${seat.name} bonus kazandı: ${BONUS_NAMES.swap}.`);
    }
  }
  log(state, `⚔️ ${nameOf(state, actor)}, ${accOf(state, target)} aldı!`);
  if (target.kind === 'star') starOut(state, target);
  checkOver(state);
  return true;
}

function addScore(state, seat, points) {
  seat.score += points;
  while (seat.scoreTier < BONUS_SCORES.length && seat.score >= BONUS_SCORES[seat.scoreTier]) {
    const tier = seat.scoreTier++;
    grantBonus(state, seat, tier === 0 ? 'step' : tier === 1 ? 'double' : random(state) < 0.5 ? 'step' : 'double');
  }
  if (!seat.swapGiven && seat.score >= SWAP_SCORE) { seat.swapGiven = true; grantBonus(state, seat, 'swap'); }
}

function grantBonus(state, seat, kind) {
  seat.bonuses[kind]++;
  log(state, `🎁 ${seat.name} bonus kazandı: ${BONUS_NAMES[kind]}.`);
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
  const botsLeft = state.pieces.some(p => p.alive && p.kind !== 'star' && p.kind !== 'twin');
  if (state.solo) {
    // İkiz tek başına kalınca da kazanırsın: onu almana gerek yok.
    if (alive.length && botsLeft) return;
    state.over = true;
    if (alive.length) survivorBonus(state, 0);
    state.winner = alive.length ? 0 : null;
    log(state, alive.length ? '🏆 Kazandın! Arenada bot kalmadı.' : '❌ Alındın! Oyun bitti.');
    return;
  }
  // Takımlı maçta rakip kalmaması için tek bir takımın ayakta olması yeter.
  const teamsAlive = new Set(alive.map(p => (state.teams ? state.teams[p.seat] : p.seat))).size;
  if (state.decided) {
    // Kazanan belli; kalan yıldız(lar) botlarla savaşmaya devam ediyor.
    if (alive.length >= 1 && teamsAlive === 1 && botsLeft) return;
    state.over = true;
    return;
  }
  if (teamsAlive > 1) return;
  const finish = () => {
    for (const p of alive) survivorBonus(state, p.seat);
    state.winner = ranking(state)[0];
    state.winTeam = state.teams ? state.teams[state.winner] : null;
    const w = state.seats[state.winner];
    log(state, state.teams
      ? `🏆 Takım ${state.winTeam + 1} kazandı! (${w.score} puan)`
      : `🏆 ${w.name} kazandı! (${w.score} puan)`);
  };
  if (state.keepGoing && alive.length >= 1 && botsLeft) {
    state.decided = true;
    if (state.teams) state.winTeam = state.teams[alive[0].seat];
    finish();
    return;
  }
  state.over = true;
  if (state.teams && alive.length) state.winTeam = state.teams[alive[0].seat];
  finish();
}

// Bu koltuk kazananlar arasında mı? (Takımlı maçta kazanan takımın herkesi kazanır.)
export function isWinner(state, seat) {
  if (state.winner == null) return false;
  return state.teams ? state.teams[seat] === state.teams[state.winner] : seat === state.winner;
}

// Kazananı belli olmuş maçı bitirir (oyuncu "Bitir" derse).
export function endMatch(state) {
  if (state.decided) state.over = true;
  return state;
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
  // İlk daralmayı atlatan her yıldız bir zırh kazanır.
  if (state.ring === 1) state.seats.filter(s => !s.out).forEach(s => grantBonus(state, s, 'armor'));
  // İkinci daralmayı atlatan her yıldıza bir çift hamle.
  if (state.ring === 2) state.seats.filter(s => !s.out).forEach(s => grantBonus(state, s, 'double'));
  checkOver(state);
}

// Kazanan önce, sonra en son çıkandan ilk çıkana.
// Sıralama: önce skor, sonra alma sayısı, sonra hayatta kalma (ayakta kalan > geç elenen > erken elenen).
export function ranking(state) {
  const lasted = s => (s.out ? state.outOrder.indexOf(s.index) : state.seats.length);
  const wt = state.over || state.decided ? state.winTeam : null;
  const side = s => (wt != null && s.team === wt ? 1 : 0);
  return [...state.seats]
    .sort((a, b) => side(b) - side(a) || b.score - a.score || b.takes - a.takes || lasted(b) - lasted(a))
    .map(s => s.index);
}
