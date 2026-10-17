// Achievements: goals beyond the cosmetic unlocks. Everything is derived from the statistics (game/stats.ts), so an
// achievement never needs its own storage and merges across devices with the progress snapshot (game/progress.ts).
// Only "already announced" is remembered, so the result card can say "Achievement unlocked" once.

import { PUZZLES } from './puzzles';
import { loadStats } from './stats';
import type { Stats } from './stats';
import { tr } from '../i18n';

export interface Achievement {
  id: string;
  icon: string;               // an Icon path (24×24)
  name: () => string;
  desc: () => string;
  n: number;                  // goal
  value: (s: Stats) => number;
}

const solved = (s: Stats) => Object.values(s.puzzleStars).filter(v => v >= 1).length;
const flawless = (s: Stats) => Object.values(s.puzzleStars).filter(v => v >= 3).length;
const PUZZLE_COUNT = PUZZLES.filter(p => !p.tutorial).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-take', icon: 'M5 19 L19 5 M9 5 H19 V15', name: () => tr('First take'), desc: () => tr('Take your first piece'), n: 1, value: s => s.takes },
  { id: 'collector', icon: 'M4 8 H20 V20 H4 Z M8 8 V5 H16 V8', name: () => tr('Collector'), desc: () => tr('Take 100 pieces'), n: 100, value: s => s.takes },
  { id: 'regular', icon: 'M7 4.5 L19 12 L7 19.5 Z', name: () => tr('Regular'), desc: () => tr('Play 10 matches'), n: 10, value: s => s.matches },
  { id: 'winner', icon: 'M6 4 H18 V9 A6 6 0 0 1 6 9 Z M12 15 V20 M8 20 H16', name: () => tr('Winner'), desc: () => tr('Win a match'), n: 1, value: s => s.wins },
  { id: 'champion', icon: 'M3 8 L8 12 L12 4 L16 12 L21 8 L19 19 H5 Z', name: () => tr('Champion'), desc: () => tr('Win 25 matches'), n: 25, value: s => s.wins },
  { id: 'hard-won', icon: 'M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z', name: () => tr('Hard won'), desc: () => tr('Win a match on Hard'), n: 1, value: s => s.hardWins },
  { id: 'pure-sword', icon: 'M5 19 L19 5 M14 5 H19 V10 M4 20 L8 16', name: () => tr('Pure sword'), desc: () => tr('Win a match without using a bonus'), n: 1, value: s => s.cleanWins },
  { id: 'double-take', icon: 'M4 12 H12 M9 8 L13 12 L9 16 M12 12 H20 M17 8 L21 12 L17 16', name: () => tr('Two at once'), desc: () => tr('Take two pieces with one Double move'), n: 1, value: s => s.pairTakes },
  { id: 'long-haul', icon: 'M12 3 A9 9 0 1 1 11.99 3 Z M12 7 V12 L16 14', name: () => tr('Long haul'), desc: () => tr('Survive until round 18'), n: 18, value: s => s.bestRounds },
  { id: 'streak', icon: 'M13 3 L5 14 H11 L10 21 L19 9 H13 Z', name: () => tr('On a roll'), desc: () => tr('Win 3 matches in a row'), n: 3, value: s => s.bestStreak },
  { id: 'puzzle-master', icon: 'M12 3 L14.5 9 L21 9.5 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.5 L9.5 9 Z', name: () => tr('Puzzle master'), desc: () => tr('Solve 10 puzzles with three stars'), n: 10, value: flawless },
  { id: 'puzzle-sweep', icon: 'M10 3 H14 V6 A2 2 0 1 0 18 6 V3 H21 V9 H18 A2 2 0 1 0 18 13 H21 V21 H3 V13 H6 A2 2 0 1 1 6 9 H3 V3 Z', name: () => tr('Puzzle sweep'), desc: () => tr('Solve every puzzle'), n: PUZZLE_COUNT, value: solved },
  { id: 'daily', icon: 'M7 3 V6 M17 3 V6 M4 9 H20 M5 5 H19 A1 1 0 0 1 20 6 V19 A1 1 0 0 1 19 20 H5 A1 1 0 0 1 4 19 V6 A1 1 0 0 1 5 5 Z', name: () => tr('Every day'), desc: () => tr('Play 7 daily challenges'), n: 7, value: s => s.dailyPlayed },
  { id: 'together', icon: 'M9 11 A4 4 0 1 0 9.01 11 Z M2 21 C2 17 5 15 9 15 C11 15 12.5 15.5 13.5 16.3 M19 8 V14 M16 11 H22', name: () => tr('Better together'), desc: () => tr('Play an online match'), n: 1, value: s => s.onlineMatches },
  { id: 'table-of-four', icon: 'M4 4 H20 V20 H4 Z M4 12 H20 M12 4 V20', name: () => tr('Table of four'), desc: () => tr('Win a 4-player match'), n: 1, value: s => s.fourWins },
];

export const achievementProgress = (a: Achievement, s: Stats = loadStats()) => Math.min(a.value(s), a.n);
export const isEarned = (a: Achievement, s: Stats = loadStats()) => a.value(s) >= a.n;

// Which achievements were already announced.
const SEEN = 'xsword-achievements-seen';
const seen = (): string[] => { try { const d = JSON.parse(localStorage.getItem(SEEN) ?? 'null'); return Array.isArray(d) ? d : []; } catch { return []; } };
const earned = (): Achievement[] => { const s = loadStats(); return ACHIEVEMENTS.filter(a => isEarned(a, s)); };

export const freshAchievements = (): Achievement[] => { const old = seen(); return earned().filter(a => !old.includes(a.id)); };
export function markAchievementsSeen() {
  try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen(), ...earned().map(a => a.id)])])); } catch { /* private tab */ }
}
