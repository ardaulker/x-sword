// Çeviri: anahtar Türkçe cümlenin kendisidir. Türkçede sözlük gerekmez; öteki dillerde sözlükte yoksa Türkçe görünür.
// Değişken: {ad}. Çoğul: {n:tek|çoğul} (n 1 ise ilki). Eksik anahtarı `npm run build` içindeki check-i18n.mjs yakalar.

import { createElement, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import en from './en';
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

const DICT: Partial<Record<Lang, Record<string, string>>> = { en, de, fr, es, it, pt };
const KEY = 'xsword-lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.some(l => l.code === saved)) return saved as Lang;
  } catch { /* gizli sekme */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return LANGS.find(l => l.code === nav)?.code ?? 'en';
}

let lang: Lang = detect();
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;
export function setLang(next: Lang) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* gizli sekme */ }
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

// **kalın** işaretli metni <b> ile böler (kurallar ekranı).
export function rich(key: string, params?: Record<string, string | number>): ReactNode[] {
  return tr(key, params).split('**').map((part, i) => (i % 2 ? createElement('b', { key: i }, part) : part));
}
