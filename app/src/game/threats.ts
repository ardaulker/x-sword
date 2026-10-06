import { attackersOf } from '../../../engine/rules.js';
import type { GameState, Piece } from '../../../engine/rules.js';

// Şu an senin kareni alabilecek taşlar. Kendi İkiz'in sayılmaz: o senin yönünde gider, seni hiç alamaz.
export const attackersOfMe = (st: GameState, me: Piece) =>
  attackersOf(st, me.r, me.c, [me.id]).filter(p => !(p.kind === 'twin' && p.mirrors === me.id));
