// Move order: shuffled once at the start, the same all match (engine/rules.js → matchOrder).
// The number on a piece is its place among this round's survivors; it is reassigned every round.

import { pieceById } from '../../../engine/rules.js';
import type { GameState } from '../../../engine/rules.js';
import type { View } from './controller';

export function orderNo(st: GameState, id: string, round = st.round) {
  if (round > st.round) return st.matchOrder.filter(x => alive(st, x)).indexOf(id) + 1;
  const i = st.order.indexOf(id);
  return i >= 0 ? i + 1 : st.matchOrder.indexOf(id) + 1;
}

const alive = (st: GameState, id: string) => !!pieceById(st, id)?.alive;

// Moving now: during the bot phase the bot that just moved (the one with the white halo), otherwise the piece whose turn it is.
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

// The upcoming pieces starting with the one moving now; at the end of the round it continues with the next round's order.
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

// The one that just moved: slides out to the left of the turn queue.
export function previous(st: GameState, view: View): QueueItem | null {
  const i = nowIndex(st, view) - 1;
  return i >= 0 ? { id: st.order[i], round: st.round } : null;
}
