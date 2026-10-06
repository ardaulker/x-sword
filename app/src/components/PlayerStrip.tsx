import { currentActor, starOf } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { PLAYER_COLORS, TXT2, alpha, diamondOf } from '../game/look';
import { ME, seatName } from '../game/names';
import { PieceGlyph } from './PieceGlyph';

// Oyuncu şeridi: amblemli taş, ad, alma sayısı ya da kalan süre ya da sıra.
export function PlayerStrip({ ctl, view, compact }: { ctl: GameController; view: View; compact: boolean }) {
  const st = ctl.state;
  const four = st.seats.length >= 4;
  const narrow = st.seats.length >= 3 || st.solo; // 3 kutu varken "Oynuyor ·" sığmaz
  const actor = view.phase === 'bitti' ? null : currentActor(st);
  const timed = view.phase === 'sen' || view.phase === 'onizleme' || view.phase === 'rakip';
  return (
    <div className="strip">
      {st.seats.map(seat => {
        const star = starOf(st, seat.index)!;
        const color = PLAYER_COLORS[seat.index];
        const active = timed && actor?.kind === 'star' && actor.seat === seat.index;
        const place = st.seats.length - st.outOrder.indexOf(seat.index);
        const base = star.alive ? `${seat.takes} alma` : st.solo ? 'alındı' : `${place}. · elendi`;
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
      {st.solo && <SoloItems ctl={ctl} compact={compact} />}
    </div>
  );
}

// Tek oyunculu modda şeritte İkiz ve kalan rakip sayısı da durur: kazanmak için hepsi gitmeli.
function SoloItems({ ctl, compact }: { ctl: GameController; compact: boolean }) {
  const st = ctl.state;
  const twin = st.pieces.find(p => p.kind === 'twin');
  const left = st.pieces.filter(p => p.alive && p.kind !== 'star').length;
  const style = { height: compact ? 40 : 48, gap: 8, padding: '0 10px', border: '1.5px solid #232D5E' };
  return (
    <>
      {twin && (
        <div className={`strip-item${twin.alive ? '' : ' is-out'}`} style={style}>
          <PieceGlyph kind="twin" seat={0} size={26} diamond={diamondOf(twin, st.mode)} grey={!twin.alive} />
          <div className="strip-text">
            <span className="strip-name" style={{ fontSize: 13 }}>İkiz</span>
            <span className="strip-sub" style={{ color: TXT2 }}>{twin.alive ? 'Aynan' : 'alındı'}</span>
          </div>
        </div>
      )}
      <div className="strip-item" style={style} aria-label={`${left} rakip kaldı`}>
        <svg width="26" height="26" viewBox="0 0 100 100" style={{ flex: 'none' }} aria-hidden="true">
          <rect x="12" y="12" width="44" height="44" rx="5" fill="#D3765B" />
          <path d="M24 24 L44 44 M44 24 L24 44" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
          <polygon points="66,44 92,70 66,96 40,70" fill="#6F98DA" />
          <path d="M66 58 V82 M54 70 H78" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
        </svg>
        <div className="strip-text">
          <span className="strip-name" style={{ fontSize: 13 }}>{left} rakip</span>
          <span className="strip-sub" style={{ color: TXT2 }}>kaldı</span>
        </div>
      </div>
    </>
  );
}
