// Maç sonu paylaşım kartı: tuvale çizilir, PNG olarak paylaşılır (olmazsa indirilir).

import type { GameState } from '../../../engine/rules.js';
import { tr } from '../i18n';
import { ME, seatName } from './names';

export interface ShareInfo { st: GameState; time: string; daily: string | null }

const URL_TEXT = 'ardaulker.github.io/x-sword/oyun';

function headline({ st }: ShareInfo) {
  const won = st.winner === ME;
  return won ? tr('Kazandın!') : st.solo ? tr('Alındın') : tr('{name} kazandı', { name: seatName(st, st.winner ?? 0) });
}

export function shareText(info: ShareInfo) {
  const { st, time, daily } = info;
  const me = st.seats[ME];
  const head = daily ? tr('X Sword · Günlük {date}', { date: daily }) : 'X Sword';
  return `${head}\n${headline(info)} · ${tr('{n} puan', { n: me.score })} · ${tr('{n} alma', { n: me.takes })} · ${tr('{n} tur', { n: st.round })} · ${time}\n${URL_TEXT}`;
}

async function draw(info: ShareInfo): Promise<HTMLCanvasElement> {
  const { st, time, daily } = info;
  const me = st.seats[ME];
  const W = 720, H = 900;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  try { await document.fonts.ready; } catch { /* yazı tipi yoksa varsayılan */ }
  const font = (w: number, px: number) => `${w} ${px}px Oxanium, Barlow, system-ui, sans-serif`;

  const bg = g.createRadialGradient(W / 2, 0, 40, W / 2, 0, H);
  bg.addColorStop(0, '#1B2760'); bg.addColorStop(0.6, '#0B1026'); bg.addColorStop(1, '#070B1C');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // Logo
  const s = 1.3, ox = W / 2 - 100 * s, oy = 70;
  const P = (x: number, y: number) => [ox + x * s, oy + y * s] as const;
  const poly = (pts: number[][], fill?: string, stroke?: string, lw = 7) => {
    g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw * s; g.lineJoin = 'round'; g.stroke(); }
  };
  poly([[44, 44], [156, 44], [156, 156], [44, 156]], '#0B1026', '#E9F0FF');
  poly([[100, 21], [179, 100], [100, 179], [21, 100]], undefined, '#3BFF8F');
  poly([[86, 66], [114, 66], [134, 86], [134, 114], [114, 134], [86, 134], [66, 114], [66, 86]], '#3BFF8F');
  g.strokeStyle = '#0B1026'; g.lineWidth = 8 * s; g.lineCap = 'round';
  g.beginPath(); g.moveTo(...P(84, 84)); g.lineTo(...P(116, 116)); g.moveTo(...P(116, 84)); g.lineTo(...P(84, 116)); g.stroke();

  g.textAlign = 'center';
  g.fillStyle = '#E9F0FF'; g.font = font(800, 54); g.fillText('X SWORD', W / 2, 360);
  g.fillStyle = '#8FA0D8'; g.font = font(600, 24);
  g.fillText(daily ? tr('Günlük {date}', { date: daily }) : `${st.size}×${st.size}${st.solo ? ' · ' + tr('Tek') : ''}`, W / 2, 400);

  const won = st.winner === ME;
  g.fillStyle = won ? '#3BFF8F' : '#E9F0FF'; g.font = font(800, 64); g.fillText(headline(info), W / 2, 500);

  g.fillStyle = '#FFFFFF'; g.font = font(800, 150); g.fillText(String(me.score), W / 2, 650);
  g.fillStyle = '#8FA0D8'; g.font = font(600, 26); g.fillText(tr('Skor').toUpperCase(), W / 2, 690);

  const stats: [string, string][] = [[String(me.takes), tr('Alma')], [String(st.round), tr('Tur ayakta')], [time, tr('Süre')]];
  stats.forEach(([v, l], i) => {
    const x = W / 2 + (i - 1) * 210;
    g.fillStyle = '#E9F0FF'; g.font = font(800, 40); g.fillText(v, x, 770);
    g.fillStyle = '#8FA0D8'; g.font = font(600, 20); g.fillText(l, x, 800);
  });
  g.fillStyle = '#5A6BA8'; g.font = font(600, 22); g.fillText(URL_TEXT, W / 2, 860);
  return c;
}

// Tarayıcı dosya paylaşımını destekliyorsa paylaşır, yoksa PNG'yi indirir.
export async function shareResult(info: ShareInfo): Promise<'shared' | 'downloaded' | 'copied'> {
  const canvas = await draw(info);
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const text = shareText(info);
  if (blob) {
    const file = new File([blob], 'x-sword.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return 'shared'; } catch { /* vazgeçti: indirmeye düşme */ return 'shared'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'x-sword.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'downloaded'; }
  }
  return 'downloaded';
}
