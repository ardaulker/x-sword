import type { CSSProperties } from 'react';
import type { Mode } from '../../../engine/rules.js';
import { CROSS, DIAMOND_POINTS, PLUS, SQUARE_POINTS } from '../game/look';
import { modeWord } from '../game/names';
import { tr } from '../i18n';

// Mode change: a calm signal that doesn't cover the board. A patterned band sweeps over the board once,
// a short strip on top names the new mode, and the mode bar flips at the same time.
export function ModeOverlay({ mode, round }: { mode: Mode; round: number }) {
  const straight = mode === 'STRAIGHT';
  return (
    <div className="mode-ov" aria-hidden="true">
      <div className="mode-ov-band" style={{ '--band-rot': straight ? '0deg' : '-45deg' } as CSSProperties} />
      <div className="mode-ov-pill">
        <ModeIcon mode={mode} size={22} stroke={9} />
        <b>{modeWord(mode)}</b>
        <span>{tr('ROUND {n}', { n: round })} · {straight ? tr('squares move') : tr('diamonds move')}</span>
      </div>
    </div>
  );
}

export function ModeIcon({ mode, size, stroke }: { mode: Mode; size: number; stroke: number }) {
  const straight = mode === 'STRAIGHT';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flex: 'none', overflow: 'visible' }} aria-hidden="true">
      <polygon points={straight ? SQUARE_POINTS : DIAMOND_POINTS} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
      <path d={straight ? PLUS : CROSS} fill="none" stroke="currentColor" strokeWidth={stroke + 1} strokeLinecap="round" />
    </svg>
  );
}
