import { pieceById } from '../../../engine/rules.js';
import type { GameState } from '../../../engine/rules.js';
import type { Banner } from '../game/controller';
import { diamondOf, seatOf } from '../game/look';
import { PieceGlyph } from './PieceGlyph';

// Tahtanın ortasında kısa duyuru: "Oyuncu 2 elendi", "Dış halka çöktü".
export function CenterBanner({ banner, state }: { banner: Banner; state: GameState }) {
  const p = banner.pieceId ? pieceById(state, banner.pieceId) : null;
  return (
    <div className="center-banner" style={{ boxShadow: `inset 0 0 0 1.5px ${banner.color}, 0 16px 40px rgba(0,0,0,.55)` }} aria-hidden="true">
      {p && <PieceGlyph kind={p.kind} seat={seatOf(p)} size={32} diamond={diamondOf(p, state.mode)} grey />}
      <div className="center-banner-text">
        <span style={{ color: banner.color }}>{banner.title}</span>
        <span>{banner.sub}</span>
      </div>
    </div>
  );
}
