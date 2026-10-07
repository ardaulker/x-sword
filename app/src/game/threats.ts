import { attackersOf } from '../../../engine/rules.js';
import type { GameState, Piece } from '../../../engine/rules.js';

// Pieces that can take your square right now. Your own Twin doesn't count: it moves your direction and can never take you.
export const attackersOfMe = (st: GameState, me: Piece) =>
  attackersOf(st, me.r, me.c, [me.id], me).filter(p => !(p.kind === 'twin' && p.mirrors === me.id));

// Danger map: every square ("r,c") where a piece could take you next round, before your own move.
export function heatMap(st: GameState, me: Piece) {
  const twin = st.pieces.find(p => p.kind === 'twin' && p.mirrors === me.id);
  const except = twin ? [me.id, twin.id] : [me.id];
  const out = new Set<string>();
  for (let r = 0; r < st.size; r++) {
    for (let c = 0; c < st.size; c++) {
      if (attackersOf(st, r, c, except, me).length) out.add(`${r},${c}`);
    }
  }
  return out;
}
