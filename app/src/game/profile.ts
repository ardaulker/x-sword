// Oyuncu profili: görünen ad, renk, kalıcı kimlik ve bağlı hesap.
// Web'de cihazda saklanan misafir profildir. Telefon uygulamasında (Capacitor kabuğu) iOS'ta Game Center,
// Android'de Google Play Games ile kendiliğinden bağlanır (game/platform.ts); kimlik o zaman hesaba bağlanır.
// Profil sunucuya gitmez; çok oyunculuda yalnız ad ve renk rakiplere gönderilir.

import { useSyncExternalStore } from 'react';
import { tr } from '../i18n';

export type Provider = 'guest' | 'gamecenter' | 'playgames';

export interface Profile {
  v: 1;
  id: string;                 // bu cihazdaki kalıcı kimlik (rastgele)
  name: string;               // görünen ad (en çok NAME_MAX karakter)
  color: number;              // AVATAR_COLORS içindeki sıra
  provider: Provider;         // misafir ya da bağlı platform hesabı
  providerId: string | null;  // platformun oyuncu kimliği (Game Center gamePlayerID / Play Games playerId)
  providerName: string | null;
  createdAt: number;
}

export const AVATAR_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF', '#5CC8FF', '#FF8A3D'];
export const NAME_MAX = 16;

const KEY = 'xsword-profile';

const newId = () => {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
};

// Ad temizliği: yerel ve rakipten gelen adlar için aynı kural (boşluklar sıkışır, denetim karakterleri gider).
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export const defaultName = () => `${tr('Kılıç')} ${100 + Math.floor(Math.random() * 900)}`;

function load(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null;
    if (p && p.v === 1 && p.id && cleanName(p.name)) return { ...p, name: cleanName(p.name), color: Math.abs(p.color | 0) % AVATAR_COLORS.length };
  } catch { /* bozuk kayıt: yenisi */ }
  const fresh: Profile = {
    v: 1, id: newId(), name: defaultName(), color: Math.floor(Math.random() * AVATAR_COLORS.length),
    provider: 'guest', providerId: null, providerName: null, createdAt: Date.now(),
  };
  save(fresh);
  return fresh;
}

function save(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* gizli sekme */ }
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

// Rakibe giden kısa kart: yalnız ad ve renk (kimlik ve hesap bilgisi gitmez).
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
  p === 'gamecenter' ? 'Game Center' : p === 'playgames' ? 'Google Play Games' : tr('Misafir (bu cihaz)');
