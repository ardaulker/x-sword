// Types shared by the match controller (game/controller.ts), the screens and the effects (game/effects.ts).

import type { BonusKind, Level, Move } from '../../../engine/rules.js';

// This device's role in a multiplayer match. The host runs the match and broadcasts every move;
// a guest sends its own move to the host and applies every move it receives from the host.
export interface NetRole {
  role: 'host' | 'guest';
  broadcast?: (n: number, move: Move | null, hash: string) => void;
  send?: (move: Move | null) => void;
  desync?: () => void; // guest: the state differs from the host's (hash check failed)
  nudge?: (seat: number) => void; // ring the bell for the player whose move it is
}

export type Phase =
  | 'ready'     // the match is starting
  | 'mine'       // your turn
  | 'preview'  // you picked a square, waiting for confirmation
  | 'rival'     // another star (an AI player) is moving
  | 'bot'       // arena bots are moving
  | 'wait'     // a move was played, the next step is coming
  | 'mode'       // the mode is changing
  | 'over';

export interface Setup {
  players: number;
  level: Level;        // arena bot intelligence
  aiLevel: Level;      // AI rival intelligence (2–4 players)
  moveSeconds: number;
  /** Board side and arena bot count. */
  boardSize: number;
  bots: number;
  /** Daily challenge: the date text (YYYY-MM-DD). When set, board, bots and difficulty are fixed. */
  daily?: string | null;
  /** Puzzle id; when set, the match is that puzzle. */
  puzzle?: number | null;
  /** Options (off by default): rival personalities, obstacle squares, teams (4 players only). */
  personas?: boolean;
  obstacles?: boolean;
  teams?: boolean;
  /** 15×15 only: rings fall after rounds 3, 5, 6, 7 … (on unless switched off). */
  fastShrink?: boolean;
}
// players 1: single-player mode (you + your mirror Twin + bots). 2–4: against AI players.
export const DEFAULT_SETUP: Setup = { players: 1, level: 'normal', aiLevel: 'normal', moveSeconds: 20, boardSize: 9, bots: 14 };

export interface Spot { r: number; c: number }
export interface Trail { key: number; from: Spot; to: Spot; color: string }
export interface Burst { key: number; r: number; c: number; color: string; big?: boolean }
// A sword stroke across the taken square. angle: the attack direction in degrees (0 = right, 90 = down).
export interface Slash { key: number; r: number; c: number; angle: number; color: string; big: boolean }
export interface Float { key: number; r: number; c: number; text: string; color: string; big?: boolean }
// The last moves played this round: they stay on the board as faint dashed lines.
export interface LastMove { id: string; round: number; from: Spot; to: Spot; color: string }
export interface Toast { key: number; text: string; icon: 'sword' | 'clock' | 'info' | 'ring' }
export interface Banner { key: number; title: string; sub: string; color: string; pieceId: string | null }
// attackerId null: the piece fell with a collapsing ring.
export interface TakeEvent { key: number; round: number; attackerId: string | null; victimId: string; at: number } // at: number of moves played up to that moment (to jump there in a replay)
export type Sheet = { type: 'log' } | { type: 'bonus' } | { type: 'menu' } | { type: 'results' } | { type: 'coach'; step: number } | null;

export interface View {
  phase: Phase;
  sel: Move | null;
  showThreats: boolean;
  timer: number;
  trails: Trail[];
  lastMoves: LastMove[];
  bursts: Burst[];
  slashes: Slash[];
  floats: Float[];
  toast: Toast | null;
  banner: Banner | null;
  modeOverlay: boolean;
  sheet: Sheet;
  inspect: string | null;
  bonus: BonusKind | null; // the bonus you picked on your turn: reachable squares follow it
  bots: { done: number; total: number; currentId: string | null };
  events: TakeEvent[];
  clockStart: number;
  clockEnd: number | null;
  watching: boolean;
  shake: number;
  fall: { key: number; ring: number } | null; // the ring that just collapsed (for the animation)
  hit: number; // grows when you are taken or fall: the screen flashes red
  countdown: number | null; // 3, 2, 1 before a match starts (null: not counting)
  version: number;
}

export interface Outcome {
  roundEnded: boolean;
  collapsed: boolean;
}
