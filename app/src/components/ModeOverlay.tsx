import type { CSSProperties } from 'react';
import type { Mode } from '../../../engine/rules.js';
import { CROSS, DIAMOND_POINTS, PLUS, SQUARE_POINTS } from '../game/look';
import { modeWord } from '../game/names';
import { tr } from '../i18n';

// Mod değişimi: tahtayı kapatmayan sakin bir işaret. Desenli bant tahtanın üstünden bir kez geçer,
// üstte kısa bir şerit yeni modu söyler; mod çubuğu da aynı anda döner.
export function ModeOverlay({ mode, round }: { mode: Mode; round: number }) {
  const duz = mode === 'STRAIGHT';
  return (
    <div className="mode-ov" aria-hidden="true">
      <div className="mode-ov-band" style={{ '--band-rot': duz ? '0deg' : '-45deg' } as CSSProperties} />
      <div className="mode-ov-pill">
        <ModeIcon mode={mode} size={22} stroke={9} />
        <b>{modeWord(mode)}</b>
        <span>{tr('ROUND {n}', { n: round })} · {duz ? tr('squares move') : tr('diamonds move')}</span>
      </div>
    </div>
  );
}

export function ModeIcon({ mode, size, stroke }: { mode: Mode; size: number; stroke: number }) {
  const duz = mode === 'STRAIGHT';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flex: 'none', overflow: 'visible' }} aria-hidden="true">
      <polygon points={duz ? SQUARE_POINTS : DIAMOND_POINTS} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
      <path d={duz ? PLUS : CROSS} fill="none" stroke="currentColor" strokeWidth={stroke + 1} strokeLinecap="round" />
    </svg>
  );
}
