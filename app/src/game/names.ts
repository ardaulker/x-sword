// Ekranda görünen adlar. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".

import type { GameState, Mode, Piece } from '../../../engine/rules.js';
import { getLang, tr } from '../i18n';

// Bu cihazdaki oyuncunun koltuğu. Tek cihazda 0; çok oyunculuda maç başlarken ağdan gelir.
export let ME = 0;
export const setMe = (seat: number) => { ME = seat; };

const SEAT_ACC = ["'i", "'yi", "'ü", "'ü"]; // 1'i, 2'yi, 3'ü, 4'ü
const tr_ = () => getLang() === 'tr';

// Profil adı olan koltuklar (insan oyuncular) o adla anılır; olmayanlar (yapay zekâ) "Oyuncu N".
// Maç başlarken controller doldurur: tek cihazda senin adın, çok oyunculuda lobideki adlar. "İkiz" yalnız aynanın adıdır.
let seatNames: (string | null)[] = [];
export const setSeatNames = (names: (string | null)[]) => { seatNames = names; };
export const seatName = (_state: GameState, seat: number) => seatNames[seat] || tr('Oyuncu {n}', { n: seat + 1 });

// Türkçe belirtme hâli eki, ünlü uyumuyla: Ada'yı, Kılıç 482'yi, Mert'i. Sondaki rakam okunuşuna göre.
const DIGIT_TAIL = ['ı', 'i', 'yi', 'ü', 'ü', 'i', 'yı', 'yi', 'i', 'u']; // sıfır bir iki üç dört beş altı yedi sekiz dokuz
function accusative(name: string) {
  const last = name.at(-1) ?? '';
  if (/\d/.test(last)) return `${name}'${DIGIT_TAIL[+last]}`;
  const vowels = name.toLocaleLowerCase('tr').match(/[aıoueiöü]/g);
  const v = vowels?.at(-1) ?? 'e';
  const suf = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[v] ?? 'i';
  return `${name}'${/[aıoueiöüAIOUEİÖÜ]$/.test(last) ? 'y' : ''}${suf}`;
}

// Türkçede belirtme hâli eki gerekir; öteki dillerde ad olduğu gibi kalır.
const seatAcc = (state: GameState, seat: number) =>
  !tr_() ? seatName(state, seat) : seatNames[seat] ? accusative(seatNames[seat]!) : seatName(state, seat) + SEAT_ACC[seat];

// "X kazandı" satırı: takımlı maçta takım adı, değilse oyuncu adı.
export const winnerLine = (st: GameState, fallback = 0) =>
  st.winTeam != null ? tr('Takım {n} kazandı', { n: st.winTeam + 1 }) : tr('{name} kazandı', { name: seatName(st, st.winner ?? fallback) });

// Yapay zekâ rakibin kişiliği (kurulumda açıldıysa).
export const personaName = (p: string | null | undefined) =>
  p === 'hunter' ? tr('Avcı') : p === 'careful' ? tr('Temkinli') : p === 'opportunist' ? tr('Fırsatçı') : '';

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
