// Match record: seed + options + move list. Since the engine is seeded, these three are enough to replay a match.
// The record is used in two places: resuming an unfinished match (on the device) and replay links.

import type { BonusKind, Move } from '../../../engine/rules.js';
import type { Setup } from './controller';
import { legacyLevel, legacyOpts } from './legacy';

export type Opts = Record<string, unknown>;

const CODE: Record<string, string> = { step: 's', double: 'd', swap: 'w' };
const BONUS: Record<string, BonusKind> = { s: 'step', d: 'double', w: 'swap' };

// A move: "row.col" (with a bonus: a trailing letter); a pass: "p".
export function encodeMoves(moves: (Move | null)[]) {
  return moves.map(m => (m ? `${m.r}.${m.c}${m.bonus ? CODE[m.bonus] : ''}` : 'p')).join(';');
}

export function decodeMoves(text: string): (Move | null)[] {
  if (!text) return [];
  return text.split(';').map(tok => {
    if (tok === 'p') return null;
    const m = /^(\d+)\.(\d+)([sdw]?)$/.exec(tok);
    if (!m) throw new Error('broken record');
    // play() finds the move by r, c and bonus; it works out the type and target itself.
    return { r: +m[1], c: +m[2], type: 'walk', ...(m[3] ? { bonus: BONUS[m[3]] } : {}) } as Move;
  });
}

// ------------------------------------------------------------ unfinished match

const SAVE_KEY = 'xsword-save';

export interface SavedGame { v: 1; opts: Opts; setup: Setup; moves: string; elapsed: number }

export function writeSave(s: SavedGame) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private tab */ }
}

export function readSave(): SavedGame | null {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SavedGame | null;
    if (!(s && s.v === 1 && s.opts && s.setup)) return null;
    const setup = { ...s.setup, level: legacyLevel(s.setup.level), aiLevel: legacyLevel(s.setup.aiLevel ?? 'normal') };
    return { ...s, opts: legacyOpts(s.opts), setup };
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private tab */ }
}

// ------------------------------------------------------------ replay link

export interface ReplaySpec { opts: Opts; moves: string }

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export const replayCode = (spec: ReplaySpec) => b64(JSON.stringify(spec));

export function parseReplay(code: string): ReplaySpec | null {
  try {
    const s = JSON.parse(unb64(code)) as ReplaySpec;
    decodeMoves(s.moves);
    return s && s.opts && typeof s.moves === 'string' ? { ...s, opts: legacyOpts(s.opts) } : null;
  } catch { return null; }
}

/** `#/replay/CODE~N`: the replay opens at move N. */
export const replayUrl = (spec: ReplaySpec, at?: number) => `${location.origin}${location.pathname}#/replay/${replayCode(spec)}${at ? `~${at}` : ''}`;
