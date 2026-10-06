import { currentActor, starOf } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { PLAYER_COLORS, TXT2, alpha, diamondOf } from '../game/look';
import { ME, seatName } from '../game/names';
import { PieceGlyph } from './PieceGlyph';

// Oyuncu şeridi: amblemli taş, ad, alma sayısı ya da kalan süre ya da sıra.
export function PlayerStrip({ ctl, view, compact }: { ctl: GameController; view: View; compact: boolean }) {
  const st = ctl.state;
  const four = st.seats.length >= 4;
  const narrow = st.seats.length >= 3; // 3 ve 4 kişide "Oynuyor ·" sığmaz
  const actor = view.phase === 'bitti' ? null : currentActor(st);
  const timed = view.phase === 'sen' || view.phase === 'onizleme' || view.phase === 'rakip';
  return (
    <div className="strip">
      {st.seats.map(seat => {
        const star = starOf(st, seat.index)!;
        const color = PLAYER_COLORS[seat.index];
        const active = timed && actor?.kind === 'star' && actor.seat === seat.index;
        const place = st.seats.length - st.outOrder.indexOf(seat.index);
        const base = star.alive ? `${seat.takes} alma` : `${place}. · elendi`;
        let sub = seat.index === ME && star.alive && !four ? `Sen · ${base}` : base;
        let subColor = TXT2;
        if (active) {
          sub = narrow ? `${view.timer} sn` : `Oynuyor · ${view.timer} sn`;
          subColor = color;
        }
        const border = active ? color : seat.index === ME ? '#3A4785' : '#232D5E';
        return (
          <div
            key={seat.index}
            className={`strip-item${star.alive ? '' : ' is-out'}`}
            style={{
              height: compact ? 40 : 48, gap: four ? 5 : 8, padding: `0 ${four ? 5 : 10}px`,
              border: `1.5px solid ${border}`, boxShadow: active ? `0 0 0 3px ${alpha(color, 0.2)}` : undefined,
            }}
          >
            <PieceGlyph kind="star" seat={seat.index} size={four ? 22 : 26} diamond={diamondOf(star, st.mode)} grey={!star.alive} />
            <div className="strip-text">
              <span className="strip-name" style={{ fontSize: four ? 11 : 13 }}>{seatName(st, seat.index)}</span>
              <span className="strip-sub" style={{ color: subColor }}>{sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
