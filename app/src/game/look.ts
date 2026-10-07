// Drawing data for pieces, squares and icons. Sizes come from design/CLAUDE_CODE_HANDOFF.md section 3.

import type { Mode, Piece } from '../../../engine/rules.js';

export const INK = '#0B1026';
export const ICE = '#E9F0FF';
export const TXT = '#EEF2FF';
export const TXT2 = '#A9B4DA';
export const DANGER = '#FF3B5C';
export const DANGER_TXT = '#FF9AAC';
export const HAZARD = '#FF8A3D';
export const HAZARD_TXT = '#FFB27F';

export const PLAYER_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF'];
export const BOT_COLORS = { red: '#D3765B', blue: '#6F98DA' } as const;

// The Twin exists only in single-player mode and always mirrors player 1: it uses that seat.
export const seatOf = (p: Piece) => (p.kind === 'star' ? p.seat : 0);
export const isBot = (p: Piece) => p.kind === 'red' || p.kind === 'blue';

export const colorOf = (p: Piece) =>
  p.kind === 'star' || p.kind === 'twin' ? PLAYER_COLORS[seatOf(p)] : BOT_COLORS[p.kind];

// The shape shows the walking direction: a square walks straight, a diamond diagonally. Stars and the Twin turn with the mode.
export const diamondOf = (p: Pick<Piece, 'kind'>, mode: Mode) =>
  p.kind === 'blue' || ((p.kind === 'star' || p.kind === 'twin') && mode === 'DIAGONAL');

export const alpha = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};

// viewBox 0 0 100 100
export const SQUARE_POINTS = '17,17 83,17 83,83 17,83';
export const DIAMOND_POINTS = '50,5 95,50 50,95 5,50';
export const PLUS = 'M50 27 V73 M27 50 H73';
export const CROSS = 'M33 33 L67 67 M67 33 L33 67';

export interface Glyph {
  d: string;
  fill: string;
  stroke: string;
  width: number;
}

// Player emblems: dot, triangle, double bar, ring.
export const EMBLEMS: Glyph[] = [
  { d: 'M50 36 A14 14 0 1 1 49.99 36 Z', fill: INK, stroke: 'none', width: 0 },
  { d: 'M50 33 L66 62 L34 62 Z', fill: INK, stroke: INK, width: 3 },
  { d: 'M33 42 H67 M33 58 H67', fill: 'none', stroke: INK, width: 9 },
  { d: 'M50 37 A13 13 0 1 1 49.99 37 Z', fill: 'none', stroke: INK, width: 8 },
];

export function glyphOf(p: Pick<Piece, 'kind'> & { seat?: number }): Glyph {
  if (p.kind === 'star') return EMBLEMS[p.seat ?? 0];
  if (p.kind === 'twin') {
    // Dark Twin: the same emblem with colors reversed (dark piece, emblem in the player's color).
    const e = EMBLEMS[p.seat ?? 0], col = PLAYER_COLORS[p.seat ?? 0];
    return { ...e, fill: e.fill === INK ? col : e.fill, stroke: e.stroke === INK ? col : e.stroke };
  }
  return { d: p.kind === 'red' ? CROSS : PLUS, fill: 'none', stroke: INK, width: 10 };
}

// Square corner chamfer by board size.
export const chamferOf = (n: number) => (n <= 9 ? 26 : n <= 11 ? 22 : 18);

// Chamfered square outline, i units in from the edge.
export function octPath(k: number, i: number) {
  const a = k + i * 0.4, b = 100 - a, e = i, f = 100 - i;
  return `M${a} ${e} L${b} ${e} L${f} ${a} L${f} ${b} L${b} ${f} L${a} ${f} L${e} ${b} L${e} ${a} Z`;
}

export const octClip = (k: number) =>
  `polygon(${k}% 0,${100 - k}% 0,100% ${k}%,100% ${100 - k}%,${100 - k}% 100%,${k}% 100%,0 ${100 - k}%,0 ${k}%)`;

// The target triangle on a bot's edge: pointing toward the star it chases, rounded to 8 directions.
export function notchPath(from: { r: number; c: number }, to: { r: number; c: number }) {
  let a = Math.atan2(to.r - from.r, to.c - from.c);
  a = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
  const cs = Math.cos(a), sn = Math.sin(a), f = (v: number) => v.toFixed(1);
  const tx = 50 + cs * 64, ty = 50 + sn * 64, bx = 50 + cs * 44, by = 50 + sn * 44;
  return `M${f(tx)} ${f(ty)} L${f(bx - sn * 13)} ${f(by + cs * 13)} L${f(bx + sn * 13)} ${f(by - cs * 13)} Z`;
}

// In-cell marks (viewBox 0 0 100 100)
export const MARK_SQUARE = 'M41 41 H59 V59 H41 Z';
export const MARK_DIAMOND = 'M50 37 L63 50 L50 63 L37 50 Z';
export const MARK_AIM = 'M50 2 V18 M50 82 V98 M2 50 H18 M82 50 H98';

// UI icons (viewBox 0 0 24 24)
export const ICON = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  sword: 'M20 4 L9.5 14.5 M20 4 V9 M20 4 H15 M6 13 L11 18 M4 20 L8.2 15.8',
  clock: 'M12 7 V12 L15.5 14 M12 3 A9 9 0 1 1 11.99 3 Z',
  warn: 'M12 3.5 L21.5 20 H2.5 Z M12 10 V14 M12 17 V17.2',
  check: 'M5 12.5 L10 17 L19 7',
  close: 'M6 6 L18 18 M18 6 L6 18',
  fast: 'M3 5 L12 12 L3 19 Z M12 5 L21 12 L12 19 Z',
  eye: 'M2 12 C5 6.5 8.5 5 12 5 C15.5 5 19 6.5 22 12 C19 17.5 15.5 19 12 19 C8.5 19 5 17.5 2 12 Z M12 15 A3 3 0 1 1 12.01 15 Z',
  replay: 'M4 12 A8 8 0 0 1 18 6.5 M18 3 V7 H14 M20 12 A8 8 0 0 1 6 17.5 M6 21 V17 H10',
  info: 'M12 3 A9 9 0 1 1 11.99 3 Z M12 11 V16.5 M12 7.6 V7.8',
};
