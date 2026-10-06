// Ekranda görünen adlar. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".

import type { GameState, Mode, Piece } from '../../../engine/rules.js';

// Bu cihazdaki oyuncunun koltuğu. Tek cihazda 0; çok oyunculuda maç başlarken ağdan gelir.
export let ME = 0;
export const setMe = (seat: number) => { ME = seat; };

const SEAT_ACC = ["'i", "'yi", "'ü", "'ü"]; // 1'i, 2'yi, 3'ü, 4'ü

// İnsan da yapay zekâ da "Oyuncu N" diye anılır. "İkiz" yalnız tek oyunculu moddaki aynanın adıdır.
export const seatName = (_state: GameState, seat: number) => `Oyuncu ${seat + 1}`;

const seatAcc = (state: GameState, seat: number) => seatName(state, seat) + SEAT_ACC[seat];

export const BOT_NAMES = { red: 'Kızıl', blue: 'Çelik' } as const;

// Kısa etiket: şerit, çip, kayıt satırı.
export function labelOf(state: GameState, p: Piece) {
  if (p.kind === 'star') return p.seat === ME ? 'Sen' : seatName(state, p.seat);
  if (p.kind === 'twin') return 'İkiz';
  return `${BOT_NAMES[p.kind]} #${p.label}`;
}

// Cümlenin öznesi: "3 numara seni aldı!", "İkiz seni aldı!"
export function subjectOf(state: GameState, p: Piece) {
  return p.kind === 'star' ? seatName(state, p.seat) : p.kind === 'twin' ? 'İkiz' : `${p.label} numara`;
}

// Belirtme hâli: "5 numarayı aldın!", "İkiz'i aldın!"
export function objectOf(state: GameState, p: Piece) {
  return p.kind === 'star' ? seatAcc(state, p.seat) : p.kind === 'twin' ? "İkiz'i" : `${p.label} numarayı`;
}

export const modeWord = (mode: Mode) => (mode === 'DUZ' ? 'DÜZ' : 'ÇAPRAZ');
export const modeLower = (mode: Mode) => (mode === 'DUZ' ? 'düz' : 'çapraz');

export const clockText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
