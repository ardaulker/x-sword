// The public lobby's room board. A host that makes its room public publishes a small "ad" (code, host name and color,
// seats filled, board settings); the lobby screen watches the board and lists the ads. Joining still goes through the
// room code (transport.ts), so the board is only a phone book.
//
// Only `Directory` is known to the rest of the game. There is no internet-wide implementation yet: that needs a service
// that stores the ads (see docs/public-lobby.md). Until one is chosen `directory` is null in the shipped app, the
// lobby shows no room list and rooms are joined by code or invite link. In development a same-browser board
// (BroadcastChannel) stands in, so the whole flow can be tried with two tabs.

import { RULES_VERSION } from '../../../engine/rules.js';
import type { Level } from '../../../engine/rules.js';
import { AVATAR_COLORS, cleanName } from '../game/profile';
import { isCode } from './protocol';

export interface RoomAd {
  code: string;
  host: string;      // the host's display name
  color: number;     // the host's profile color (index into AVATAR_COLORS)
  seats: number;     // seats filled (2–4 when somebody has joined)
  size: number;      // board side
  level: Level;
  personas: boolean;
  obstacles: boolean;
  teams: boolean;
  rules: number;     // rules version of the host's app
}

export interface Directory {
  publish(ad: RoomAd): void;
  withdraw(code: string): void;
  /** Calls back with the current list now and whenever it changes. Returns the stop function. */
  watch(cb: (ads: RoomAd[]) => void): () => void;
}

export const AD_EVERY_MS = 12000; // a host repeats its ad this often
export const AD_TTL_MS = 36000;   // an ad nobody repeated for this long is dropped

const LEVELS: Level[] = ['easy', 'normal', 'hard'];
const num = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);

// Anything that comes from the network is cleaned here; an ad that doesn't make sense is dropped.
export function readAd(raw: unknown): RoomAd | null {
  const a = raw as Partial<Record<keyof RoomAd, unknown>> | null;
  if (!a || typeof a !== 'object' || typeof a.code !== 'string' || !isCode(a.code)) return null;
  const host = cleanName(a.host);
  if (!host) return null;
  const rules = num(a.rules, 1, 99, 1);
  if (rules > RULES_VERSION) return null; // a newer app than this one: it could not follow the match
  return {
    code: a.code, host, color: num(a.color, 0, AVATAR_COLORS.length - 1, 0), seats: num(a.seats, 1, 4, 1), size: [9, 11, 13, 15].includes(a.size as number) ? (a.size as number) : 9,
    level: LEVELS.includes(a.level as Level) ? (a.level as Level) : 'normal', personas: a.personas === true, obstacles: a.obstacles === true, teams: a.teams === true, rules,
  };
}

// ------------------------------------------------------------ same-browser board (development, tests)

type Wire = { t: 'ad'; ad: unknown } | { t: 'gone'; code: string } | { t: 'who' };

function localBoard(): Directory {
  const chan = new BroadcastChannel('xsword-lobby');
  const mine = new Map<string, RoomAd>();       // ads published from this tab
  const seen = new Map<string, { ad: RoomAd; at: number }>();
  const watchers = new Set<(ads: RoomAd[]) => void>();
  const list = () => [...seen.values()].map(v => v.ad);
  const emit = () => watchers.forEach(cb => cb(list()));
  const prune = () => {
    let changed = false;
    for (const [code, v] of seen) if (Date.now() - v.at > AD_TTL_MS) { seen.delete(code); changed = true; }
    if (changed) emit();
  };
  window.setInterval(prune, 2000);
  chan.onmessage = e => {
    const m = e.data as Wire;
    if (m.t === 'ad') { const ad = readAd(m.ad); if (ad) { seen.set(ad.code, { ad, at: Date.now() }); emit(); } }
    else if (m.t === 'gone') { if (seen.delete(m.code)) emit(); }
    else if (m.t === 'who') mine.forEach(ad => chan.postMessage({ t: 'ad', ad } satisfies Wire));
  };
  return {
    publish(ad) { mine.set(ad.code, ad); chan.postMessage({ t: 'ad', ad } satisfies Wire); },
    withdraw(code) { if (mine.delete(code)) chan.postMessage({ t: 'gone', code } satisfies Wire); },
    watch(cb) {
      watchers.add(cb);
      cb(list());
      chan.postMessage({ t: 'who' } satisfies Wire);
      return () => { watchers.delete(cb); };
    },
  };
}

/** The board the app uses; null while there is no internet-wide board (the lobby then has no room list). */
export const directory: Directory | null = import.meta.env.DEV && typeof BroadcastChannel !== 'undefined' ? localBoard() : null;
