// Maç kaydı: tohum + seçenekler + hamle listesi. Motor tohumlu olduğu için bu üçü maçı baştan oynatmaya yeter.
// Kayıt iki yerde kullanılır: yarım kalan maçı sürdürmek (cihazda) ve maç tekrarı bağlantısı.

import type { BonusKind, Move } from '../../../engine/rules.js';
import type { Setup } from './controller';

export type Opts = Record<string, unknown>;

const CODE: Record<string, string> = { step: 's', double: 'd', swap: 'w' };
const BONUS: Record<string, BonusKind> = { s: 'step', d: 'double', w: 'swap' };

// Hamle: "satır.sütun" (bonuslu: sonuna harf); pas: "p".
export function encodeMoves(moves: (Move | null)[]) {
  return moves.map(m => (m ? `${m.r}.${m.c}${m.bonus ? CODE[m.bonus] : ''}` : 'p')).join(';');
}

export function decodeMoves(text: string): (Move | null)[] {
  if (!text) return [];
  return text.split(';').map(tok => {
    if (tok === 'p') return null;
    const m = /^(\d+)\.(\d+)([sdw]?)$/.exec(tok);
    if (!m) throw new Error('bozuk kayıt');
    // play() hamleyi r, c ve bonusla bulur; tür ve hedefi kendi bulur.
    return { r: +m[1], c: +m[2], type: 'walk', ...(m[3] ? { bonus: BONUS[m[3]] } : {}) } as Move;
  });
}

// ------------------------------------------------------------ yarım kalan maç

const SAVE_KEY = 'xsword-save';

export interface SavedGame { v: 1; opts: Opts; setup: Setup; moves: string; elapsed: number }

export function writeSave(s: SavedGame) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* gizli sekme */ }
}

export function readSave(): SavedGame | null {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SavedGame | null;
    return s && s.v === 1 && s.opts && s.setup ? s : null;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* gizli sekme */ }
}

// ------------------------------------------------------------ tekrar bağlantısı

export interface ReplaySpec { opts: Opts; moves: string }

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export const replayCode = (spec: ReplaySpec) => b64(JSON.stringify(spec));

export function parseReplay(code: string): ReplaySpec | null {
  try {
    const s = JSON.parse(unb64(code)) as ReplaySpec;
    decodeMoves(s.moves);
    return s && s.opts && typeof s.moves === 'string' ? s : null;
  } catch { return null; }
}

export const replayUrl = (spec: ReplaySpec) => `${location.origin}${location.pathname}#/izle/${replayCode(spec)}`;
