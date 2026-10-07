// Günlük meydan okuma: herkes o gün aynı tohumla aynı tahtada oynar (11×11, 20 bot, Normal).
// Sunucu yok: en iyi skor cihazda saklanır, sonuç paylaşılabilir metin olarak gider.

export const DAILY = { boardSize: 11, bots: 20 } as const;
const KEY = 'xsword-daily';

export interface DailyResult { date: string; score: number; won: boolean; round: number; time: string }

export function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Tarih yazısından 31 bitlik tohum (FNV-1a).
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

// Oynanan günler (seri hesabı için). Aynı gün bir kez sayılır.
const DAYS_KEY = 'xsword-daily-days';
function loadDays(): string[] {
  try { const d = JSON.parse(localStorage.getItem(DAYS_KEY) ?? '[]'); return Array.isArray(d) ? d : []; } catch { return []; }
}
const dayBefore = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
};

// Art arda oynanan gün sayısı. Bugün henüz oynanmadıysa dünden sayılır (seri hâlâ yaşıyor).
export function dailyStreak(today = todayKey()) {
  const days = new Set(loadDays());
  let d = days.has(today) ? today : dayBefore(today);
  let n = 0;
  while (days.has(d)) { n++; d = dayBefore(d); }
  return { days: n, playedToday: days.has(today) };
}

// Aynı gün birden çok deneme olabilir; yüksek skor kalır.
export function saveDaily(res: DailyResult) {
  const days = loadDays();
  if (!days.includes(res.date)) {
    try { localStorage.setItem(DAYS_KEY, JSON.stringify([...days, res.date].slice(-400))); } catch { /* gizli sekme */ }
  }
  const old = loadDaily(res.date);
  if (old && old.score >= res.score) return;
  try { localStorage.setItem(KEY, JSON.stringify(res)); } catch { /* gizli sekme */ }
}
