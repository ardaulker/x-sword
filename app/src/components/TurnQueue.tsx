import type { CSSProperties } from 'react';
import { pieceById } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { PLAYER_COLORS, alpha, colorOf, diamondOf, isBot, seatOf } from '../game/look';
import { ME, labelOf } from '../game/names';
import { orderNo, previous, upcoming } from '../game/order';
import { PieceGlyph } from './PieceGlyph';

// Üstteki sıra göstergesi: solda şu an oynayan, sağda sıradakiler. Sıra geçince şerit sola kayar.
export function TurnQueue({ ctl, view, compact }: { ctl: GameController; view: View; compact: boolean }) {
  const st = ctl.state;
  const glyph = compact ? 18 : 22, slot = glyph + 8;
  const items = upcoming(st, view, 14);
  const prev = previous(st, view);
  const head = items[0] ? pieceById(st, items[0].id) : null;
  const meNext = head?.kind === 'star' && head.seat === ME && !st.over;
  const mine = meNext && (view.phase === 'sen' || view.phase === 'onizleme');
  const myColor = PLAYER_COLORS[ME];

  // Yerleşim: her taş bir yuva; tur değişince araya "TUR n" ayracı girer.
  const placed: { key: string; x: number; id?: string; round: number; head?: boolean; gone?: boolean }[] = [];
  let x = 5, lastRound = items[0]?.round ?? st.round;
  if (prev) placed.push({ key: `${prev.round}:${prev.id}`, x: -slot, id: prev.id, round: prev.round, gone: true });
  items.forEach((it, i) => {
    if (it.round !== lastRound) {
      placed.push({ key: `tur${it.round}`, x, round: it.round });
      x += slot;
      lastRound = it.round;
    }
    placed.push({ key: `${it.round}:${it.id}`, x, id: it.id, round: it.round, head: i === 0 });
    x += i === 0 ? slot + 6 : slot;
  });

  const caption = st.over ? 'MAÇ BİTTİ' : mine ? 'SENİN SIRAN' : meNext ? 'SIRADA' : 'ŞİMDİ';
  const name = st.over || !head ? '' : mine ? 'Hamleni seç' : labelOf(st, head);
  const nameColor = head && !isBot(head) ? colorOf(head) : undefined;

  return (
    <div
      className={`queue${mine ? ' is-mine' : ''}`}
      style={{ height: compact ? 34 : 40, '--me': myColor, '--me-soft': alpha(myColor, 0.14) } as CSSProperties}
      role="status"
      aria-label={st.over ? 'Maç bitti' : `${caption}: ${head ? labelOf(st, head) : ''}`}
    >
      <div className="queue-now">
        <span className="queue-caption">{caption}</span>
        <span className="queue-name" style={{ color: mine ? myColor : nameColor }}>{name}</span>
      </div>
      <div className="queue-track" aria-hidden="true">
        {placed.map(p => {
          const style: CSSProperties = { transform: `translateX(${p.x}px)`, width: slot };
          if (!p.id) {
            return <div key={p.key} className="queue-item queue-round" style={style}>T{p.round}</div>;
          }
          const piece = pieceById(st, p.id)!;
          return (
            <div key={p.key} className={`queue-item${p.head ? ' is-head' : ''}${p.gone ? ' is-gone' : ''}`} style={style}>
              <PieceGlyph
                kind={piece.kind}
                seat={seatOf(piece)}
                size={glyph}
                diamond={diamondOf(piece, st.mode)}
                style={piece.kind === 'star' && piece.seat === ME ? { filter: `drop-shadow(0 0 3px ${myColor})` } : undefined}
              >
                <span className="queue-no">{orderNo(st, piece.id)}</span>
              </PieceGlyph>
            </div>
          );
        })}
      </div>
    </div>
  );
}
