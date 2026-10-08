// X Sword rules engine.
// It never touches the screen: the same rules run in the browser, in tests and, later, on an online server.

// 1 star: single-player mode (you + your mirror Twin + arena bots).
export const SIZE_BY_STARS = { 1: 9, 2: 9, 3: 11, 4: 13 };
export const NEUTRALS_BY_STARS = { 1: 14, 2: 14, 3: 21, 4: 28 };
// Board size and bot count are selectable; the board is at least the default for the player count (9, 11, 13), at most 15.
// More bots than a third of the board are not playable.
export const BOARD_SIZES = [9, 11, 13, 15];
export const maxNeutrals = size => Math.floor(size * size / 3);
// Bot count on the chosen board with the same density as the default crowd.
export const defaultNeutrals = (stars, size) =>
  Math.min(maxNeutrals(size), Math.round(NEUTRALS_BY_STARS[stars] * size * size / SIZE_BY_STARS[stars] ** 2));
export const SEAT_NAMES = ['Turquoise', 'Purple', 'Yellow', 'Pink'];

// Points: taking a star (player) is 50, the Twin 30, a bot 10. Only stars collect points.
// The star still standing at the end of the match gets a +30 survivor bonus.
export const POINTS = { star: 50, twin: 30, red: 10, blue: 10 };
export const SURVIVOR_BONUS = 30;

// Taking two pieces with the two moves of one Double move also earns Armor.
// Bonuses are earned by conditions: 20 points double step, 40 points double move, 60 points one of the two (from the seed),
// 50 points Switcheroo (swap places with any piece), surviving the first shrink gives armor, the second shrink a double move.
// In single player a Switcheroo also comes when the Twin takes a piece.
// Armor works by itself (the piece that takes you bounces back). The others are used together with a move on your turn.
export const BONUS_KINDS = ['armor', 'step', 'double', 'swap'];
export const BONUS_SCORES = [20, 40, 60];
export const TWIN_TAKE_MULT = 2;
export const SWAP_SCORE = 50;
// Everyone starts with one double step so nobody gets stuck in a corner early.
const startBonuses = () => ({ armor: 0, step: 1, double: 0, swap: 0 });

const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CROSS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const flip = mode => (mode === 'STRAIGHT' ? 'DIAGONAL' : 'STRAIGHT');
export const modeLabel = mode => (mode === 'STRAIGHT' ? 'STRAIGHT' : 'DIAGONAL');

// Red walks straight and takes diagonally. Blue is the reverse. Stars and the Twin walk and take in the mode's direction.
export function walkDirs(piece, mode) {
  if (piece.kind === 'red') return STRAIGHT;
  if (piece.kind === 'blue') return CROSS;
  return mode === 'STRAIGHT' ? STRAIGHT : CROSS;
}

export function takeDirs(piece, mode) {
  if (piece.kind === 'red') return CROSS;
  if (piece.kind === 'blue') return STRAIGHT;
  return mode === 'STRAIGHT' ? STRAIGHT : CROSS;
}

// Seeded random number (mulberry32): the same seed gives the same game, so tests are repeatable.
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

// In a team match two stars of the same team never take each other.
export const friendly = (state, a, b) =>
  !!state.teams && a.kind === 'star' && b.kind === 'star' && a.id !== b.id && state.teams[a.seat] === state.teams[b.seat];

// Names for the engine log (the log is never shown in the game; the app builds its own translated text).
export const nameOf = (state, p) =>
  p.kind === 'star' ? state.seats[p.seat].name : p.kind === 'twin' ? 'Twin' : `#${p.label}`;

function log(state, text) {
  state.log.push({ round: state.round, text });
}

// Stars start one square in from the corners, evenly spaced; with 4 players clockwise.
// In a match this layout is randomly rotated or mirrored, and seats are randomly assigned to corners.
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

// One of the board's 8 symmetries: 4 rotations × mirror.
function randomSymmetry(state, size) {
  const k = Math.floor(random(state) * 8), m = size - 1;
  return ([r, c]) => {
    let p = k >= 4 ? [r, m - c] : [r, c];
    for (let i = 0; i < k % 4; i++) p = [p[1], m - p[0]];
    return p;
  };
}

