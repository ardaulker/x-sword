import { useEffect, useRef, useState } from 'react';
import { currentActor, starOf } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { PLAYER_COLORS, TXT2, alpha, diamondOf } from '../game/look';
import { ME, personaName, seatName } from '../game/names';
import { PieceGlyph } from './PieceGlyph';
import { tr } from '../i18n';

// Score: the number bounces when it grows and a "+N" floats above it.
function Score({ value, size, color }: { value: number; size: number; color: string }) {
  const prev = useRef(value);
  const [pop, setPop] = useState<{ key: number; diff: number } | null>(null);
  useEffect(() => {
    if (value > prev.current) setPop({ key: Date.now(), diff: value - prev.current });
    prev.current = value;
  }, [value]);
  return (
    <span className="score" style={{ fontSize: size }} aria-label={tr('{n} pts', { n: value })}>
      <span key={pop?.key} className={`score-num${pop ? ' is-bump' : ''}`}>{value}</span>
      {pop && <span key={`f${pop.key}`} className="score-float" style={{ color }}>+{pop.diff}</span>}
    </span>
  );
}

// Scoreboard: emblem piece, name, take count and live score. The edge of whoever is moving lights up in their color.
export function PlayerStrip({ ctl, view, compact }: { ctl: GameController; view: View; compact: boolean }) {
  const st = ctl.state;
  const four = st.seats.length >= 4;
  const narrow = st.seats.length >= 3 || st.solo; // in a narrow box the score drops below the name
  const actor = view.phase === 'over' ? null : currentActor(st);
  const timed = view.phase === 'mine' || view.phase === 'preview' || view.phase === 'rival';
  return (
    <div className="strip">
      {st.seats.map(seat => {
        const star = starOf(st, seat.index)!;
        const color = PLAYER_COLORS[seat.index];
        const active = timed && actor?.kind === 'star' && actor.seat === seat.index;
        const sub = star.alive ? tr('{n} {n:take|takes}', { n: seat.takes }) : st.solo ? tr('taken') : tr('out');
        const border = active ? color : seat.index === ME ? '#3A4785' : '#232D5E';
        return (
          <div
            key={seat.index}
            title={personaName(seat.persona) || undefined}
            className={`strip-item${star.alive ? '' : ' is-out'}`}
            style={{
              height: compact ? 40 : 48, gap: four ? 5 : 8, padding: `0 ${four ? 6 : 10}px`,
              border: `1.5px solid ${border}`, boxShadow: active ? `0 0 0 3px ${alpha(color, 0.2)}` : undefined,
            }}
          >
            <PieceGlyph kind="star" seat={seat.index} size={four ? 22 : 26} diamond={diamondOf(star, st.mode)} grey={!star.alive} />
            <div className="strip-text">
              <span className="strip-name" style={{ fontSize: four ? 11 : 13 }}>{seatName(st, seat.index)}{seat.team != null ? ` · ${'AB'[seat.team]}` : ''}</span>
              {narrow
                ? <Score value={seat.score} size={compact ? 14 : 15} color={color} />
                : <span className="strip-sub" style={{ color: TXT2 }}>{seat.index === ME && star.alive ? `${tr('You')} · ${sub}` : sub}</span>}
            </div>
            {!narrow && <Score value={seat.score} size={22} color={color} />}
          </div>
        );
      })}
      {st.solo && <SoloItems ctl={ctl} compact={compact} />}
    </div>
  );
}

// In single-player mode the strip also shows the Twin and the number of rivals left: they must all be gone to win.
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
            <span className="strip-name" style={{ fontSize: 13 }}>{tr('Twin')}</span>
            <span className="strip-sub" style={{ color: TXT2 }}>{twin.alive ? tr('Your mirror') : tr('taken')}</span>
          </div>
        </div>
      )}
      <div className="strip-item" style={style} aria-label={tr('{n} {n:rival|rivals} left', { n: left })}>
        <svg width="26" height="26" viewBox="0 0 100 100" style={{ flex: 'none' }} aria-hidden="true">
          <rect x="12" y="12" width="44" height="44" rx="5" fill="#D3765B" />
          <path d="M24 24 L44 44 M44 24 L24 44" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
          <polygon points="66,44 92,70 66,96 40,70" fill="#6F98DA" />
          <path d="M66 58 V82 M54 70 H78" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
        </svg>
        <div className="strip-text">
          <span className="strip-name" style={{ fontSize: 13 }}>{tr('{n} {n:rival|rivals}', { n: left })}</span>
          <span className="strip-sub" style={{ color: TXT2 }}>{tr('left')}</span>
        </div>
      </div>
    </>
  );
}
