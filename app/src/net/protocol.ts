// Messages between phones. The phone that created the room (host) runs the match; guests only send intents.
// Since the engine is seeded, everyone builds the same board from the same start, then the moves flow in order.

import type { Level, Move } from '../../../engine/rules.js';
import type { PublicProfile } from '../game/profile';

export type SeatKind = 'host' | 'guest' | 'bot' | 'empty';

export interface LobbySeat {
  kind: SeatKind;
  ready: boolean;
  name?: string;   // the player's profile name (none for AI)
  color?: number;  // profile color (index into AVATAR_COLORS)
}

// The start of a match: everyone calls createGame with this.
export interface MatchStart {
  seed: number;
  seats: { kind: 'human' | 'bot'; level?: Level }[];
  level: Level;
  moveSeconds: number;
  size: number;      // board side
  neutrals: number;  // arena bot count
  personas?: boolean;  // personalities for AI rivals
  obstacles?: boolean; // obstacle squares
  teams?: boolean;     // 2 vs 2 (4 players only)
  names?: (string | null)[]; // profile names in match seat order (null for AI)
}

// Options chosen by the host in the lobby, off by default.
export interface LobbyOpts { personas: boolean; obstacles: boolean; teams: boolean }

export type ToHost =
  | { t: 'hello'; token?: string; profile?: PublicProfile }
  | { t: 'bye' }
  | { t: 'ready'; ready: boolean }
  | { t: 'move'; move: Move | null };

export type ToGuest =
  | { t: 'lobby'; code: string; you: number; seats: LobbySeat[]; level: Level; size: number; bots: number | null; opts?: LobbyOpts }
  | { t: 'start'; match: MatchStart; you: number }
  // n: which move of the match (starting at 1). A guest that falls out of step is resynced from the start.
  | { t: 'move'; n: number; move: Move | null }
  | { t: 'sync'; match: MatchStart; you: number; moves: (Move | null)[] }
  | { t: 'closed'; reason: string };

// Room code: 5 characters, without the confusable 0/O and 1/I.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
export const isCode = (s: string) => /^[A-HJ-NP-Z2-9]{5}$/.test(s);