// seats: [{ kind: 'human' | 'bot', level: 'easy' | 'normal' | 'hard' }], 1–4 of them.
// A single seat is single-player mode: the player's mirror, the Twin, also joins the board.
// firstSeat: this seat always moves first (the player on Easy). Without it everyone's place is random.
// shuffle: false keeps corners and order fixed (tests only).
export function createGame({
  seats, neutralLevel = 'normal', seed, shrinkStart = 6, shrinkEvery = 6, neutrals, firstSeat = null, shuffle: mix = true, keepGoing = false, size: sizeOpt = null, personas = false, obstacles = false, teams = false,
} = {}) {
  const n = seats?.length;
  if (!(n >= 1 && n <= 4)) throw new Error('A match has 1–4 stars.');
  const size = BOARD_SIZES.includes(sizeOpt) && sizeOpt >= SIZE_BY_STARS[n] ? sizeOpt : SIZE_BY_STARS[n];
  const state = {
    size, round: 1, mode: 'STRAIGHT', ring: 0, shrinkStart, shrinkEvery, neutralLevel,
    rng: ((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0) || 1,
    seats: seats.map((s, i) => ({
      index: i, name: SEAT_NAMES[i], kind: s.kind === 'bot' ? 'bot' : 'human',
      level: s.level || 'normal', takes: 0, score: 0, bonus: 0, out: false,
      bonuses: startBonuses(), scoreTier: 0, swapGiven: false, persona: null, team: null,
    })),
    pieces: [], order: [], turn: 0, over: false, winner: null, outOrder: [], log: [],
    solo: n === 1, lastStep: null, extra: null, matchOrder: [], keepGoing: !!keepGoing, decided: false,
    blocked: null, holes: null, teams: teams && n === 4 ? [0, 1, 0, 1] : null, winTeam: null, puzzle: null,
  };

  if (state.teams) state.seats.forEach((s, i) => { s.team = state.teams[i]; });
  // Personalities for AI rivals: hunter, careful, opportunist (order from the seed).
  if (personas) {
    const kinds = shuffle(state, ['hunter', 'careful', 'opportunist']);
    state.seats.filter(s => s.kind === 'bot').forEach((s, i) => { s.persona = kinds[i % kinds.length]; });
  }

  let starts = startCells(n, size);
  if (mix) starts = shuffle(state, starts.map(randomSymmetry(state, size)));
  starts.forEach(([r, c], i) => state.pieces.push({ id: `s${i}`, kind: 'star', seat: i, r, c, alive: true }));

  // Arena bots are never placed within two squares of a star: nobody is taken in the first round.
  const free = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (starts.every(([sr, sc]) => Math.max(Math.abs(r - sr), Math.abs(c - sc)) >= 3)) free.push([r, c]);
    }
  }
  shuffle(state, free);
  // Obstacle squares: pillars that never touch each other, so the board is never split.
  if (obstacles) {
    const want = Math.floor(size * size / 14), chosen = [];
    for (const [r, c] of free) {
      if (chosen.length >= want) break;
      if (chosen.every(([a, b]) => Math.max(Math.abs(a - r), Math.abs(b - c)) >= 2)) chosen.push([r, c]);
    }
    state.blocked = new Set(chosen.map(([r, c]) => r * size + c));
    for (let i = free.length - 1; i >= 0; i--) if (state.blocked.has(free[i][0] * size + free[i][1])) free.splice(i, 1);
  }
  // In single-player mode the player's mirror, the Twin, starts on a random square.
  if (state.solo) {
    const [r, c] = free.pop();
    state.pieces.push({ id: 'tw', kind: 'twin', mirrors: 's0', label: 'Twin', r, c, alive: true });
  }
  const count = Math.min(neutrals ?? defaultNeutrals(n, size), free.length, maxNeutrals(size));
  const kinds = balancedKinds(state, free.slice(0, count), starts);
  for (let i = 0; i < count; i++) {
    const [r, c] = free[i];
    state.pieces.push({ id: `b${i + 1}`, kind: kinds[i], label: String(i + 1), r, c, alive: true });
  }

  state.matchOrder = matchOrder(state, firstSeat, mix);
  state.order = roundOrder(state);
  log(state, 'Game started. Mode: STRAIGHT.');
  return state;
}

