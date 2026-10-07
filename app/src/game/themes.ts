// Tahta temaları: kareler, boşluk ve çerçevenin renkleri. İlki hep açık; öbürleri oynadıkça açılır.
// Yalnız tahta zemini değişir; oyuncu, tehlike ve halka renkleri (tasarımın anlam taşıyan renkleri) olduğu gibi kalır.

import { tr } from '../i18n';
import { loadStats } from './stats';
import type { Stats } from './stats';

export type Need = { kind: 'stars' | 'wins' | 'daily' | 'matches'; n: number };

export interface Theme {
  id: string;
  name: () => string;
  kare: string;
  kare2: string;
  bosluk: string;
  cerceve: string;
  need: null | Need;
}

export const THEMES: Theme[] = [
  { id: 'gece', name: () => tr('Gece'), kare: '#1A2452', kare2: '#1D2858', bosluk: '#070B1E', cerceve: '#0D1431', need: null },
  { id: 'zumrut', name: () => tr('Zümrüt'), kare: '#15362F', kare2: '#193D35', bosluk: '#06130F', cerceve: '#0B1F1A', need: { kind: 'stars', n: 6 } },
  { id: 'kor', name: () => tr('Kor'), kare: '#3A2220', kare2: '#432723', bosluk: '#180A09', cerceve: '#261311', need: { kind: 'wins', n: 5 } },
  { id: 'buz', name: () => tr('Buz'), kare: '#1F3B54', kare2: '#244560', bosluk: '#07131E', cerceve: '#0F2133', need: { kind: 'daily', n: 3 } },
  { id: 'mor', name: () => tr('Mor'), kare: '#2C2352', kare2: '#322959', bosluk: '#0D0A21', cerceve: '#171234', need: { kind: 'matches', n: 25 } },
];

const progress = (s: Stats, kind: Need['kind']) =>
  kind === 'stars' ? Object.values(s.puzzleStars).reduce((a, b) => a + b, 0)
  : kind === 'wins' ? s.wins : kind === 'daily' ? s.dailyPlayed : s.matches;

// Demo: Ayarlar'daki anahtar her tema ve efekti açar (tasarımı görmek için).
export const demoUnlock = () => { try { return localStorage.getItem('xsword-demo') === '1'; } catch { return false; } };
export function setDemoUnlock(on: boolean) { try { localStorage.setItem('xsword-demo', on ? '1' : '0'); } catch { /* gizli sekme */ } }

export const isUnlocked = (t: { need: null | Need }, s: Stats = loadStats(), real = false) => !t.need || (!real && demoUnlock()) || progress(s, t.need.kind) >= t.need.n;

export const themeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

export function needText(t: { need: null | Need }) {
  if (!t.need) return '';
  const { kind, n } = t.need;
  return kind === 'stars' ? tr('Bulmacalardan {n} yıldız topla', { n })
    : kind === 'wins' ? tr('{n} maç kazan', { n })
    : kind === 'daily' ? tr('{n} günlük meydan okuma oyna', { n })
    : tr('{n} maç oyna', { n });
}

export const needProgress = (t: { need: null | Need }, s: Stats = loadStats()) => (t.need ? Math.min(progress(s, t.need.kind), t.need.n) : 0);

// Taş efektleri (yalnız senin yıldızında görünür, animasyonludur). Başarıyla açılır.
export interface Skin { id: string; name: () => string; need: null | Need }
export const SKINS: Skin[] = [
  { id: 'none', name: () => tr('Yok'), need: null },
  { id: 'flame', name: () => tr('Alev'), need: { kind: 'stars', n: 12 } },
  { id: 'bolt', name: () => tr('Şimşek'), need: { kind: 'wins', n: 10 } },
  { id: 'crystal', name: () => tr('Kristal'), need: { kind: 'daily', n: 7 } },
  { id: 'gold', name: () => tr('Altın'), need: { kind: 'stars', n: 36 } },
];
export const skinById = (id: string) => SKINS.find(s => s.id === id) ?? SKINS[0];

// Açılmış ama oyuncuya henüz haber verilmemiş temalar ve efektler.
const SEEN = 'xsword-rewards-seen';
const seenIds = (): string[] => { try { const d = JSON.parse(localStorage.getItem(SEEN) ?? 'null'); return Array.isArray(d) ? d : ['gece', 'none']; } catch { return ['gece', 'none']; } };
export interface Reward { kind: 'theme' | 'skin'; id: string; name: string }
const all = (): Reward[] => [
  ...THEMES.filter(t => isUnlocked(t, undefined, true)).map(t => ({ kind: 'theme' as const, id: t.id, name: t.name() })),
  ...SKINS.filter(s => isUnlocked(s, undefined, true)).map(s => ({ kind: 'skin' as const, id: s.id, name: s.name() })),
];
// Demo açıkken kimseye "yeni açıldı" denmez.
export const freshRewards = (): Reward[] => { const seen = seenIds(); return all().filter(r => !seen.includes(r.id)); };
export function markRewardsSeen() {
  try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seenIds(), ...all().map(r => r.id)])])); } catch { /* gizli sekme */ }
}
