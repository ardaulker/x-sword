// Player statistics: kept on the device, no server.

const KEY = 'xsword-stats';

export interface Stats {
  matches: number;
  wins: number;
  takes: number;
  bestScore: number;
  bestRounds: number;   // longest survival (rounds)
  totalMs: number;
  dailyPlayed: number;
  puzzleStars: Record<string, number>; // puzzle id → stars (1–3)
  // For achievements (game/achievements.ts):
  cleanWins: number;    // won without using a bonus
  hardWins: number;     // won on Hard (arena bots or AI rivals)
  pairTakes: number;    // Double moves that took two pieces
  onlineMatches: number;
  fourWins: number;     // won a 4-player match
  winStreak: number;    // current run of wins
  bestStreak: number;
}

export const EMPTY_STATS: Stats = { matches: 0, wins: 0, takes: 0, bestScore: 0, bestRounds: 0, totalMs: 0, dailyPlayed: 0, puzzleStars: {}, cleanWins: 0, hardWins: 0, pairTakes: 0, onlineMatches: 0, fourWins: 0, winStreak: 0, bestStreak: 0 };

export function loadStats(): Stats {
  try { return { ...EMPTY_STATS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...EMPTY_STATS }; }
}

function save(s: Stats) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private tab */ }
}

export interface MatchRecord {
  won: boolean; score: number; takes: number; rounds: number; ms: number; daily: boolean;
  bonusUses: number; pairTakes: number; hard: boolean; online: boolean; players: number;
}

export function recordMatch(r: MatchRecord) {
  const s = loadStats();
  s.matches++;
  if (r.won) s.wins++;
  s.takes += r.takes;
  s.bestScore = Math.max(s.bestScore, r.score);
  s.bestRounds = Math.max(s.bestRounds, r.rounds);
  s.totalMs += r.ms;
  if (r.daily) s.dailyPlayed++;
  if (r.won && r.bonusUses === 0) s.cleanWins++;
  if (r.won && r.hard) s.hardWins++;
  if (r.won && r.players === 4) s.fourWins++;
  s.pairTakes += r.pairTakes;
  if (r.online) s.onlineMatches++;
  s.winStreak = r.won ? s.winStreak + 1 : 0;
  s.bestStreak = Math.max(s.bestStreak, s.winStreak);
  save(s);
}

export function recordPuzzle(id: number, stars: number) {
  const s = loadStats();
  s.puzzleStars[id] = Math.max(s.puzzleStars[id] ?? 0, stars);
  save(s);
}
