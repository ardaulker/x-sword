// bots.js için tip bildirimleri. Kod bots.js'te.

import type { GameState, Level, Move, Piece, StarPiece } from './rules.js';

export const LEVELS: Level[];
export function levelOf(state: GameState, piece: Piece): Level;
export function chooseMove(state: GameState, piece: Piece, level?: Level): Move | null;
export function targetOf(state: GameState, piece: Piece, level?: Level): StarPiece | null;
