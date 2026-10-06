import { nextMode, pieceById, takeDirs, walkDirs } from '../../../engine/rules.js';
import { targetOf } from '../../../engine/bots.js';
import type { GameController } from '../game/controller';
import { ICON, PLAYER_COLORS, colorOf, diamondOf, isBot, seatOf } from '../game/look';
import { ME, labelOf } from '../game/names';
import { orderNo } from '../game/order';
import { attackersOfMe } from '../game/threats';
import { Icon } from './bits';
import { PieceGlyph } from './PieceGlyph';

// Dokunulan taş için tek satır: kim, sırası, nasıl yürür ve alır, kimi kovalıyor.
// Büyük kart yok; yollar ve hedef çizgisi zaten tahtada.
export function InfoChip({ ctl, id }: { ctl: GameController; id: string }) {
  const st = ctl.state;
  const p = pieceById(st, id);
  if (!p || !p.alive) return null;
  const me = ctl.myStar();
  const mode = nextMode(st, p);
  const straight = (d: readonly (readonly [number, number])[]) => d[0][0] === 0 || d[0][1] === 0;
  const walk = straight(walkDirs(p, mode)) ? 'düz' : 'çapraz';
  const take = straight(takeDirs(p, mode)) ? 'düz' : 'çapraz';
  const how = p.kind === 'twin' ? 'senin yönünde oynar' : walk === take ? `${walk} gider, ${take} alır` : `${walk} yürür, ${take} alır`;
  const hard = ctl.setup.level === 'zor';
  const target = isBot(p) && !hard ? targetOf(st, p) : null;
  const danger = me.alive && p.id !== me.id && attackersOfMe(st, me).some(q => q.id === p.id);
  return (
    <button
      type="button"
      className={`info-chip${danger ? ' is-danger' : ''}`}
      onClick={() => ctl.closeInspect()}
      aria-label={`${labelOf(st, p)}, sıra ${orderNo(st, p.id)}, ${how}. Kapat.`}
    >
      <PieceGlyph kind={p.kind} seat={seatOf(p)} size={22} diamond={diamondOf(p, st.mode)} />
      <span className="info-chip-name" style={{ color: isBot(p) ? undefined : colorOf(p) }}>{labelOf(st, p)}</span>
      <span className="info-chip-meta">{isBot(p) ? how : `#${orderNo(st, p.id)} · ${how}`}</span>
      {target && (
        <span className="info-chip-target">
          <Icon d="M5 12 H19 M13 6 L19 12 L13 18" size={14} stroke={2.4} />
          <span style={{ color: PLAYER_COLORS[target.seat] }}>{target.seat === ME ? 'Sen' : labelOf(st, target)}</span>
        </span>
      )}
      {isBot(p) && hard && <span className="info-chip-meta">· hedef gizli</span>}
      {danger && <Icon d={ICON.warn} size={16} stroke={2.2} />}
    </button>
  );
}
