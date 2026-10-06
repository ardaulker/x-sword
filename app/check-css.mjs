// Derlemeden sonra çalışır: kaynak CSS'lerde { ve } sayısı tutmuyorsa, ya da derlenen CSS
// kaynaktaki kural sayısından belirgin azsa hata verir. Vite bozuk CSS'e sessiz kalır.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
const files = [...walk('src').filter(f => f.endsWith('.css')), '../design/tokens/tokens.css'];
let bad = 0, rules = 0;
for (const f of files) {
  const s = strip(readFileSync(f, 'utf8'));
  const o = (s.match(/{/g) ?? []).length, c = (s.match(/}/g) ?? []).length;
  rules += o;
  if (o !== c) { console.error(`✗ ${f}: ${o} "{" ama ${c} "}"`); bad++; }
}
const built = walk('dist/assets').filter(f => f.endsWith('.css')).map(f => strip(readFileSync(f, 'utf8'))).join('');
const out = (built.match(/{/g) ?? []).length;
if (out < rules * 0.6) { console.error(`✗ derlenen CSS'te ${out} blok var, kaynakta ${rules}: bir kısmı atılmış`); bad++; }
if (bad) process.exit(1);
console.log(`CSS tamam: ${files.length} dosya, ${rules} blok, çıktıda ${out}.`);
