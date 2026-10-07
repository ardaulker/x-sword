// X Sword bots.
// Easy:   as in the first version — takes if it can, otherwise walks toward the nearest star.
// Normal: never steps onto a square where it would be taken before its next move, never stays on a collapsing ring,
//         and gives up on a star it can't reach in favor of the star it can reach fastest.
// Hard:   on top of that it narrows the target star's safe escape squares (surrounds it).

import {
  legalMoves, attackersOf, threatsFor, random, ringOf, inArena,
  walkDirs, takeDirs, nextMode, flip, twinMove, friendly, pieceById,
} from './rules.js';

export const LEVELS = ['easy', 'normal', 'hard'];

export function levelOf(state, piece) {
  return piece.kind === 'star' ? state.seats[piece.seat].level : state.neutralLevel;
}

export function chooseMove(state, piece, level = levelOf(state, piece)) {
  if (piece.kind === 'twin') return twinMove(state, piece);
  const moves = legalMoves(state, piece, state.mode);
  if (!moves.length) return null;
  // In puzzles bots don't walk: they only take a star that steps into their reach, otherwise they wait.
  if (state.puzzle && piece.kind !== 'star') return moves.find(m => m.type === 'take' && pieceById(state, m.targetId).kind === 'star') ?? null;
  if (level === 'easy') return easyMove(state, piece, moves);
  let best = moves[0], bestScore = -Infinity, second = null, secondScore = -Infinity;
  for (const m of moves) {
    // A little randomness: among equal moves don't always pick the same one, so it isn't predictable.
    const score = scoreMove(state, piece, m, level) + random(state);
    if (score > bestScore) { second = best; secondScore = bestScore; bestScore = score; best = m; }
    else if (score > secondScore) { second = m; secondScore = score; }
  }
  // A Normal AI player sometimes picks the second best move (it makes human-like mistakes); Hard never does.
  if (level === 'normal' && piece.kind === 'star' && second && second !== best && random(state) < SLIP) { best = second; bestScore = secondScore; }
  // AI players use bonuses too, but at a cost: only when the gain is big (taking a star, escaping death).
  if (piece.kind === 'star') {
    for (const m of bonusMoves(state, piece, level)) {
      const score = scoreMove(state, piece, m, level) + random(state) - BONUS_COST[m.bonus];
      if (score > bestScore) { bestScore = score; best = m; }
    }
  }
  return best;
}

const SLIP = 0.3;
const HUNT_PULL = 20, HUNT_SQUEEZE = 30;
const BONUS_COST = { step: 220, swap: 320, double: 200 };

// Armor works by itself. Double step and mirror are used on Normal; double move only on Hard and only when taking a star.
function bonusMoves(state, piece, level) {
  if (level === 'easy') return [];
  const have = state.seats[piece.seat].bonuses;
  const out = [];
  for (const kind of ['step', 'swap', 'double']) {
    if (!(have[kind] > 0) || (kind === 'double' && level !== 'hard')) continue;
    for (const m of legalMoves(state, piece, state.mode, kind)) {
      if (!m.bonus) continue;
      if (kind === 'double' && !(m.type === 'take' && state.pieces.find(p => p.id === m.targetId)?.kind === 'star')) continue;
      out.push(m);
    }
  }
  return out;
}

