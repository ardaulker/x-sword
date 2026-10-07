// Translation: the key is the English source sentence itself, so English needs no dictionary.
// Every other language has a dictionary; a missing entry falls back to the English text.
// Variables: {name}. Plural: {n:one|many} (the first form when n is 1). check-i18n.mjs (run by `npm run build`)
// catches missing keys and mismatched variables.

import { createElement, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import trDict from './tr';
import de from './de';
import fr from './fr';
import es from './es';
import it from './it';
import pt from './pt';

export type Lang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt';
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'tr', name: 'Türkçe' }, { code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' }, { code: 'es', name: 'Español' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
];

const DICT: Partial<Record<Lang, Record<string, string>>> = { tr: trDict, de, fr, es, it, pt };
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
export function setLang(next: Lang) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* private tab */ }
  document.documentElement.lang = next;
  listeners.forEach(l => l());
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
