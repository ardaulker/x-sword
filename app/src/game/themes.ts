// Tahta temaları: kareler, boşluk ve çerçevenin renkleri. İlki hep açık; öbürleri oynadıkça açılır.
// Yalnız tahta zemini değişir; oyuncu, tehlike ve halka renkleri (tasarımın anlam taşıyan renkleri) olduğu gibi kalır.

import { tr } from '../i18n';
import { loadStats } from './stats';
import type { Stats } from './stats';

export interface Theme {
  id: string;
  name: () => string;
  kare: string;
  kare2: string;
  bosluk: string;
  cerceve: string;
  need: null | { kind: 'stars' | 'wins' | 'daily' | 'matches'; n: number };
}

export const THEMES: Theme[] = [
  { id: 'gece', name: () => tr('Gece'), kare: '#1A2452', kare2: '#1D2858', bosluk: '#070B1E', cerceve: '#0D1431', need: null },
  { id: 'zumrut', name: () => tr('Zümrüt'), kare: '#15362F', kare2: '#193D35', bosluk: '#06130F', cerceve: '#0B1F1A', need: { kind: 'stars', n: 6 } },
  { id: 'kor', name: () => tr('Kor'), kare: '#3A2220', kare2: '#432723', bosluk: '#180A09', cerceve: '#261311', need: { kind: 'wins', n: 5 } },
  { id: 'buz', name: () => tr('Buz'), kare: '#1F3B54', kare2: '#244560', bosluk: '#07131E', cerceve: '#0F2133', need: { kind: 'daily', n: 3 } },
  { id: 'mor', name: () => tr('Mor'), kare: '#2C2352', kare2: '#322959', bosluk: '#0D0A21', cerceve: '#171234', need: { kind: 'matches', n: 25 } },
];

const progress = (s: Stats, kind: NonNullable<Theme['need']>['kind']) =>
  kind === 'stars' ? Object.values(s.puzzleStars).reduce((a, b) => a + b, 0)
  : kind === 'wins' ? s.wins : kind === 'daily' ? s.dailyPlayed : s.matches;

export const isUnlocked = (t: Theme, s: Stats = loadStats()) => !t.need || progress(s, t.need.kind) >= t.need.n;

export const themeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

export function needText(t: Theme) {
  if (!t.need) return '';
  const { kind, n } = t.need;
  return kind === 'stars' ? tr('Bulmacalardan {n} yıldız topla', { n })
    : kind === 'wins' ? tr('{n} maç kazan', { n })
    : kind === 'daily' ? tr('{n} günlük meydan okuma oyna', { n })
    : tr('{n} maç oyna', { n });
}

export const needProgress = (t: Theme, s: Stats = loadStats()) => (t.need ? Math.min(progress(s, t.need.kind), t.need.n) : 0);

// Açılmış ama oyuncuya henüz haber verilmemiş temalar.
const SEEN = 'xsword-themes-seen';
const seenIds = (): string[] => { try { const d = JSON.parse(localStorage.getItem(SEEN) ?? 'null'); return Array.isArray(d) ? d : ['gece']; } catch { return ['gece']; } };
export const freshThemes = (): Theme[] => { const seen = seenIds(); return THEMES.filter(t => isUnlocked(t) && !seen.includes(t.id)); };
export function markThemesSeen() {
  try { localStorage.setItem(SEEN, JSON.stringify(THEMES.filter(t => isUnlocked(t)).map(t => t.id))); } catch { /* gizli sekme */ }
}