function easyMove(state, piece, moves) {
  const takes = moves.filter(m => m.type === 'take');
  if (takes.length) {
    const star = takes.find(m => state.pieces.find(p => p.id === m.targetId).kind === 'star');
    return star || takes[Math.floor(random(state) * takes.length)];
  }
  const stars = state.pieces.filter(p => p.kind === 'star' && p.alive && p.id !== piece.id && !friendly(state, piece, p));
  if (!stars.length) return moves[Math.floor(random(state) * moves.length)];
  const dist = m => Math.min(...stars.map(s => Math.abs(m.r - s.r) + Math.abs(m.c - s.c)));
  return moves.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

function scoreMove(state, piece, m, level) {
  const target = m.type === 'take' ? state.pieces.find(p => p.id === m.targetId) : null;
  let s = 0;
  if (target) s += target.kind === 'star' ? 1000 : piece.kind === 'star' ? 120 : 10;
  // Opportunist personality: loves every take a bit too much.
  if (target && piece.kind === 'star' && state.seats[piece.seat].persona === 'opportunist') s += 90;

  // Safety: will I be taken here before my next move, will the square collapse?
  const { attackers, doomed } = threatsFor(state, piece, m);
  if (doomed) s -= 3000;
  if (attackers.length) s -= piece.kind === 'star' ? 900 : 600;

  // Evaluate the plan as if the piece were already on the target square.
  const from = [piece.r, piece.c];
  piece.r = m.r; piece.c = m.c;
  if (target) target.alive = false;
  try {
    s += piece.kind === 'star' ? starPlan(state, piece, level) : hunterPlan(state, piece, level);
  } finally {
    [piece.r, piece.c] = from;
    if (target) target.alive = true;
  }
  return s;
}

function occupancy(state) {
  const g = new Array(state.size * state.size).fill(null);
  for (const p of state.pieces) if (p.alive) g[p.r * state.size + p.c] = p;
  return g;
}

// The fewest moves for this piece to reach a square from which it can take the star (Infinity if blocked).
function huntDistance(state, piece, star, grid) {
  const n = state.size;
  const walks = walkDirs(piece, state.mode);
  const goal = new Set();
  for (const [dr, dc] of takeDirs(piece, state.mode)) {
    const r = star.r - dr, c = star.c - dc;
    if (inArena(state, r, c)) goal.add(r * n + c);
  }
  const start = piece.r * n + piece.c;
  if (goal.has(start)) return 0;
  const seen = new Set([start]);
  let frontier = [start];
  for (let d = 1; d <= 24 && frontier.length; d++) {
    const next = [];
    for (const k of frontier) {
      const r = Math.floor(k / n), c = k % n;
      for (const [dr, dc] of walks) {
        const nr = r + dr, nc = c + dc, nk = nr * n + nc;
        if (!inArena(state, nr, nc) || seen.has(nk) || grid[nk]) continue;
        if (goal.has(nk)) return d;
        seen.add(nk);
        next.push(nk);
      }
    }
    frontier = next;
  }
  return Infinity;
}

// The star an arena bot is chasing right now; the target marker on screen shows it.
// Easy walks toward the nearest star. Normal and Hard head for the star they can take in the fewest moves;
// if no star is reachable they creep toward the nearest one.
export function targetOf(state, piece, level = levelOf(state, piece)) {
  if (piece.kind === 'star' || piece.kind === 'twin' || !piece.alive) return null;
  const stars = state.pieces.filter(p => p.kind === 'star' && p.alive);
  if (!stars.length) return null;
  const nearest = dist => stars.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  if (level === 'easy') return nearest(s => Math.abs(s.r - piece.r) + Math.abs(s.c - piece.c));
  const grid = occupancy(state);
  let best = Infinity, target = null;
  for (const st of stars) {
    const d = huntDistance(state, piece, st, grid);
    if (d < best) { best = d; target = st; }
  }
  return target || nearest(s => Math.max(Math.abs(s.r - piece.r), Math.abs(s.c - piece.c)));
}

// The star's number of safe options in the given mode: squares it can walk to or take on,
// where it won't be taken before its next move.
function escapes(state, star, mode, grid) {
  const n = state.size;
  let count = 0;
  const safeAt = (r, c, victim) => {
    const from = [star.r, star.c];
    star.r = r; star.c = c;
    if (victim) victim.alive = false;
    const safe = attackersOf(state, r, c, [star.id], star).length === 0;
    [star.r, star.c] = from;
    if (victim) victim.alive = true;
    return safe;
  };
  for (const [dr, dc] of walkDirs(star, mode)) {
    const r = star.r + dr, c = star.c + dc;
    if (inArena(state, r, c) && !grid[r * n + c] && safeAt(r, c, null)) count++;
  }
  for (const [dr, dc] of takeDirs(star, mode)) {
    const r = star.r + dr, c = star.c + dc;
    const v = inArena(state, r, c) && grid[r * n + c];
    if (v && v.id !== star.id && safeAt(r, c, v)) count++;
  }
  return count;
}

// Arena bot: head for the star it can reach fastest; on Hard close that star's escape routes.
function hunterPlan(state, piece, level) {
  const stars = state.pieces.filter(p => p.kind === 'star' && p.alive);
  if (!stars.length) return 0;
  const grid = occupancy(state);
  let best = Infinity, target = null;
  for (const st of stars) {
    const d = huntDistance(state, piece, st, grid);
    if (d < best) { best = d; target = st; }
  }
  if (!target) {
    // Path blocked: at least creep toward the stars.
    return -2 * Math.min(...stars.map(st => Math.max(Math.abs(st.r - piece.r), Math.abs(st.c - piece.c))));
  }
  let s = -12 * best;
  if (level === 'hard') s -= 20 * escapes(state, target, nextMode(state, target), grid);
  return s;
}

// AI player (bot star): survive first — squares with many safe options next round, close to the center.
function starPlan(state, piece, level) {
  const persona = state.seats[piece.seat].persona;
  const grid = occupancy(state);
  const next = flip(state.mode);
  // Careful: cares more about escapes and the center. Hunter: less about escapes, more about chasing rivals.
  const escW = persona === 'careful' ? 16 : persona === 'hunter' ? 5 : 8;
  const ringW = persona === 'careful' ? 10 : 5;
  let s = escW * escapes(state, piece, next, grid);
  s += ringW * ringOf(state, piece.r, piece.c);
  const hunting = (level === 'hard' && persona !== 'careful') || persona === 'hunter';
  if (hunting) {
    const rivals = state.pieces.filter(o => o.kind === 'star' && o.alive && o.id !== piece.id && !friendly(state, piece, o));
    // Stand where it could take another star on its next move: the rival is forced to run.
    for (const o of rivals) {
      if (takeDirs(piece, next).some(([dr, dc]) => piece.r + dr === o.r && piece.c + dc === o.c)) s += 25;
    }
    // Act like a hunter: close in on the rival star it can reach fastest and narrow its safe escapes.
    const boost = persona === 'hunter' ? 1.5 : 1;
    let best = Infinity, target = null;
    for (const o of rivals) {
      const d = huntDistance(state, piece, o, grid);
      if (d < best) { best = d; target = o; }
    }
    if (target) {
      s -= HUNT_PULL * boost * best;
      s -= HUNT_SQUEEZE * boost * escapes(state, target, nextMode(state, target), grid);
    }
  }
  return s;
}
