// Names shown on screen. Pieces are taken as in chess: "You took #5!", "#3 took you!".

import type { GameState, Mode, Piece } from '../../../engine/rules.js';
import { getLang, tr } from '../i18n';

// This device's player seat. 0 on one device; in multiplayer it comes over the network when the match starts.
export let ME = 0;
export const setMe = (seat: number) => { ME = seat; };

const SEAT_ACC = ["'i", "'yi", "'ü", "'ü"]; // Turkish accusative for 1, 2, 3, 4
const tr_ = () => getLang() === 'tr';

// Seats with a profile name (human players) are called by that name; the others (AI) are "Player N".
// The controller fills this when a match starts: your name on one device, the lobby names in multiplayer. "Twin" is only the mirror's name.
let seatNames: (string | null)[] = [];
export const setSeatNames = (names: (string | null)[]) => { seatNames = names; };
export const seatName = (_state: GameState, seat: number) => seatNames[seat] || tr('Player {n}', { n: seat + 1 });

// Turkish accusative suffix with vowel harmony: Ada'yı, Kılıç 482'yi, Mert'i. A trailing digit follows how it is read.
const DIGIT_TAIL = ['ı', 'i', 'yi', 'ü', 'ü', 'i', 'yı', 'yi', 'i', 'u']; // Turkish digit names: sıfır bir iki üç dört beş altı yedi sekiz dokuz
function accusative(name: string) {
  const last = name.at(-1) ?? '';
  if (/\d/.test(last)) return `${name}'${DIGIT_TAIL[+last]}`;
  const vowels = name.toLocaleLowerCase('tr').match(/[aıoueiöü]/g);
  const v = vowels?.at(-1) ?? 'e';
  const suf = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[v] ?? 'i';
  return `${name}'${/[aıoueiöüAIOUEİÖÜ]$/.test(last) ? 'y' : ''}${suf}`;
}

// Turkish needs the accusative suffix; other languages keep the name as is.
const seatAcc = (state: GameState, seat: number) =>
  !tr_() ? seatName(state, seat) : seatNames[seat] ? accusative(seatNames[seat]!) : seatName(state, seat) + SEAT_ACC[seat];

// The "X won" line: the team name in a team match, otherwise the player name.
export const winnerLine = (st: GameState, fallback = 0) =>
  st.winTeam != null ? tr('Team {n} won', { n: st.winTeam + 1 }) : tr('{name} won', { name: seatName(st, st.winner ?? fallback) });

// The AI rival's personality (if enabled in setup).
export const personaName = (p: string | null | undefined) =>
  p === 'hunter' ? tr('Hunter') : p === 'careful' ? tr('Cautious') : p === 'opportunist' ? tr('Opportunist') : '';

export const botName = (kind: 'red' | 'blue') => kind === 'red' ? tr('Red') : tr('Steel');

// Short label: strip, chip, log line.
export function labelOf(state: GameState, p: Piece) {
  if (p.kind === 'star') return p.seat === ME ? tr('You') : seatName(state, p.seat);
  if (p.kind === 'twin') return tr('Twin');
  return `${botName(p.kind)} #${p.label}`;
}

// Subject of a sentence: "#3 took you!", "The Twin took you!"
export function subjectOf(state: GameState, p: Piece) {
  return p.kind === 'star' ? seatName(state, p.seat) : p.kind === 'twin' ? tr('Twin') : tr('#{n}', { n: p.label });
}

// Object of a sentence (Turkish accusative): "You took #5!", "You took the Twin!"
export function objectOf(state: GameState, p: Piece) {
  if (p.kind === 'star') return seatAcc(state, p.seat);
  if (p.kind === 'twin') return tr('Twin') + (tr_() ? "'i" : '');
  return tr('#{n}', { n: p.label }) + (tr_() ? 'yı' : '');
}

export const modeWord = (mode: Mode) => mode === 'STRAIGHT' ? tr('STRAIGHT') : tr('DIAGONAL');
export const modeLower = (mode: Mode) => mode === 'STRAIGHT' ? tr('straight') : tr('diagonally');

export const clockText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
