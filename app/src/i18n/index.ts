// Translation: the key is the English source sentence itself, so English needs no dictionary.
// Every other language has a dictionary; a missing entry falls back to the English text.
// Variables: {name}. Plural: {n:one|many} (the first form when n is 1). check-i18n.mjs (run by `npm run build`)
// catches missing keys and mismatched variables.

import { createElement, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import trDict from './tr';

export type Lang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt';
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'tr', name: 'Türkçe' }, { code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' }, { code: 'es', name: 'Español' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
];

// Turkish (the launch language) ships in the main bundle; the others load when chosen (each is ~45 kB of text).
type Dict = Record<string, string>;
const DICT: Partial<Record<Lang, Dict>> = { tr: trDict };
const LOADERS: Partial<Record<Lang, () => Promise<{ default: Dict }>>> = {
  de: () => import('./de'), fr: () => import('./fr'), es: () => import('./es'), it: () => import('./it'), pt: () => import('./pt'),
};
async function loadDict(l: Lang) {
  if (DICT[l] || !LOADERS[l]) return;
  try { DICT[l] = (await LOADERS[l]!()).default; } catch { /* offline: English text until it loads */ }
}
const KEY = 'xsword-lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.some(l => l.code === saved)) return saved as Lang;
  } catch { /* private tab */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return LANGS.find(l => l.code === nav)?.code ?? 'en';
}

let lang: Lang = detect();
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;
/** Loads the starting language's dictionary; main.tsx waits for it before the first render. */
export const langReady = () => loadDict(lang);
export function setLang(next: Lang) {
  try { localStorage.setItem(KEY, next); } catch { /* private tab */ }
  void loadDict(next).then(() => {
    lang = next;
    document.documentElement.lang = next;
    listeners.forEach(l => l());
  });
}
export const useLang = () => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, getLang);

export function tr(key: string, params?: Record<string, string | number>): string {
  const text = DICT[lang]?.[key] ?? key;
  if (!params) return text;
  return text
    .replace(/\{(\w+):([^|}]*)\|([^}]*)\}/g, (_, k, one, many) => (Number(params[k]) === 1 ? one : many))
    .replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

// Splits **bold** marked text into <b> elements (rules screen).
export function rich(key: string, params?: Record<string, string | number>): ReactNode[] {
  return tr(key, params).split('**').map((part, i) => (i % 2 ? createElement('b', { key: i }, part) : part));
}
