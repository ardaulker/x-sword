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

// Aynı gün birden çok deneme olabilir; yüksek skor kalır.
export function saveDaily(res: DailyResult) {
  const old = loadDaily(res.date);
  if (old && old.score >= res.score) return;
  try { localStorage.setItem(KEY, JSON.stringify(res)); } catch { /* gizli sekme */ }
}