// Red and blue bots are equal in total and also balanced locally: no star is surrounded by a single color.
// Each bot looks at the difference near itself and around nearby stars and takes the minority color.
function balancedKinds(state, cells, starts) {
  const reds = Math.ceil(cells.length / 2);
  let redLeft = reds, blueLeft = cells.length - reds;
  const placed = []; // { r, c, v } v: red +1, blue -1
  const near = (r, c, a, b, d) => Math.max(Math.abs(r - a), Math.abs(c - b)) <= d;
  const kinds = [];
  for (const [r, c] of cells) {
    let local = 0;
    for (const p of placed) if (near(r, c, p.r, p.c, 3)) local += p.v;
    // The difference around a star weighs more.
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
  // Improvement: swap a red and a blue if that improves the balance.
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

// Puzzle: a small hand-made position. The goal is to take every arena bot in at most `limit` moves.
// map: array of rows. '.' floor, '#' obstacle, '-' off the map (void), 'S' you, 'R' red bot, 'B' blue bot
// ('K' and 'C' are the old letters for red and blue and still work).
// The map need not be square; the short side is padded with void on both sides. The old form (me + bots) also works.
// shrink: { start, every } makes the arena shrink in the puzzle too (e.g. the outer ring collapses at the end of round 2).
// mode also accepts the old values 'DUZ' / 'CAPRAZ' from saves made before the English rename.
export function createPuzzle({ map = null, me = null, bots = [], limit, mode = 'STRAIGHT', size = 9, bonuses = null, shrink = null }) {
  let holes = null, walls = null;
  if (map) {
    const h = map.length, w = Math.max(...map.map(row => row.length));
    size = Math.max(h, w);
    const top = Math.floor((size - h) / 2), left = Math.floor((size - w) / 2);
    holes = new Set(); walls = new Set(); bots = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ch = map[r - top]?.[c - left] ?? '-';
        const i = r * size + c;
        if (ch === '-' || ch === ' ') holes.add(i);
        else if (ch === '#') walls.add(i);
        else if (ch === 'S') me = [r, c];
        else if (ch === 'R' || ch === 'K') bots.push({ kind: 'red', r, c });
        else if (ch === 'B' || ch === 'C') bots.push({ kind: 'blue', r, c });
      }
    }
  }
  const st = createGame({ seats: [{ kind: 'human' }], size: 9, neutrals: 0, seed: 1, shuffle: false, shrinkStart: 999, neutralLevel: 'normal' });
  st.size = size;
  st.pieces = st.pieces.filter(p => p.kind !== 'twin');
  const star = st.pieces.find(p => p.kind === 'star');
  [star.r, star.c] = me;
  st.seats[0].bonuses = { armor: 0, step: 0, double: 0, swap: 0, ...bonuses };
  bots.forEach((b, i) => st.pieces.push({ id: `b${i + 1}`, kind: b.kind, label: String(i + 1), r: b.r, c: b.c, alive: true }));
  if (holes) {
    st.holes = holes;
    st.blocked = new Set([...holes, ...walls]);
  }
  st.mode = mode === 'DUZ' ? 'STRAIGHT' : mode === 'CAPRAZ' ? 'DIAGONAL' : mode;
  st.matchOrder = st.pieces.map(p => p.id);
  st.order = roundOrder(st);
  st.puzzle = { limit, used: 0 };
  if (shrink) { st.shrinkStart = shrink.start; st.shrinkEvery = shrink.every; }
  st.log = [];
  return st;
}

// The move order is shuffled once at the start and stays the same all match: stars and bots in one queue.
// The Twin always comes right after the star it mirrors. A bot's number is its place in this order.
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

// Every round the survivors are renumbered: the order stays, the numbers close up (1, 2, 3, ...).
// A bot's name ("#5") follows this number.
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

// The mode for a star's next move: this round's mode if its turn hasn't come yet this round,
// otherwise next round's mode. The mode doesn't matter for arena bots.
export function nextMode(state, p) {
  if (p.kind === 'red' || p.kind === 'blue') return state.mode;
  return state.order.indexOf(p.id) >= state.turn ? state.mode : flip(state.mode);
}

