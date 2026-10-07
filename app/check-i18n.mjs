// Collects every tr('...') / rich('...') key in the code and fails if another language's dictionary has missing
// or extra keys, or if the {variable} names don't match. `node check-i18n.mjs --dump` prints the key list.
// English is the source language: the keys are English, so there is no English dictionary.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const src = walk('src').filter(f => /\.(tsx?|ts)$/.test(f) && !f.includes('/i18n/'));
const keys = new Set();
const re = /\b(?:tr|rich)\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
for (const f of src) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(re)) keys.add((m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"'));
}
// Names that come from the engine and are translated indirectly through tr(BONUS_NAMES[k]).
for (const k of ['Armor', 'Double step', 'Double move', 'Mirror']) keys.add(k);
if (process.argv.includes('--dump')) { console.log(JSON.stringify([...keys], null, 1)); process.exit(0); }

const vars = s => [...new Set([...s.matchAll(/\{(\w+)(?::[^}]*)?\}/g)].map(m => m[1]))].sort().join(',');
let bad = 0;
for (const lang of ['tr', 'de', 'fr', 'es', 'it', 'pt']) {
  const text = readFileSync(`src/i18n/${lang}.ts`, 'utf8');
  const dict = {};
  for (const m of text.matchAll(/^\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"):\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"),?\s*$/gm)) {
    const k = (m[1] ?? m[2]).replace(/\\'/g, "'"), v = (m[3] ?? m[4]).replace(/\\'/g, "'");
    dict[k] = v;
  }
  const missing = [...keys].filter(k => !(k in dict));
  const extra = Object.keys(dict).filter(k => !keys.has(k));
  const mismatch = Object.keys(dict).filter(k => keys.has(k) && vars(k) !== vars(dict[k]));
  if (missing.length || extra.length || mismatch.length) {
    bad++;
    console.error(`✗ ${lang}: ${missing.length} missing, ${extra.length} extra, ${mismatch.length} variable mismatches`);
    missing.slice(0, 8).forEach(k => console.error(`   missing: ${k}`));
    extra.slice(0, 4).forEach(k => console.error(`   extra: ${k}`));
    mismatch.slice(0, 6).forEach(k => console.error(`   variable: ${k}`));
  }
}
if (bad) process.exit(1);
console.log(`Translations OK: ${keys.size} keys, 6 languages.`);
