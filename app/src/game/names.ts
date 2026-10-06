// Ekranda görünen adlar. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".

import type { GameState, Mode, Piece } from '../../../engine/rules.js';
import { getLang, tr } from '../i18n';

// Bu cihazdaki oyuncunun koltuğu. Tek cihazda 0; çok oyunculuda maç başlarken ağdan gelir.
export let ME = 0;
export const setMe = (seat: number) => { ME = seat; };

const SEAT_ACC = ["'i", "'yi", "'ü", "'ü"]; // 1'i, 2'yi, 3'ü, 4'ü
const tr_ = () => getLang() === 'tr';

// İnsan da yapay zekâ da "Oyuncu N" diye anılır. "İkiz" yalnız tek oyunculu moddaki aynanın adıdır.
export const seatName = (_state: GameState, seat: number) => tr('Oyuncu {n}', { n: seat + 1 });

// Türkçede belirtme hâli eki gerekir; öteki dillerde ad olduğu gibi kalır.
const seatAcc = (state: GameState, seat: number) => seatName(state, seat) + (tr_() ? SEAT_ACC[seat] : '');

export const botName = (kind: 'red' | 'blue') => kind === 'red' ? tr('Kızıl') : tr('Çelik');

// Kısa etiket: şerit, çip, kayıt satırı.
export function labelOf(state: GameState, p: Piece) {
  if (p.kind === 'star') return p.seat === ME ? tr('Sen') : seatName(state, p.seat);
  if (p.kind === 'twin') return tr('İkiz');
  return `${botName(p.kind)} #${p.label}`;
}

// Cümlenin öznesi: "3 numara seni aldı!", "İkiz seni aldı!"
export function subjectOf(state: GameState, p: Piece) {
  return p.kind === 'star' ? seatName(state, p.seat) : p.kind === 'twin' ? tr('İkiz') : tr('{n} numara', { n: p.label });
}

// Belirtme hâli: "5 numarayı aldın!", "İkiz'i aldın!"
export function objectOf(state: GameState, p: Piece) {
  if (p.kind === 'star') return seatAcc(state, p.seat);
  if (p.kind === 'twin') return tr('İkiz') + (tr_() ? "'i" : '');
  return tr('{n} numara', { n: p.label }) + (tr_() ? 'yı' : '');
}

export const modeWord = (mode: Mode) => mode === 'DUZ' ? tr('DÜZ') : tr('ÇAPRAZ');
export const modeLower = (mode: Mode) => mode === 'DUZ' ? tr('düz') : tr('çapraz');

export const clockText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
