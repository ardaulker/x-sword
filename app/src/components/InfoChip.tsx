import { nextMode, pieceById, takeDirs, walkDirs } from '../../../engine/rules.js';
import { targetOf } from '../../../engine/bots.js';
import type { GameController } from '../game/controller';
import { CROSS, DANGER, ICE, ICON, PLAYER_COLORS, PLUS, colorOf, diamondOf, isBot, seatOf } from '../game/look';
import { ME, labelOf, personaName } from '../game/names';
import { orderNo } from '../game/order';
import { attackersOfMe } from '../game/threats';
import { Icon } from './bits';
import { PieceGlyph } from './PieceGlyph';
import { tr } from '../i18n';

// İki küçük simge: yürüyüş yönü (buz) ve alma yönü (kırmızı). + düz, × çapraz.
function WalkTake({ walkStraight, takeStraight }: { walkStraight: boolean; takeStraight: boolean }) {
  const icon = (straight: boolean, color: string) => (
    <svg width="14" height="14" viewBox="0 0 100 100" aria-hidden="true" style={{ verticalAlign: '-2px' }}>
      <path d={straight ? PLUS : CROSS} stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
    </svg>
  );
  return (
    <span className="walk-take">
      {icon(walkStraight, ICE)} {tr('yürür')}
      <span className="walk-take-sep">·</span>
      {icon(takeStraight, DANGER)} {tr('alır')}
    </span>
  );
}

// Dokunulan taş için tek satır: kim, sırası, nasıl yürür ve alır, kimi kovalıyor.
// Büyük kart yok; yollar ve hedef çizgisi zaten tahtada.
export function InfoChip({ ctl, id }: { ctl: GameController; id: string }) {
  const st = ctl.state;
  const p = pieceById(st, id);
  if (!p || !p.alive) return null;
  const me = ctl.myStar();
  const mode = nextMode(st, p);
  const straight = (d: readonly (readonly [number, number])[]) => d[0][0] === 0 || d[0][1] === 0;
  const walk = straight(walkDirs(p, mode)) ? tr('düz') : tr('çapraz');
  const take = straight(takeDirs(p, mode)) ? tr('düz') : tr('çapraz');
  const wStraight = straight(walkDirs(p, mode)), tStraight = straight(takeDirs(p, mode));
  const how = p.kind === 'twin' ? tr('senin yönünde oynar') : walk === take ? tr('{w} gider, {t} alır', { w: walk, t: take }) : tr('{w} yürür, {t} alır', { w: walk, t: take });
  const hard = ctl.setup.level === 'zor';
  const target = isBot(p) && !hard ? targetOf(st, p) : null;
  const danger = me.alive && p.id !== me.id && attackersOfMe(st, me).some(q => q.id === p.id);
  return (
    <button
      type="button"
      className={`info-chip${danger ? ' is-danger' : ''}`}
      onClick={() => ctl.closeInspect()}
      aria-label={tr('{name}, sıra {n}, {how}. Kapat.', { name: labelOf(st, p), n: orderNo(st, p.id), how })}
    >
      <PieceGlyph kind={p.kind} seat={seatOf(p)} size={22} diamond={diamondOf(p, st.mode)} />
      <span className="info-chip-name" style={{ color: isBot(p) ? undefined : colorOf(p) }}>{labelOf(st, p)}</span>
      <span className="info-chip-meta">
        {!isBot(p) && `#${orderNo(st, p.id)} · `}
        {p.kind === 'twin' ? how : <WalkTake walkStraight={wStraight} takeStraight={tStraight} />}
        {p.kind === 'star' && st.seats[p.seat].persona && ` · ${personaName(st.seats[p.seat].persona)}`}
      </span>
      {target && (
        <span className="info-chip-target">
          <Icon d="M5 12 H19 M13 6 L19 12 L13 18" size={14} stroke={2.4} />
          <span style={{ color: PLAYER_COLORS[target.seat] }}>{target.seat === ME ? tr('Sen') : labelOf(st, target)}</span>
        </span>
      )}
      {isBot(p) && hard && <span className="info-chip-meta">{tr('· hedef gizli')}</span>}
      {danger && <Icon d={ICON.warn} size={16} stroke={2.2} />}
    </button>
  );
}
