// Daily challenge: everyone plays the same board that day from the same seed (11×11, 20 bots, Normal).
// No server: the best score is kept on the device and the result is shared as text.

export const DAILY = { boardSize: 11, bots: 20 } as const;
const KEY = 'xsword-daily';

export interface DailyResult { date: string; score: number; won: boolean; round: number; time: string }

export function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// A 31-bit seed from the date text (FNV-1a).
export function seedOf(key: string) {
  let h = 0x811c9dc5;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 1) || 1;
}

export function loadDaily(date = todayKey()): DailyResult | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DailyResult | null;
    return r && r.date === date ? r : null;
  } catch { return null; }
}

// Days played (for the streak). A day counts once.
const DAYS_KEY = 'xsword-daily-days';
function loadDays(): string[] {
  try { const d = JSON.parse(localStorage.getItem(DAYS_KEY) ?? '[]'); return Array.isArray(d) ? d : []; } catch { return []; }
}
const dayBefore = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
};

// Number of consecutive days played. If today isn't played yet, count from yesterday (the streak is still alive).
export function dailyStreak(today = todayKey()) {
  const days = new Set(loadDays());
  let d = days.has(today) ? today : dayBefore(today);
  let n = 0;
  while (days.has(d)) { n++; d = dayBefore(d); }
  return { days: n, playedToday: days.has(today) };
}

// A day can have several tries; the higher score stays.
export function saveDaily(res: DailyResult) {
  const days = loadDays();
  if (!days.includes(res.date)) {
    try { localStorage.setItem(DAYS_KEY, JSON.stringify([...days, res.date].slice(-400))); } catch { /* private tab */ }
  }
  const old = loadDaily(res.date);
  if (old && old.score >= res.score) return;
  try { localStorage.setItem(KEY, JSON.stringify(res)); } catch { /* private tab */ }
}
