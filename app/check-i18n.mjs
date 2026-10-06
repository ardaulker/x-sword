// Koddaki bütün tr('...') / rich('...') anahtarlarını toplar; öteki dillerin sözlüğünde eksik ya da fazla anahtar varsa
// ve {değişken} adları tutmuyorsa hata verir. `node check-i18n.mjs --dump` anahtar listesini yazar.
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
// Motordan gelen ve tr() ile dolaylı çevrilen adlar.
for (const k of ['Zırh', 'Çift adım', 'Çift hamle', 'Ayna']) keys.add(k);
if (process.argv.includes('--dump')) { console.log(JSON.stringify([...keys], null, 1)); process.exit(0); }

const vars = s => [...new Set([...s.matchAll(/\{(\w+)(?::[^}]*)?\}/g)].map(m => m[1]))].sort().join(',');
let bad = 0;
for (const lang of ['en', 'de', 'fr', 'es', 'it', 'pt']) {
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
    console.error(`✗ ${lang}: ${missing.length} eksik, ${extra.length} fazla, ${mismatch.length} değişken uyuşmazlığı`);
    missing.slice(0, 8).forEach(k => console.error(`   eksik: ${k}`));
    extra.slice(0, 4).forEach(k => console.error(`   fazla: ${k}`));
    mismatch.slice(0, 6).forEach(k => console.error(`   değişken: ${k}`));
  }
}
if (bad) process.exit(1);
console.log(`Çeviri tamam: ${keys.size} anahtar, 6 dil.`);
