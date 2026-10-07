// Telefonlar arası mesajlar. Odayı kuran telefon (host) maçı yürütür; misafirler yalnız niyet gönderir.
// Motor tohumla çalıştığı için herkes aynı başlangıçla aynı tahtayı kurar, sonra hamleler sırayla akar.

import type { Level, Move } from '../../../engine/rules.js';

export type SeatKind = 'host' | 'guest' | 'bot' | 'empty';

export interface LobbySeat {
  kind: SeatKind;
  ready: boolean;
}

// Maçın başlangıcı: herkes createGame'i bununla çağırır.
export interface MatchStart {
  seed: number;
  seats: { kind: 'human' | 'bot'; level?: Level }[];
  level: Level;
  moveSeconds: number;
  size: number;      // tahta kenarı
  neutrals: number;  // arena botu sayısı
  personas?: boolean;  // yapay zekâ rakiplere kişilik
  obstacles?: boolean; // engel kareleri
  teams?: boolean;     // 2'ye 2 (yalnız 4 oyuncu)
}

// Lobide kurucunun seçtiği, varsayılanı kapalı seçenekler.
export interface LobbyOpts { personas: boolean; obstacles: boolean; teams: boolean }

export type ToHost =
  | { t: 'hello'; token?: string }
  | { t: 'bye' }
  | { t: 'ready'; ready: boolean }
  | { t: 'move'; move: Move | null };

export type ToGuest =
  | { t: 'lobby'; code: string; you: number; seats: LobbySeat[]; level: Level; size: number; bots: number | null; opts?: LobbyOpts }
  | { t: 'start'; match: MatchStart; you: number }
  // n: maçtaki kaçıncı hamle (1'den başlar). Misafir sırayı kaçırırsa baştan eşitlenir.
  | { t: 'move'; n: number; move: Move | null }
  | { t: 'sync'; match: MatchStart; you: number; moves: (Move | null)[] }
  | { t: 'closed'; reason: string };

// Oda kodu: 5 karakter, karışan 0/O ve 1/I yok.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
export const isCode = (s: string) => /^[A-HJ-NP-Z2-9]{5}$/.test(s);
