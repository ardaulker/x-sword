import { attackersOf } from '../../../engine/rules.js';
import type { GameState, Piece } from '../../../engine/rules.js';

// Şu an senin kareni alabilecek taşlar. Kendi İkiz'in sayılmaz: o senin yönünde gider, seni hiç alamaz.
export const attackersOfMe = (st: GameState, me: Piece) =>
  attackersOf(st, me.r, me.c, [me.id]).filter(p => !(p.kind === 'twin' && p.mirrors === me.id));

// Tehlike haritası: gelecek turda, kendi hamlenden önce bir taşın seni alabileceği bütün kareler ("r,c").
export function heatMap(st: GameState, me: Piece) {
  const twin = st.pieces.find(p => p.kind === 'twin' && p.mirrors === me.id);
  const except = twin ? [me.id, twin.id] : [me.id];
  const out = new Set<string>();
  for (let r = 0; r < st.size; r++) {
    for (let c = 0; c < st.size; c++) {
      if (attackersOf(st, r, c, except).length) out.add(`${r},${c}`);
    }
  }
  return out;
}
