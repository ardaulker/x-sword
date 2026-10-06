import type { CSSProperties, ReactNode } from 'react';
import { BOT_COLORS, PLAYER_COLORS, glyphOf } from '../game/look';

export interface PieceLook {
  kind: 'star' | 'red' | 'blue' | 'twin';
  seat?: number;
}

interface Props extends PieceLook {
  size: number;
  // Yıldız modun yönünde döner: DÜZ kare, ÇAPRAZ elmas. Kızıl hep kare, Çelik hep elmas.
  diamond: boolean;
  grey?: boolean;
  className?: string;
  style?: CSSProperties;
  svgExtra?: ReactNode;
  children?: ReactNode;
}

// Taşın şekli ve iç işareti. Tahtada da, şeritte, çipte ve kayıtta da aynı çizim kullanılır.
export function PieceGlyph({ kind, seat = 0, size, diamond, grey, className, style, svgExtra, children }: Props) {
  const ring = Math.max(1.5, size * 0.06).toFixed(1);
  const star = kind === 'star' || kind === 'twin';
  const color = star ? PLAYER_COLORS[seat] : BOT_COLORS[kind as 'red' | 'blue'];
  const g = glyphOf({ kind, seat });
  return (
    <div className={`pg${grey ? ' pg-grey' : ''}${className ? ` ${className}` : ''}`} style={{ width: size, height: size, ...style }}>
      {children}
      <div
        className="pg-shape"
        style={{
          background: kind === 'twin' ? '#0B1026' : color,
          transform: diamond ? 'rotate(45deg) scale(.95)' : 'rotate(0deg) scale(1)',
          boxShadow: star
            ? `0 0 0 ${ring}px ${kind === 'twin' ? color : '#FFFFFF'}, 0 0 ${Math.round(size * 0.35)}px ${color}AA`
            : `inset 0 0 0 ${ring}px rgba(11,16,38,.30)`,
        }}
      />
      <svg className="pg-svg" viewBox="0 0 100 100" aria-hidden="true">
        <path d={g.d} fill={g.fill} stroke={g.stroke} strokeWidth={g.width} strokeLinecap="round" strokeLinejoin="round" />
        {svgExtra}
      </svg>
    </div>
  );
}