// bonus: moves unlocked by a bonus the star holds are added too (the move carries that bonus).
export function legalMoves(state, piece, mode = nextMode(state, piece), bonus = null) {
  const moves = baseMoves(state, piece, mode);
  if (!bonus || piece.kind !== 'star' || !(state.seats[piece.seat].bonuses[bonus] > 0)) return moves;
  if (bonus === 'double') return moves.map(m => ({ ...m, bonus }));
  if (bonus === 'step') {
    // Two squares: the square in between must be free; the second square is a walk if empty, a take if occupied.
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

// The Twin plays the same direction its star just played: it walks if that square is empty,
// takes the piece there if occupied, and stays put if it is off the board or collapsed.
export function twinMove(state, twin) {
  const s = state.lastStep;
  if (!s || s.id !== twin.mirrors || (!s.dr && !s.dc)) return null;
  return legalMoves(state, twin, state.mode).find(m => m.r === twin.r + s.dr && m.c === twin.c + s.dc) ?? null;
}

const twinOf = (state, piece) =>
  state.pieces.find(p => p.kind === 'twin' && p.alive && p.mirrors === piece.id) ?? null;

// Pieces that can take a piece at (r, c) before its next move.
// Between two moves everyone plays once and a piece either walks or takes; so the ones
// that can take it are those adjacent to that square in their own take direction right now.
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

// Every 6 rounds (at the end of rounds 6, 12, 18 …) the arena loses its outer ring.
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

// For the piece moving now: will this square collapse before its next turn?
export const doomedAt = (state, r, c) => collapseDue(state) && ringOf(state, r, c) === state.ring;

// Move preview: if piece makes this move, who can take it and will the square collapse?
// The star's own Twin isn't guessed, it is known exactly: it comes the same direction.
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

// Applies the current piece's move. A null move passes the turn (for a piece with no moves).
export function play(state, move) {
  const actor = currentActor(state);
  if (!actor) return state;
  if (move) {
    const m = legalMoves(state, actor, state.mode, move.bonus ?? null)
      .find(x => x.r === move.r && x.c === move.c && (x.bonus ?? null) === (move.bonus ?? null));
    if (!m) throw new Error(`Illegal move: ${nameOf(state, actor)} → ${move.r},${move.c}`);
    if (m.bonus) {
      state.seats[actor.seat].bonuses[m.bonus]--;
      log(state, `✨ ${nameOf(state, actor)} used a bonus: ${BONUS_NAMES[m.bonus]}.`);
    }
    if (state.puzzle && actor.id === 's0') state.puzzle.used++;
    state.lastStep = { id: actor.id, dr: m.r - actor.r, dc: m.c - actor.c };
    const seq = state.extra?.id === actor.id ? state.extra : null; // earlier moves of this Double move
    let took = false;
    if (m.type === 'swap') {
      const other = pieceById(state, m.targetId);
      [other.r, other.c] = [actor.r, actor.c];
      actor.r = m.r; actor.c = m.c;
    } else if (m.type === 'take' && !(took = takePiece(state, actor, pieceById(state, m.targetId)))) {
      // Armor took the hit: the move is wasted and the taker stays where it was.
    } else {
      actor.r = m.r; actor.c = m.c;
    }
    // Two takes in one Double move earn Armor.
    const seqTakes = (seq?.takes ?? 0) + (took ? 1 : 0);
    if (actor.kind === 'star' && (seq || m.bonus === 'double') && seqTakes === 2 && (seq?.takes ?? 0) < 2) {
      log(state, `🛡️ ${nameOf(state, actor)} took two pieces in one Double move.`);
      grantBonus(state, state.seats[actor.seat], 'armor');
    }
    // Double move: the same star plays once more. `extra` counts the moves played in this sequence, so the screen can say "move 2 of 2".
    if (m.bonus === 'double' && !state.over && actor.alive) {
      state.extra = { id: actor.id, n: (seq?.n ?? 0) + 1, takes: seqTakes };
      state.lastStep = { id: actor.id, dr: 0, dc: 0 };
      return state;
    }
  } else {
    state.lastStep = { id: actor.id, dr: 0, dc: 0 };
    if (actor.kind === 'star') log(state, `${nameOf(state, actor)} had no move, turn passed.`);
  }
  state.turn++;
  state.extra = null;
  settle(state);
  // Puzzle: out of moves with bots left means the puzzle failed.
  if (state.puzzle && !state.over && state.puzzle.used >= state.puzzle.limit && currentActor(state)?.id === 's0') {
    state.over = true; state.winner = null;
    log(state, '❌ Out of moves.');
  }
  return state;
}

export const BONUS_NAMES = { armor: 'Armor', step: 'Double step', double: 'Double move', swap: 'Switcheroo' };

// True if the take happens. An armored star isn't taken: it loses the armor and the attacker bounces back.
function takePiece(state, actor, target) {
  if (target.kind === 'star' && state.seats[target.seat].bonuses.armor > 0) {
    state.seats[target.seat].bonuses.armor--;
    log(state, `🛡️ ${nameOf(state, target)} was saved by armor!`);
    return false;
  }
  target.alive = false;
  if (actor.kind === 'star') {
    state.seats[actor.seat].takes++;
    addScore(state, state.seats[actor.seat], POINTS[target.kind]);
  } else if (actor.kind === 'twin') {
    // A take by the Twin is hard to set up: it brings its owner double points and a Switcheroo bonus.
    const seat = state.seats[pieceById(state, actor.mirrors).seat];
    if (!seat.out) {
      addScore(state, seat, POINTS[target.kind] * TWIN_TAKE_MULT);
      seat.bonuses.swap++;
      log(state, `🎁 ${seat.name} earned a bonus: ${BONUS_NAMES.swap}.`);
    }
  }
  log(state, `⚔️ ${nameOf(state, actor)} took ${nameOf(state, target)}!`);
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
  log(state, `🎁 ${seat.name} earned a bonus: ${BONUS_NAMES[kind]}.`);
}

function starOut(state, star) {
  const seat = state.seats[star.seat];
  seat.out = true;
  seat.outRound = state.round;
  state.outOrder.push(star.seat);
  checkOver(state);
}

// In multiplayer the match ends when one star is left; the score decides the winner (ranking).
// Single player: you win when every bot is gone, you lose when you are taken.
function checkOver(state) {
  if (state.over) return;
  const alive = state.pieces.filter(p => p.kind === 'star' && p.alive);
  const botsLeft = state.pieces.some(p => p.alive && p.kind !== 'star' && p.kind !== 'twin');
  if (state.solo) {
    // You also win when only the Twin is left: you don't need to take it.
    if (alive.length && botsLeft) return;
    state.over = true;
    if (alive.length) survivorBonus(state, 0);
    state.winner = alive.length ? 0 : null;
    log(state, alive.length ? '🏆 You won! No bots left in the arena.' : '❌ You were taken! Game over.');
    return;
  }
  // In a team match it is enough that a single team is still standing.
  const teamsAlive = new Set(alive.map(p => (state.teams ? state.teams[p.seat] : p.seat))).size;
  if (state.decided) {
    // The winner is decided; the remaining star(s) keep fighting the bots.
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
      ? `🏆 Team ${state.winTeam + 1} won! (${w.score} points)`
      : `🏆 ${w.name} won! (${w.score} points)`);
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

// Is this seat among the winners? (In a team match everyone on the winning team wins.)
export function isWinner(state, seat) {
  if (state.winner == null) return false;
  return state.teams ? state.teams[seat] === state.teams[state.winner] : seat === state.winner;
}

// Ends a match whose winner is already decided (when the player chooses "End").
export function endMatch(state) {
  if (state.decided) state.over = true;
  return state;
}

function survivorBonus(state, seat) {
  state.seats[seat].bonus = SURVIVOR_BONUS;
  state.seats[seat].score += SURVIVOR_BONUS;
}

// Turns of taken pieces are skipped at once; at the end of a round the mode flips and the arena shrinks if due.
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
  log(state, `— Round ${state.round} · ${modeLabel(state.mode)} —`);
}

function collapse(state) {
  const ring = state.ring;
  const fallen = state.pieces.filter(p => p.alive && ringOf(state, p.r, p.c) === ring);
  fallen.forEach(p => { p.alive = false; });
  state.ring++;
  const side = state.size - 2 * state.ring;
  log(state, fallen.length
    ? `🌀 The arena shrank (${side}×${side})! Fell off: ${fallen.map(p => nameOf(state, p)).join(', ')}.`
    : `🌀 The arena shrank (${side}×${side}).`);
  fallen.filter(p => p.kind === 'star').forEach(p => starOut(state, p));
  // Every star that survives the first shrink earns armor.
  if (state.ring === 1) state.seats.filter(s => !s.out).forEach(s => grantBonus(state, s, 'armor'));
  // Every star that survives the second shrink gets a double move.
  if (state.ring === 2) state.seats.filter(s => !s.out).forEach(s => grantBonus(state, s, 'double'));
  checkOver(state);
}

// Winner first, then from the last one out to the first one out.
// Order: score first, then number of takes, then survival (still standing > out late > out early).
export function ranking(state) {
  const lasted = s => (s.out ? state.outOrder.indexOf(s.index) : state.seats.length);
  const wt = state.over || state.decided ? state.winTeam : null;
  const side = s => (wt != null && s.team === wt ? 1 : 0);
  return [...state.seats]
    .sort((a, b) => side(b) - side(a) || b.score - a.score || b.takes - a.takes || lasted(b) - lasted(a))
    .map(s => s.index);
}
