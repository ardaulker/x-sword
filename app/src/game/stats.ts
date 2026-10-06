// Oyuncu istatistikleri: cihazda saklanır, sunucu yok.

const KEY = 'xsword-stats';

export interface Stats {
  matches: number;
  wins: number;
  takes: number;
  bestScore: number;
  bestRounds: number;   // en uzun hayatta kalma (tur)
  totalMs: number;
  dailyPlayed: number;
  puzzleStars: Record<string, number>; // bulmaca no → yıldız (1–3)
}

export const EMPTY_STATS: Stats = { matches: 0, wins: 0, takes: 0, bestScore: 0, bestRounds: 0, totalMs: 0, dailyPlayed: 0, puzzleStars: {} };

export function loadStats(): Stats {
  try { return { ...EMPTY_STATS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...EMPTY_STATS }; }
}

function save(s: Stats) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* gizli sekme */ }
}

export interface MatchRecord { won: boolean; score: number; takes: number; rounds: number; ms: number; daily: boolean }

export function recordMatch(r: MatchRecord) {
  const s = loadStats();
  s.matches++;
  if (r.won) s.wins++;
  s.takes += r.takes;
  s.bestScore = Math.max(s.bestScore, r.score);
  s.bestRounds = Math.max(s.bestRounds, r.rounds);
  s.totalMs += r.ms;
  if (r.daily) s.dailyPlayed++;
  save(s);
}

export function recordPuzzle(id: number, stars: number) {
  const s = loadStats();
  s.puzzleStars[id] = Math.max(s.puzzleStars[id] ?? 0, stars);
  save(s);
}
