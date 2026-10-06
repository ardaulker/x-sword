import type { CSSProperties } from 'react';
import type { Mode } from '../../../engine/rules.js';
import { CROSS, DIAMOND_POINTS, PLUS, SQUARE_POINTS } from '../game/look';
import { modeWord } from '../game/names';

// Mod değişim kartı: desenli bant tahtayı süpürür, kart döner.
export function ModeOverlay({ mode, round }: { mode: Mode; round: number }) {
  const duz = mode === 'DUZ';
  return (
    <div className="mode-ov" aria-hidden="true">
      <div className="mode-ov-band" style={{ '--band-rot': duz ? '0deg' : '-45deg' } as CSSProperties} />
      <div className="mode-ov-card">
        <ModeIcon mode={mode} size={64} stroke={7} />
        <div className="mode-ov-label">{modeWord(mode)}</div>
        <div className="mode-ov-sub">TUR {round} · {duz ? 'KARE GİDER' : 'ELMAS GİDER'}</div>
      </div>
    </div>
  );
}

export function ModeIcon({ mode, size, stroke }: { mode: Mode; size: number; stroke: number }) {
  const duz = mode === 'DUZ';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flex: 'none', overflow: 'visible' }} aria-hidden="true">
      <polygon points={duz ? SQUARE_POINTS : DIAMOND_POINTS} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
      <path d={duz ? PLUS : CROSS} fill="none" stroke="currentColor" strokeWidth={stroke + 1} strokeLinecap="round" />
    </svg>
  );
}
