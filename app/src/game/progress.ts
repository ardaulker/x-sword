// Progress snapshot: statistics, puzzle stars, the daily challenge and rewards already announced.
// Used in three places: the backup code (moving progress between devices by hand), the platform cloud save in the phone app
// (Game Center / Play Games saved games, game/platform.ts) and, later, an X Sword server.
// Merging two snapshots never loses progress: counters take the larger value, stars the best,
// days the union. Merging the same snapshot twice doesn't change the result.

import { EMPTY_STATS } from './stats';
import type { Stats } from './stats';
import type { DailyResult } from './daily';

export interface Progress {
  v: 1;
  at: number;              // when the snapshot was taken
  stats: Stats;
  daily: DailyResult | null;
  days: string[];          // days the daily challenge was played (streak)
  seen: string[];          // rewards already announced
}

const KEYS = { stats: 'xsword-stats', daily: 'xsword-daily', days: 'xsword-daily-days', seen: 'xsword-rewards-seen' } as const;

const read = <T>(key: string, fallback: T): T => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback; } catch { return fallback; }
};
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private tab */ } };

export function readProgress(): Progress {
  return {
    v: 1,
    at: Date.now(),
    stats: { ...EMPTY_STATS, ...read<Partial<Stats>>(KEYS.stats, {}) },
    daily: read<DailyResult | null>(KEYS.daily, null),
    days: read<string[]>(KEYS.days, []),
    seen: read<string[]>(KEYS.seen, []),
  };
}

export function writeProgress(p: Progress) {
  write(KEYS.stats, p.stats);
  if (p.daily) write(KEYS.daily, p.daily);
  write(KEYS.days, p.days);
  if (p.seen.length) write(KEYS.seen, p.seen);
}

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);

export function mergeProgress(a: Progress, b: Progress): Progress {
  const sa = a.stats, sb = b.stats;
  const stars: Record<string, number> = { ...sa.puzzleStars };
  for (const [id, s] of Object.entries(sb.puzzleStars ?? {})) stars[id] = Math.min(3, Math.max(n(stars[id]), n(s)));
  const daily = !a.daily ? b.daily : !b.daily ? a.daily
    : a.daily.date !== b.daily.date ? (a.daily.date > b.daily.date ? a.daily : b.daily)
    : (a.daily.score >= b.daily.score ? a.daily : b.daily);
  return {
    v: 1,
    at: Math.max(n(a.at), n(b.at)),
    stats: {
      matches: Math.max(n(sa.matches), n(sb.matches)),
      wins: Math.max(n(sa.wins), n(sb.wins)),
      takes: Math.max(n(sa.takes), n(sb.takes)),
      bestScore: Math.max(n(sa.bestScore), n(sb.bestScore)),
      bestRounds: Math.max(n(sa.bestRounds), n(sb.bestRounds)),
      totalMs: Math.max(n(sa.totalMs), n(sb.totalMs)),
      dailyPlayed: Math.max(n(sa.dailyPlayed), n(sb.dailyPlayed)),
      puzzleStars: stars,
    },
    daily,
    days: [...new Set([...a.days, ...b.days])].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-400),
    seen: [...new Set([...a.seen, ...b.seen])],
  };
}

// ------------------------------------------------------------ backup code

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export const progressCode = (p: Progress = readProgress()) => `XS1.${b64(JSON.stringify(p))}`;

export function parseProgress(text: string): Progress | null {
  try {
    const raw = text.trim().replace(/^XS1\./, '');
    const p = JSON.parse(unb64(raw)) as Progress;
    if (!p || p.v !== 1 || typeof p.stats !== 'object') return null;
    return {
      v: 1, at: n(p.at),
      stats: { ...EMPTY_STATS, ...p.stats, puzzleStars: { ...(p.stats.puzzleStars ?? {}) } },
      daily: p.daily && typeof p.daily.date === 'string' ? p.daily : null,
      days: Array.isArray(p.days) ? p.days.filter(d => typeof d === 'string') : [],
      seen: Array.isArray(p.seen) ? p.seen.filter(d => typeof d === 'string') : [],
    };
  } catch { return null; }
}

// Merges the progress from a code with this device's progress; nothing is deleted.
export function importProgress(text: string): boolean {
  const p = parseProgress(text);
  if (!p) return false;
  writeProgress(mergeProgress(readProgress(), p));
  return true;
}
