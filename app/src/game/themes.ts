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
  { id: 'night', name: () => tr('Night'), kare: '#1A2452', kare2: '#1D2858', bosluk: '#070B1E', cerceve: '#0D1431', need: null },
  { id: 'emerald', name: () => tr('Emerald'), kare: '#15362F', kare2: '#193D35', bosluk: '#06130F', cerceve: '#0B1F1A', need: { kind: 'stars', n: 6 } },
  { id: 'ember', name: () => tr('Ember'), kare: '#3A2220', kare2: '#432723', bosluk: '#180A09', cerceve: '#261311', need: { kind: 'wins', n: 5 } },
  { id: 'ice', name: () => tr('Ice'), kare: '#1F3B54', kare2: '#244560', bosluk: '#07131E', cerceve: '#0F2133', need: { kind: 'daily', n: 3 } },
  { id: 'violet', name: () => tr('Violet'), kare: '#2C2352', kare2: '#322959', bosluk: '#0D0A21', cerceve: '#171234', need: { kind: 'matches', n: 25 } },
];

const progress = (s: Stats, kind: Need['kind']) =>
  kind === 'stars' ? Object.values(s.puzzleStars).reduce((a, b) => a + b, 0)
  : kind === 'wins' ? s.wins : kind === 'daily' ? s.dailyPlayed : s.matches;

export const isUnlocked = (t: { need: null | Need }, s: Stats = loadStats()) => !t.need || progress(s, t.need.kind) >= t.need.n;

export const themeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

export function needText(t: { need: null | Need }) {
  if (!t.need) return '';
  const { kind, n } = t.need;
  return kind === 'stars' ? tr('Collect {n} stars from puzzles', { n })
    : kind === 'wins' ? tr('Win {n} {n:match|matches}', { n })
    : kind === 'daily' ? tr('Play {n} daily {n:challenge|challenges}', { n })
    : tr('Play {n} matches', { n });
}

export const needProgress = (t: { need: null | Need }, s: Stats = loadStats()) => (t.need ? Math.min(progress(s, t.need.kind), t.need.n) : 0);

// Taş efektleri (yalnız senin yıldızında görünür, animasyonludur). Başarıyla açılır.
export interface Skin { id: string; name: () => string; need: null | Need }
export const SKINS: Skin[] = [
  { id: 'none', name: () => tr('None'), need: null },
  { id: 'flame', name: () => tr('Flame'), need: { kind: 'stars', n: 12 } },
  { id: 'bolt', name: () => tr('Lightning'), need: { kind: 'wins', n: 10 } },
  { id: 'crystal', name: () => tr('Crystal'), need: { kind: 'daily', n: 7 } },
  { id: 'gold', name: () => tr('Gold'), need: { kind: 'stars', n: 36 } },
];
export const skinById = (id: string) => SKINS.find(s => s.id === id) ?? SKINS[0];

// Açılmış ama oyuncuya henüz haber verilmemiş temalar ve efektler.
const SEEN = 'xsword-rewards-seen';
const seenIds = (): string[] => { try { const d = JSON.parse(localStorage.getItem(SEEN) ?? 'null'); return Array.isArray(d) ? d : ['night', 'none']; } catch { return ['night', 'none']; } };
export interface Reward { kind: 'theme' | 'skin'; id: string; name: string }
const all = (): Reward[] => [
  ...THEMES.filter(t => isUnlocked(t)).map(t => ({ kind: 'theme' as const, id: t.id, name: t.name() })),
  ...SKINS.filter(s => isUnlocked(s)).map(s => ({ kind: 'skin' as const, id: s.id, name: s.name() })),
];
export const freshRewards = (): Reward[] => { const seen = seenIds(); return all().filter(r => !seen.includes(r.id)); };
export function markRewardsSeen() {
  try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seenIds(), ...all().map(r => r.id)])])); } catch { /* gizli sekme */ }
}
