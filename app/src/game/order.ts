// Hamle sırası: maç başında bir kez karılır, bütün maç aynı kalır (engine/rules.js → matchOrder).
// Taşın üstündeki numara bu sıradaki yeridir.

import { pieceById } from '../../../engine/rules.js';
import type { GameState } from '../../../engine/rules.js';
import type { View } from './controller';

export const orderNo = (st: GameState, id: string) => st.matchOrder.indexOf(id) + 1;

const alive = (st: GameState, id: string) => !!pieceById(st, id)?.alive;

// Şu an oynayan: bot bölümünde az önce oynayan bot (beyaz haleli olan), yoksa sırası gelen taş.
export function nowIndex(st: GameState, view: View) {
  if (view.phase === 'bot' && view.bots.currentId && st.order.indexOf(view.bots.currentId) === st.turn - 1) return st.turn - 1;
  let i = st.turn;
  while (i < st.order.length && !alive(st, st.order[i])) i++;
  return i;
}

export interface QueueItem {
  id: string;
  round: number;
}

// Şu an oynayandan başlayarak sıradakiler; tur biterse sonraki turun sırasıyla devam eder.
export function upcoming(st: GameState, view: View, count: number): QueueItem[] {
  const out: QueueItem[] = [];
  if (st.over) return out;
  for (let i = nowIndex(st, view); i < st.order.length && out.length < count; i++) {
    const id = st.order[i];
    if (alive(st, id) || (i === st.turn - 1 && view.phase === 'bot')) out.push({ id, round: st.round });
  }
  const next = st.matchOrder.filter(id => alive(st, id));
  for (let round = st.round + 1; out.length < count && next.length; round++) {
    for (const id of next) {
      if (out.length >= count) break;
      out.push({ id, round });
    }
  }
  return out;
}

// Az önce oynayan: sıra göstergesinde sola kayarak çıkar.
export function previous(st: GameState, view: View): QueueItem | null {
  const i = nowIndex(st, view) - 1;
  return i >= 0 ? { id: st.order[i], round: st.round } : null;
}
