// Turns app/src/legal/{en,tr}.json into static pages for the app stores' "privacy policy URL" fields.
// Run after the build:  node tools/make-legal-pages.mjs [outDir]   (default app/dist/legal)
// Output: <id>.html (English) and <id>-tr.html (Turkish) for every document, plus index.html and index-tr.html.
// It also checks that both languages have the same ids and the same number of sections and paragraphs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(readFileSync(join(root, 'app/src/legal', f), 'utf8'));
const docs = { en: read('en.json'), tr: read('tr.json') };
const config = read('config.json');
const out = process.argv[2] ?? join(root, 'app/dist/legal');

let bad = 0;
if (JSON.stringify(docs.en.map(d => d.id)) !== JSON.stringify(docs.tr.map(d => d.id))) { console.error('✗ legal: en and tr have different documents'); bad++; }
docs.en.forEach((d, i) => {
  const t = docs.tr[i];
  if (!t || d.sections.length !== t.sections.length || d.sections.some((s, j) => s.p.length !== t.sections[j].p.length)) { console.error(`✗ legal: "${d.id}" differs in sections or paragraphs between en and tr`); bad++; }
});
if (bad) process.exit(1);

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = s => esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>');
const UI = {
  en: { home: 'X Sword', all: 'All documents', updated: 'Last updated', contact: 'Contact', other: 'Türkçe', lang: 'en' },
  tr: { home: 'X Sword', all: 'Tüm belgeler', updated: 'Son güncelleme', contact: 'İletişim', other: 'English', lang: 'tr' },
};
const page = (lang, title, body, otherHref) => `<!doctype html>
<html lang="${UI[lang].lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · X Sword</title>
<style>
  body { margin: 0; background: #0B1026; color: #E9F0FF; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 24px 18px 64px; }
  a { color: #3BFF8F; }
  h1 { font-size: 28px; margin: 8px 0 4px; } h2 { font-size: 18px; margin: 28px 0 6px; } p { margin: 0 0 10px; color: #C7D0F0; }
  nav { display: flex; justify-content: space-between; font-size: 14px; } .foot { margin-top: 36px; font-size: 13px; color: #8591BE; }
  ul { padding-left: 18px; } li { margin: 6px 0; } li span { color: #8591BE; }
</style></head><body><main>
<nav><a href="./${lang === 'tr' ? 'index-tr' : 'index'}.html">${UI[lang].home} · ${UI[lang].all}</a><a href="${otherHref}">${UI[lang].other}</a></nav>
${body}
<p class="foot">${UI[lang].updated}: ${config.updated}${config.contactEmail ? ` · ${UI[lang].contact}: <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>` : ''}</p>
</main></body></html>
`;

mkdirSync(out, { recursive: true });
for (const lang of ['en', 'tr']) {
  const suffix = lang === 'tr' ? '-tr' : '';
  const other = lang === 'tr' ? '' : '-tr';
  for (const d of docs[lang]) {
    const body = `<h1>${esc(d.title)}</h1><p>${esc(d.summary)}</p>` + d.sections.map(s => `<h2>${esc(s.h)}</h2>` + s.p.map(t => `<p>${linkify(t)}</p>`).join('')).join('');
    writeFileSync(join(out, `${d.id}${suffix}.html`), page(lang, d.title, body, `./${d.id}${other}.html`));
  }
  const list = `<h1>X Sword</h1><ul>${docs[lang].map(d => `<li><a href="./${d.id}${suffix}.html">${esc(d.title)}</a><br><span>${esc(d.summary)}</span></li>`).join('')}</ul>`;
  writeFileSync(join(out, `index${suffix}.html`), page(lang, UI[lang].all, list, `./index${other}.html`));
}
console.log(`Legal pages: ${docs.en.length} documents × 2 languages → ${out}`);
