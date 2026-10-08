// Type declarations for rules.js. The code lives in rules.js; this file only tells TypeScript its shape.
// If anything rules.js exports changes, update this file too.

export type Mode = 'STRAIGHT' | 'DIAGONAL';
export type Level = 'easy' | 'normal' | 'hard';
export type Dir = readonly [number, number];

interface PieceBase {
  id: string;
  r: number;
  c: number;
  alive: boolean;
  /** Puzzle hunter (bots only): also steps toward your star every round (a small letter on the puzzle map). */
  walks?: boolean;
}
export interface StarPiece extends PieceBase {
  kind: 'star';
  seat: number;
}
export interface BotPiece extends PieceBase {
  kind: 'red' | 'blue';
  label: string;
}
// The player's mirror in single-player mode: plays by the star's rules, in the direction the star just played.
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
  score: number;
  bonus: number;
  bonuses: Record<BonusKind, number>;
  scoreTier: number;
  swapGiven: boolean;
  persona: 'hunter' | 'careful' | 'opportunist' | null;
  team: number | null;
  out: boolean;
  outRound?: number;
}

export type BonusKind = 'armor' | 'step' | 'double' | 'swap';

export interface Move {
  r: number;
  c: number;
  type: 'walk' | 'take' | 'swap';
  targetId?: string;
  bonus?: BonusKind;
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
  // Set while a star plays the extra moves of a Double move: n moves are already played in this sequence, `takes` of them took a piece.
  extra: { id: string; n: number; takes: number } | null;
  /** Rules version this match is played by (see RULES_VERSION). */
  rules: number;
  matchOrder: string[];
  keepGoing: boolean;
  decided: boolean;
  blocked: Set<number> | null;     // obstacle squares (r * size + c)
  holes: Set<number> | null;       // off-map squares in a puzzle (also included in blocked)
  teams: number[] | null;          // team match: seat → team
  winTeam: number | null;
  puzzle: { limit: number; used: number } | null;
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
  firstSeat?: number | null;
  shuffle?: boolean;
  keepGoing?: boolean;
  personas?: boolean;
  obstacles?: boolean;
  teams?: boolean;
  /** Rules version to play by; old saves and replays carry theirs. Defaults to RULES_VERSION. */
  rules?: number;
  /** 9, 11, 13 or 15; ignored if smaller than the default for the player count. */
  size?: number;
}

export const SIZE_BY_STARS: Record<number, number>;
export const NEUTRALS_BY_STARS: Record<number, number>;
export const SEAT_NAMES: string[];
export const POINTS: Record<Piece['kind'], number>;
export const SURVIVOR_BONUS: number;
export const BONUS_KINDS: BonusKind[];
export const BONUS_SCORES: number[];
export const BOARD_SIZES: number[];
export function defaultNeutrals(stars: number, size: number): number;
export function maxNeutrals(size: number): number;
export const TWIN_TAKE_MULT: number;
export const SWAP_SCORE: number;
export const BONUS_NAMES: Record<BonusKind, string>;

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

export function endMatch(state: GameState): GameState;
export function isWinner(state: GameState, seat: number): boolean;
export function friendly(state: GameState, a: Piece, b: Piece): boolean;
export function createPuzzle(def: { map?: string[]; me?: [number, number]; bots?: { kind: 'red' | 'blue'; r: number; c: number }[]; limit: number; mode?: Mode; size?: number; bonuses?: Partial<Record<BonusKind, number>> | null; shrink?: { start: number; every: number } | null; rules?: number }): GameState;
export function createGame(options: GameOptions): GameState;
/** The newest rules version. Saves, replay links and rooms record the version they were played with. */
export const RULES_VERSION: number;
/** 8 hex digits describing the match state; equal states give equal hashes. */
export function stateHash(state: GameState): string;
export function roundOrder(state: GameState): string[];
export function currentActor(state: GameState): Piece | null;
export function isBotTurn(state: GameState): boolean;
export function nextMode(state: GameState, p: Piece): Mode;
export function legalMoves(state: GameState, piece: Piece, mode?: Mode, bonus?: BonusKind | null): Move[];
export function attackersOf(state: GameState, r: number, c: number, except?: string[], victim?: Piece | null): Piece[];
export function collapseDue(state: GameState): boolean;
export function nextCollapseRound(state: GameState): number | null;
export function doomedAt(state: GameState, r: number, c: number): boolean;
export function twinMove(state: GameState, twin: Piece): Move | null;
export function threatsFor(state: GameState, piece: Piece, move: Move): { attackers: Piece[]; doomed: boolean };
export function isSafe(state: GameState, piece: Piece, move: Move): boolean;
export function play(state: GameState, move: Move | null): GameState;
export function ranking(state: GameState): number[];
