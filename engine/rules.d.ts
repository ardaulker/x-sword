// rules.js için tip bildirimleri. Kod rules.js'te; burası yalnız TypeScript'e onun şeklini anlatır.
// rules.js'te dışa açılan bir şey değişirse burayı da güncelle.

export type Mode = 'DUZ' | 'CAPRAZ';
export type Level = 'kolay' | 'normal' | 'zor';
export type Dir = readonly [number, number];

interface PieceBase {
  id: string;
  r: number;
  c: number;
  alive: boolean;
}
export interface StarPiece extends PieceBase {
  kind: 'star';
  seat: number;
}
export interface BotPiece extends PieceBase {
  kind: 'red' | 'blue';
  label: string;
}
// Tek oyunculu modda oyuncunun aynası: yıldızın kurallarıyla, onun yaptığı yönde oynar.
export interface TwinPiece extends PieceBase {
  kind: 'twin';
  mirrors: string;
  label: string;
}
export type Piece = StarPiece | BotPiece | TwinPiece;

export interface Seat {
  index: number;
  name: string;
  kind: 'human' | 'bot';
  level: Level;
  takes: number;
  out: boolean;
  outRound?: number;
}

export interface Move {
  r: number;
  c: number;
  type: 'walk' | 'take';
  targetId?: string;
}

export interface GameState {
  size: number;
  round: number;
  mode: Mode;
  ring: number;
  shrinkStart: number;
  shrinkEvery: number;
  neutralLevel: Level;
  rng: number;
  seats: Seat[];
  pieces: Piece[];
  order: string[];
  turn: number;
  over: boolean;
  winner: number | null;
  outOrder: number[];
  log: { round: number; text: string }[];
  solo: boolean;
  lastStep: { id: string; dr: number; dc: number } | null;
}

export interface SeatSetup {
  kind: 'human' | 'bot';
  level?: Level;
}

export interface GameOptions {
  seats: SeatSetup[];
  neutralLevel?: Level;
  seed?: number;
  shrinkStart?: number;
  shrinkEvery?: number;
  neutrals?: number;
}

export const SIZE_BY_STARS: Record<number, number>;
export const NEUTRALS_BY_STARS: Record<number, number>;
export const SEAT_NAMES: string[];

export function flip(mode: Mode): Mode;
export function modeLabel(mode: Mode): string;
export function walkDirs(piece: Piece, mode: Mode): Dir[];
export function takeDirs(piece: Piece, mode: Mode): Dir[];
export function random(state: GameState): number;

export function pieceById(state: GameState, id: string): Piece | undefined;
export function starOf(state: GameState, seat: number): StarPiece | undefined;
export function pieceAt(state: GameState, r: number, c: number): Piece | null;
export function ringOf(state: GameState, r: number, c: number): number;
export function inArena(state: GameState, r: number, c: number): boolean;
export function nameOf(state: GameState, p: Piece): string;

export function createGame(options: GameOptions): GameState;
export function roundOrder(state: GameState): string[];
export function currentActor(state: GameState): Piece | null;
export function isBotTurn(state: GameState): boolean;
export function nextMode(state: GameState, p: Piece): Mode;
export function legalMoves(state: GameState, piece: Piece, mode?: Mode): Move[];
export function attackersOf(state: GameState, r: number, c: number, except?: string[]): Piece[];
export function collapseDue(state: GameState): boolean;
export function nextCollapseRound(state: GameState): number | null;
export function doomedAt(state: GameState, r: number, c: number): boolean;
export function twinMove(state: GameState, twin: Piece): Move | null;
export function threatsFor(state: GameState, piece: Piece, move: Move): { attackers: Piece[]; doomed: boolean };
export function isSafe(state: GameState, piece: Piece, move: Move): boolean;
export function play(state: GameState, move: Move | null): GameState;
export function ranking(state: GameState): number[];
