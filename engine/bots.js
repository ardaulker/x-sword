// X Sword botları.
// Kolay:  ilk sürümdeki gibi — alabiliyorsa alır, yoksa en yakın yıldıza yürür.
// Normal: bir sonraki hamlesinden önce alınacağı kareye gitmez, çöken halkada kalmaz,
//         alamadığı yıldızı bırakıp en çabuk ulaşabileceği yıldıza yönelir.
// Zor:    buna ek olarak hedef yıldızın güvenli kaçış karelerini daraltır (kuşatır).

import {
  legalMoves, attackersOf, threatsFor, random, ringOf, inArena,
  walkDirs, takeDirs, nextMode, flip, twinMove, friendly, pieceById,
} from './rules.js';

export const LEVELS = ['kolay', 'normal', 'zor'];

export function levelOf(state, piece) {
  return piece.kind === 'star' ? state.seats[piece.seat].level : state.neutralLevel;
}

export function chooseMove(state, piece, level = levelOf(state, piece)) {
  if (piece.kind === 'twin') return twinMove(state, piece);
  const moves = legalMoves(state, piece, state.mode);
  if (!moves.length) return null;
  // Bulmacada botlar yürümez: yalnız menzillerine giren yıldızı alır, yoksa yerinde bekler.
  if (state.puzzle && piece.kind !== 'star') return moves.find(m => m.type === 'take' && pieceById(state, m.targetId).kind === 'star') ?? null;
  if (level === 'kolay') return easyMove(state, piece, moves);
  let best = moves[0], bestScore = -Infinity, second = null, secondScore = -Infinity;
  for (const m of moves) {
    // Küçük rastgelelik: eşit hamleler arasında hep aynısını seçip tahmin edilir olmasın.
    const score = scoreMove(state, piece, m, level) + random(state);
    if (score > bestScore) { second = best; secondScore = bestScore; bestScore = score; best = m; }
    else if (score > secondScore) { second = m; secondScore = score; }
  }
  // Normal yapay zekâ oyuncu ara sıra ikinci en iyi hamleyi seçer (insan gibi hata yapar); Zor hiç yapmaz.
  if (level === 'normal' && piece.kind === 'star' && second && second !== best && random(state) < SLIP) { best = second; bestScore = secondScore; }
  // Yapay zekâ oyuncular bonus da kullanır, ama bedeli var: ancak kazancı büyükse (bir yıldızı almak, ölümden kaçmak).
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

// Zırh kendiliğinden çalışır. Çift adım ve ayna normalde; çift hamle yalnız zorda ve yıldız alırken kullanılır.
function bonusMoves(state, piece, level) {
  if (level === 'kolay') return [];
  const have = state.seats[piece.seat].bonuses;
  const out = [];
  for (const kind of ['step', 'swap', 'double']) {
    if (!(have[kind] > 0) || (kind === 'double' && level !== 'zor')) continue;
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
  // Fırsatçı kişilik: her almayı fazla sever.
  if (target && piece.kind === 'star' && state.seats[piece.seat].persona === 'opportunist') s += 90;

  // Güvenlik: bir sonraki hamlemden önce burada alınır mıyım, kare çöker mi?
  const { attackers, doomed } = threatsFor(state, piece, m);
  if (doomed) s -= 3000;
  if (attackers.length) s -= piece.kind === 'star' ? 900 : 600;

  // Planı, taş hedef karedeymiş gibi değerlendir.
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

// Bu taş, yıldızı alabileceği bir kareye en az kaç hamlede varır (yolu kapalıysa Infinity).
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

// Bir arena botunun şu an kovaladığı yıldız; ekrandaki hedef işareti bunu gösterir.
// Kolay en yakın yıldıza yürür. Normal ve zor, en az hamlede alabileceği yıldıza yönelir;
// hiçbirine yolu yoksa en yakınına sokulur.
export function targetOf(state, piece, level = levelOf(state, piece)) {
  if (piece.kind === 'star' || piece.kind === 'twin' || !piece.alive) return null;
  const stars = state.pieces.filter(p => p.kind === 'star' && p.alive);
  if (!stars.length) return null;
  const nearest = dist => stars.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  if (level === 'kolay') return nearest(s => Math.abs(s.r - piece.r) + Math.abs(s.c - piece.c));
  const grid = occupancy(state);
  let best = Infinity, target = null;
  for (const st of stars) {
    const d = huntDistance(state, piece, st, grid);
    if (d < best) { best = d; target = st; }
  }
  return target || nearest(s => Math.max(Math.abs(s.r - piece.r), Math.abs(s.c - piece.c)));
}

// Yıldızın verilen moddaki güvenli seçenek sayısı: yürüyebileceği ya da alabileceği,
// ve orada bir sonraki hamlesinden önce alınmayacağı kareler.
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

// Arena botu: en çabuk ulaşabileceği yıldıza yönel; zorda o yıldızın kaçış yollarını kapat.
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
    // Yol kapalı: en azından yıldızlara doğru sokul.
    return -2 * Math.min(...stars.map(st => Math.max(Math.abs(st.r - piece.r), Math.abs(st.c - piece.c))));
  }
  let s = -12 * best;
  if (level === 'zor') s -= 20 * escapes(state, target, nextMode(state, target), grid);
  return s;
}

// Yapay zekâ oyuncu (bot yıldız): önce hayatta kal — gelecek turda güvenli seçeneği bol, ortaya yakın kareler.
function starPlan(state, piece, level) {
  const persona = state.seats[piece.seat].persona;
  const grid = occupancy(state);
  const next = flip(state.mode);
  // Temkinli: kaçış ve merkezi daha çok önemser. Avcı: kaçışı daha az, rakibi kovalamayı daha çok.
  const escW = persona === 'careful' ? 16 : persona === 'hunter' ? 5 : 8;
  const ringW = persona === 'careful' ? 10 : 5;
  let s = escW * escapes(state, piece, next, grid);
  s += ringW * ringOf(state, piece.r, piece.c);
  const hunting = (level === 'zor' && persona !== 'careful') || persona === 'hunter';
  if (hunting) {
    const rivals = state.pieces.filter(o => o.kind === 'star' && o.alive && o.id !== piece.id && !friendly(state, piece, o));
    // Başka bir yıldızı bir sonraki hamlede alabileceği yerde dur: rakip kaçmak zorunda kalır.
    for (const o of rivals) {
      if (takeDirs(piece, next).some(([dr, dc]) => piece.r + dr === o.r && piece.c + dc === o.c)) s += 25;
    }
    // Avcı gibi davran: en çabuk ulaşabildiği rakip yıldıza sokul ve onun güvenli kaçışlarını daralt.
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
