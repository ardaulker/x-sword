// Player profile: display name, color, a permanent id and the linked account.
// On the web it is a guest profile kept on the device. In the phone app (Capacitor shell) it links automatically
// to Game Center on iOS and Google Play Games on Android (game/platform.ts); the identity is then tied to that account.
// The profile never goes to a server; in multiplayer only the name and color are sent to opponents.

import { useSyncExternalStore } from 'react';
import { tr } from '../i18n';

export type Provider = 'guest' | 'gamecenter' | 'playgames';

export interface Profile {
  v: 1;
  id: string;                 // permanent id on this device (random)
  name: string;               // display name (at most NAME_MAX characters)
  color: number;              // index into AVATAR_COLORS
  provider: Provider;         // guest or a linked platform account
  providerId: string | null;  // the platform's player id (Game Center gamePlayerID / Play Games playerId)
  providerName: string | null;
  createdAt: number;
}

export const AVATAR_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF', '#5CC8FF', '#FF8A3D'];
export const NAME_MAX = 16;

const KEY = 'xsword-profile';

const newId = () => {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
};

// Name cleanup: the same rule for local names and names from opponents (spaces collapse, control characters go).
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export const defaultName = () => `${tr('Sword')} ${100 + Math.floor(Math.random() * 900)}`;

function load(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null;
    if (p && p.v === 1 && p.id && cleanName(p.name)) return { ...p, name: cleanName(p.name), color: Math.abs(p.color | 0) % AVATAR_COLORS.length };
  } catch { /* broken save: make a new one */ }
  const fresh: Profile = {
    v: 1, id: newId(), name: defaultName(), color: Math.floor(Math.random() * AVATAR_COLORS.length),
    provider: 'guest', providerId: null, providerName: null, createdAt: Date.now(),
  };
  save(fresh);
  return fresh;
}

function save(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private tab */ }
}

let current: Profile | null = null;
const listeners = new Set<() => void>();

export function getProfile(): Profile {
  if (!current) current = load();
  return current;
}

export function updateProfile(patch: Partial<Omit<Profile, 'v' | 'id' | 'createdAt'>>) {
  const next = { ...getProfile(), ...patch };
  next.name = cleanName(next.name) || getProfile().name;
  current = next;
  save(next);
  listeners.forEach(fn => fn());
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useProfile = () => useSyncExternalStore(subscribe, getProfile);

// The short card sent to opponents: name and color only (no id, no account details).
export interface PublicProfile { name: string; color: number }
export const publicProfile = (): PublicProfile => ({ name: getProfile().name, color: getProfile().color });
export function readPublic(raw: unknown): PublicProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = cleanName(r.name);
  if (!name) return null;
  const color = typeof r.color === 'number' ? Math.abs(r.color | 0) % AVATAR_COLORS.length : 0;
  return { name, color };
}

export const providerLabel = (p: Provider) =>
  p === 'gamecenter' ? 'Game Center' : p === 'playgames' ? 'Google Play Games' : tr('Guest (this device)');
