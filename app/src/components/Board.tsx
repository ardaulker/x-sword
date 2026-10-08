import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import {
  collapseDue, currentActor, legalMoves, nextCollapseRound, nextMode, pieceAt, pieceById, play, ringOf, threatsFor, twinMove,
} from '../../../engine/rules.js';
import type { Move, Piece } from '../../../engine/rules.js';
import { targetOf } from '../../../engine/bots.js';
import type { GameController, Spot, View } from '../game/controller';
import {
  DANGER, HAZARD, MARK_AIM, MARK_DIAMOND, MARK_SQUARE, PLAYER_COLORS,
  alpha, chamferOf, diamondOf, isBot, notchPath, octClip, octPath, seatOf,
} from '../game/look';
import { attackersOfMe, heatMap } from '../game/threats';
import { labelOf, modeWord } from '../game/names';
import { orderNo, upcoming } from '../game/order';
import { activeSkin, settings } from '../game/settings';
import { SkinFx } from './SkinFx';
import { PieceGlyph } from './PieceGlyph';
import { CenterBanner } from './CenterBanner';
import { ModeOverlay } from './ModeOverlay';
import './Board.css';
import { tr } from '../i18n';

export const BOARD_PAD = 6;
export const boardGap = (n: number) => (n <= 9 ? 3 : 2);
export const boardOuter = (n: number, cell: number) => n * cell + (n - 1) * boardGap(n) + 2 * BOARD_PAD;
// One trace line outside the frame for each collapsed ring (3 px gap + 3 px line).
export const RING_W = 6;
// The newest collapse is innermost and brightest; older ones fade outward (ember colors).
const RING_COLORS = ['#FF8A3D', '#D9733A', '#B35F37', '#8C4B33', '#6E3D2E', '#57322A', '#45291F'];

// Keyboard: arrow keys / WASD in STRAIGHT rounds, Q E Z C / numpad 7 9 1 3 in DIAGONAL rounds.
const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
  w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
  q: [-1, -1], e: [-1, 1], z: [1, -1], c: [1, 1],
  '7': [-1, -1], '9': [-1, 1], '1': [1, -1], '3': [1, 1],
};

interface Reach {
  move: Move;
  attackers: number;
  doomed: boolean;
}

interface Props {
  ctl: GameController;
  view: View;
  cell: number;
  /** Number of outer rings not drawn: collapsed rings are left out and the board grows inward. */
  offset?: number;
}

export function Board({ ctl, view, cell, offset = 0 }: Props) {
  const st = ctl.state;
  const n = st.size, o = offset, vis = n - 2 * o, gap = boardGap(vis), fp = BOARD_PAD, step = cell + gap;
  const inner = vis * cell + (vis - 1) * gap;
  const me = ctl.myStar();
  const myColor = PLAYER_COLORS[me.seat];
  const myTurn = me.alive && (view.phase === 'mine' || view.phase === 'preview');
  const moves = myTurn ? legalMoves(st, me, st.mode, view.bonus).filter(m => !view.bonus || m.bonus) : [];
  const sel = myTurn && view.phase === 'preview' ? view.sel : null;
  const warn = collapseDue(st);
  // One round before: the ring about to collapse gets a thin orange edge.
  const soon = !warn && nextCollapseRound(st) === st.round + 1;
  const mid = (n - 1) / 2;
  const fallDelay = (r: number, c: number) =>
    Math.round(((Math.atan2(r - mid, c - mid) + Math.PI) / (2 * Math.PI)) * 480);
  const k = chamferOf(n);
  const oct = octPath(k, 6);

  // Danger map: on from settings, or by itself in the first two matches.
  const heat = (settings.dangerMap || ctl.autoMap) && me.alive && !st.over ? heatMap(st, me) : null;
  const reach = new Map<string, Reach>();
  for (const m of moves) {
    const t = threatsFor(st, me, m);
    reach.set(`${m.r},${m.c}`, { move: m, attackers: t.attackers.length, doomed: t.doomed });
  }

  // In single player: where the Twin will go after the selected move (your mirror plays your direction).
  const twinGhost = useMemo(() => {
    if (!sel || !st.solo) return null;
    try {
      const c = structuredClone(st);
      play(c, sel);
      const t = currentActor(c);
      if (c.over || !t || t.kind !== 'twin') return null;
      const m = twinMove(c, t);
      return m ? { from: { r: t.r, c: t.c }, to: { r: m.r, c: m.c }, diamond: diamondOf(t, c.mode) } : null;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.r, sel?.c, sel?.bonus, view.version]);

  // ---------------------------------------------------------- lines
  const center = (p: Spot) => ({ x: (p.c - o) * step + cell / 2, y: (p.r - o) * step + cell / 2 });
  const lines: { key: string; style: CSSProperties; trail?: boolean }[] = [];
  const seg = (key: string, a: Spot, b: Spot, kind: 'trail' | 'dash' | 'dot', color: string) => {
    const p = center(a), q = center(b);
    const dx = q.x - p.x, dy = q.y - p.y;
    const h = kind === 'trail' ? Math.max(3, Math.round(cell * 0.16)) : 2.5;
    const background = kind === 'trail'
      ? `linear-gradient(90deg, transparent, ${color})`
      : kind === 'dot'
        ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 7px)`
        : `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)`;
    lines.push({
      key, trail: kind === 'trail',
      style: {
        left: p.x, top: p.y - h / 2, width: Math.hypot(dx, dy), height: h, borderRadius: h,
        transform: `rotate(${Math.atan2(dy, dx)}rad)`, background,
      },
    });
  };

  const threatIds = new Set<string>();
  if (myTurn && view.showThreats) {
    for (const p of attackersOfMe(st, me)) {
      threatIds.add(p.id);
      seg(`t${p.id}`, p, me, 'dash', DANGER);
    }
  }
  if (sel) {
    seg('sel', me, sel, 'dot', myColor);
    for (const p of threatsFor(st, me, sel).attackers) {
      threatIds.add(p.id);
      seg(`s${p.id}`, p, sel, 'dash', DANGER);
    }
  }
  for (const t of view.trails) seg(`tr${t.key}`, t.from, t.to, 'trail', t.color);
  // Last move of everyone who moved this round: where they came from stays as a faint dashed line.
  for (const l of view.lastMoves) {
    const p = pieceById(st, l.id);
    if (l.round !== st.round || !p?.alive || p.r !== l.to.r || p.c !== l.to.c) continue;
    seg(`lm${l.id}`, l.from, l.to, 'dot', alpha(l.color, 0.5));
  }
  if (twinGhost) seg('twin', twinGhost.from, twinGhost.to, 'dot', alpha(myColor, 0.6));

  // Tapped piece: its paths and takes show on the board, a bot's target as a line. Hidden on Hard.
  const showTargets = ctl.setup.level !== 'hard' && settings.targets && !st.puzzle; // bots don't chase in puzzles
  const inspected = view.inspect ? pieceById(st, view.inspect) : null;
  const inspectMoves = new Map<string, Move>();
  if (inspected?.alive && inspected.id !== me.id) {
    for (const m of legalMoves(st, inspected, nextMode(st, inspected))) inspectMoves.set(`${m.r},${m.c}`, m);
    const t = showTargets && isBot(inspected) ? targetOf(st, inspected) : null;
    if (t) seg('target', inspected, t, 'dash', PLAYER_COLORS[t.seat]);
  }

  // ---------------------------------------------------------- pieces
  const myThreats = myTurn ? attackersOfMe(st, me).length : 0;
  // Turn number on every piece: the one moving now is bright, the next 3 half bright.
  const queue = upcoming(st, view, 4);
  const pipState = new Map(queue.map((q, i) => [q.id, i === 0 ? 'now' : 'next']));
  const pinned = view.inspect;

  const haloOf = (p: Piece) => {
    if (!p.alive) return null;
    if (pinned === p.id) return 'pinned';
    if (view.phase === 'bot' && view.bots.currentId === p.id) return 'current';
    if (threatIds.has(p.id)) return 'threat';
    if (warn && ringOf(st, p.r, p.c) === st.ring) return 'ring';
    if (p.id === me.id && myTurn) return 'turn';
    if (p.id === me.id) return 'me'; // your own piece always stands out in a crowd
    return null;
  };

  // ---------------------------------------------------------- shake
  const frameRef = useRef<HTMLDivElement>(null);
  const lastShake = useRef(view.shake);
  useEffect(() => {
    if (view.shake === lastShake.current) return;
    lastShake.current = view.shake;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    frameRef.current?.animate(
      [{ transform: 'translate(0,0)' }, { transform: 'translate(2px,0)' }, { transform: 'translate(-2px,0)' },
        { transform: 'translate(2px,0)' }, { transform: 'translate(0,0)' }],
      { duration: 120, easing: 'ease-out' },
    );
  }, [view.shake]);

  // ---------------------------------------------------------- arena growth
  // When a ring collapses the board draws only the remaining area and grows. The new (bigger) board starts at its
  // old on-screen size and eases into place (FLIP), so nothing jumps.
  const lastFit = useRef({ o, step });
  useLayoutEffect(() => {
    const prev = lastFit.current;
    lastFit.current = { o, step };
    if (o <= prev.o || prev.step === step) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    frameRef.current?.animate(
      [{ transform: `scale(${prev.step / step})`, opacity: 0.85 }, { transform: 'none', opacity: 1 }],
      { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }, [o, step]);

  // ---------------------------------------------------------- touch
  const press = useRef<{ x: number; y: number; timer: number; fired: boolean; moved: boolean } | null>(null);

  const toPoint = (e: PointerEvent) => {
    const rc = frameRef.current!.getBoundingClientRect();
    return { x: e.clientX - rc.left - fp, y: e.clientY - rc.top - fp };
  };
  const distTo = (pt: { x: number; y: number }, s: Spot) => {
    const c = center(s);
    return Math.hypot(pt.x - c.x, pt.y - c.y);
  };
  const pieceNear = (pt: { x: number; y: number }) =>
    st.pieces.find(p => p.alive && distTo(pt, p) < cell * (p.id === me.id ? 0.5 : 0.45)) ?? null;

  const tap = (pt: { x: number; y: number }) => {
    if (view.sheet) ctl.closeSheet();
    if (view.phase === 'bot') return ctl.speedUp();
    if (me.alive && distTo(pt, me) < cell * 0.5) return myTurn ? ctl.toggleThreats() : ctl.inspectPiece(me.id);
    const hit = st.pieces.find(p => p.alive && p.id !== me.id && distTo(pt, p) < cell * 0.45);
    if (hit && !moves.some(m => m.targetId === hit.id)) return ctl.inspectPiece(hit.id);
    if (!myTurn) return ctl.closeInspect();
    // Forgiving taps: the nearest reachable square whose center is within 1.6 steps.
    let best: Move | null = null, bd = Infinity;
    for (const m of moves) {
      const d = distTo(pt, m);
      if (d < bd) { bd = d; best = m; }
    }
    if (best && bd < step * 1.6) ctl.select(best);
    else ctl.cancel();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pt = toPoint(e);
    const p = {
      ...pt, fired: false, moved: false,
      timer: window.setTimeout(() => {
        const hit = pieceNear(pt);
        if (hit && press.current === p) { p.fired = true; ctl.inspectPiece(hit.id); }
      }, 450),
    };
    press.current = p;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const pt = toPoint(e);
    if (Math.hypot(pt.x - p.x, pt.y - p.y) > 10) { p.moved = true; clearTimeout(p.timer); }
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (!p.fired && !p.moved) tap(toPoint(e));
  };
  const onPointerCancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ') {
      if (view.phase === 'bot') { e.preventDefault(); ctl.speedUp(); }
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); ctl.confirm(); return; }
    if (e.key === 'Escape') { ctl.cancel(); ctl.closeSheet(); return; }
    const dir = KEY_DIRS[e.key] ?? KEY_DIRS[e.key.toLowerCase()];
    if (!dir || !myTurn) return;
    e.preventDefault();
    const m = moves.find(x => x.r === me.r + dir[0] && x.c === me.c + dir[1]);
    if (m) ctl.select(m);
  };

  // ---------------------------------------------------------- drawing
  const reach18 = alpha(myColor, 0.18);
  const rows = [];
  for (let r = o; r < n - o; r++) {
    const cells = [];
    for (let c = o; c < n - o; c++) {
      const ring = ringOf(st, r, c);
      const gone = ring < st.ring;
      const doomedRing = !gone && warn && ring === st.ring;
      const soonRing = soon && ring === st.ring;
      const falling = gone && view.fall?.ring === ring;
      const rc = reach.get(`${r},${c}`);
      const im = rc ? undefined : inspectMoves.get(`${r},${c}`);
      let background = (r + c) % 2 ? 'var(--square-2)' : 'var(--square)';
      let frame: { stroke: string; width: number; dash?: string } | null = null;
      let mark: { d: string; fill: string; stroke: string; width: number } | null = null;
      const hole = !!st.holes?.has(r * n + c);
      const wall = !gone && !hole && !!st.blocked?.has(r * n + c);
      if (hole) background = 'transparent';
      else if (gone) { background = 'var(--void)'; frame = { stroke: '#2B3670', width: 4, dash: '6 7' }; }
      else if (wall) {
        // Obstacle: the diagonal stripe pattern with higher contrast and a thick light frame. Can't be entered or jumped with a double step.
        background = 'repeating-linear-gradient(45deg, #42509A 0 5px, #0E1430 5px 10px)';
        frame = { stroke: '#9AA8EC', width: 8 };
      }
      else if (doomedRing) background = 'var(--pat-hazard)';
      if (heat?.has(`${r},${c}`) && !gone && !doomedRing && !wall) background = `radial-gradient(circle at 50% 50%, rgba(255,59,92,.55) 0 6%, transparent 7%), linear-gradient(rgba(255,59,92,.07), rgba(255,59,92,.07)), ${background}`; // a faint dot, so the squares don't read as a second background color
      if (im) {
        // Another piece's path: an ice-colored dashed frame; a piece it can take gets a crosshair, red if that piece is you.
        frame = { stroke: 'rgba(233,240,255,.6)', width: 5, dash: '5 6' };
        mark = im.type === 'take'
          ? { d: MARK_AIM, fill: 'none', stroke: im.targetId === me.id ? DANGER : '#E9F0FF', width: 8 }
          : { d: 'M50 40 A10 10 0 1 1 49.99 40 Z', fill: 'rgba(233,240,255,.75)', stroke: 'none', width: 0 };
      }
      if (rc) {
        const danger = settings.danger && (rc.doomed || rc.attackers > 0);
        background = danger ? 'var(--pat-danger)' : `linear-gradient(${reach18}, ${reach18}), var(--square)`;
        frame = { stroke: myColor, width: 7 };
        mark = rc.move.type === 'swap'
          ? { d: 'M28 40 H72 M62 30 L72 40 L62 50 M72 60 H28 M38 50 L28 60 L38 70', fill: 'none', stroke: '#FFFFFF', width: 7 }
          : rc.move.type === 'take'
          ? { d: MARK_AIM, fill: 'none', stroke: '#FFFFFF', width: 8 }
          : { d: st.mode === 'STRAIGHT' ? MARK_SQUARE : MARK_DIAMOND, fill: myColor, stroke: 'none', width: 0 };
        if (sel && sel.r === r && sel.c === c) frame = { stroke: '#FFFFFF', width: 11 };
      }
      const occupant = pieceAt(st, r, c);
      let label = tr('Row {r}, column {c}', { r: r + 1, c: c + 1 });
      if (occupant) label += `, ${labelOf(st, occupant)}`;
      if (rc) label += rc.move.type === 'take' ? tr(', can be taken') : tr(', reachable');
      if (rc?.attackers) label += tr(', {n} {n:piece|pieces} can take you', { n: rc.attackers });
      if (wall) label += tr(', obstacle');
      if (hole) label = tr('Row {r}, column {c}', { r: r + 1, c: c + 1 }) + tr(', off the map');
      if (gone) label += tr(', collapsed');
      else if (doomedRing) label += tr(', will collapse at the end of the round');
      else if (soonRing) label += tr(', will collapse next round');
      cells.push(
        <div
          key={c}
          role="gridcell"
          aria-label={label}
          aria-selected={sel ? sel.r === r && sel.c === c : undefined}
          className={`cell${doomedRing && !rc ? ' cell-flow' : ''}${soonRing ? ' cell-soon' : ''}${falling ? ' cell-fall' : ''}`}
          style={{ width: cell, height: cell, background, animationDelay: falling ? `${fallDelay(r, c)}ms` : undefined }}
        >
          {(frame || mark) && (
            <svg viewBox="0 0 100 100" aria-hidden="true">
              {frame && <path d={oct} fill="none" stroke={frame.stroke} strokeWidth={frame.width} strokeDasharray={frame.dash} strokeLinejoin="round" strokeLinecap="round" />}
              {mark && <path d={mark.d} fill={mark.fill} stroke={mark.stroke} strokeWidth={mark.width} strokeLinecap="round" />}
            </svg>
          )}
        </div>,
      );
    }
    rows.push(<div key={r} role="row" className="board-row">{cells}</div>);
  }

  const frameStyle: CSSProperties = {
    width: inner + 2 * fp, height: inner + 2 * fp, padding: fp,
    background: st.mode === 'STRAIGHT' ? 'var(--tex-straight)' : 'var(--tex-diagonal)',
    boxShadow: [
      `inset 0 0 0 ${warn ? `2px ${HAZARD}` : '1.5px rgba(233,240,255,.22)'}`,
      '0 18px 40px rgba(0,0,0,.35)',
    ].join(', '),
    margin: o * RING_W,
    cursor: myTurn ? 'pointer' : 'default',
  };
  // Shaped puzzle map: no frame, the board is only its own squares.
  if (st.holes) { frameStyle.background = 'transparent'; frameStyle.boxShadow = 'none'; }

  return (
    <div
      ref={frameRef}
      className="board-frame"
      style={frameStyle}
      role="grid"
      aria-label={tr('Board {n}×{n}, mode {mode}. Pick a square with the arrow keys or Q E Z C, confirm with Enter.', { n, mode: modeWord(st.mode) })}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      onContextMenu={e => e.preventDefault()}
      onKeyDown={onKeyDown}
    >
      <div
        className="board-grid"
        style={{ gridTemplateColumns: `repeat(${vis}, ${cell}px)`, gap, '--clip': octClip(k) } as CSSProperties}
      >
        {rows}
      </div>

      {/* Traces of collapsed rings: smoldering ember lines outside the frame (newest innermost). */}
      {!st.holes && Array.from({ length: o }, (_, i) => {
        const color = RING_COLORS[Math.min(i, RING_COLORS.length - 1)];
        const d = (i + 1) * RING_W;
        return (
          <div key={`ring${i}`} className="ring-trace" aria-hidden="true"
            style={{ inset: -d, borderRadius: 16 + d, borderColor: color, '--ember': color, animationDelay: `${-i * 0.9}s` } as CSSProperties} />
        );
      })}

      <div className="board-layer" style={{ left: fp, top: fp, width: inner, height: inner }} aria-hidden="true">
        {lines.map(l => <div key={l.key} className={`board-line${l.trail ? ' board-trail' : ''}`} style={l.style} />)}

        {view.slashes.map(s => {
          const w = cell * 2.6;
          return (
            <div key={s.key} className={`board-slash${s.big ? ' is-big' : ''}`}
              style={{ left: (s.c - o) * step + cell / 2 - w / 2, top: (s.r - o) * step + cell / 2 - w / 2, width: w, height: w, transform: `rotate(${s.angle}deg)`, ['--slash' as string]: s.color }}>
              <svg viewBox="0 0 120 120">
                <path className="slash-arc" d="M50 4 Q104 60 50 116" pathLength="1" />
                <path className="slash-arc slash-arc-inner" d="M58 20 Q90 60 58 100" pathLength="1" />
                <g className="slash-sword">
                  <path d="M46 54 L104 60 L46 66 Z" className="slash-blade" />
                  <path d="M40 48 V72 M40 60 H24" className="slash-hilt" />
                  <circle cx="21" cy="60" r="3.2" className="slash-pommel" />
                </g>
              </svg>
            </div>
          );
        })}

        {view.bursts.map(b => (
          <div key={b.key} className={`board-burst${b.big ? ' is-big' : ''}`} style={{ left: (b.c - o) * step + cell / 2 - cell, top: (b.r - o) * step + cell / 2 - cell, width: cell * 2, height: cell * 2 }}>
            <svg viewBox="0 0 100 100">
              <path d="M50 0 L57 37 L85 15 L63 43 L100 50 L63 57 L85 85 L57 63 L50 100 L43 63 L15 85 L37 57 L0 50 L37 43 L15 15 L43 37 Z" fill="#FFF6C9" fillOpacity="0.9" stroke={b.color} strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={b.color} strokeWidth="3" strokeDasharray="5 6" />
            </svg>
          </div>
        ))}

        {view.floats.map(f => (
          <div key={f.key} className={`board-float${f.big ? ' is-big' : ''}`} style={{ left: (f.c - o) * step + cell / 2, top: (f.r - o) * step, color: f.color }}>{f.text}</div>
        ))}

        {st.pieces.map(p => {
          const halo = haloOf(p);
          const target = (showTargets || (st.puzzle && p.walks)) && isBot(p) && p.alive ? targetOf(st, p) : null; // hunters in a puzzle always show whom they chase
          const pip = p.alive && !st.over ? pipState.get(p.id) ?? (settings.numbers ? 'idle' : null) : null;
          const badge = p.id === me.id && myThreats ? myThreats : 0;
          return (
            <PieceGlyph
              key={p.id}
              kind={p.kind}
              seat={seatOf(p)}
              size={cell}
              diamond={diamondOf(p, st.mode)}
              className={`board-piece ${isBot(p) ? 'is-bot' : 'is-star'}${p.walks ? ' is-walker' : ''}`}
              style={{
                transform: `translate(${(p.c - o) * step}px, ${(p.r - o) * step}px) scale(${p.alive ? 1 : 0.4})`,
                opacity: p.alive ? 1 : 0,
              }}
              svgExtra={target && <path d={notchPath(p, target)} fill={PLAYER_COLORS[target.seat]} stroke="#0B1026" strokeWidth="4" strokeLinejoin="round" />}
            >
              {p.id === me.id && p.alive && activeSkin !== 'none' && <SkinFx id={activeSkin} />}
              {halo && <div className={`halo halo-${halo}`} style={halo === 'turn' || halo === 'me' ? { borderColor: myColor } : undefined} />}
              {pip && <div className={`pip pip-${pip}`}>{orderNo(st, p.id)}</div>}
              {badge > 0 && <div className="threat-badge">{badge}</div>}
              {p.kind === 'star' && p.alive && st.seats[p.seat].bonuses.armor > 0 && <div className="armor-badge" aria-label={tr('Armored')} />}
            </PieceGlyph>
          );
        })}

        {twinGhost && (
          <PieceGlyph
            kind="twin" seat={me.seat} size={cell} diamond={twinGhost.diamond} className="board-piece twin-ghost"
            style={{ transform: `translate(${(twinGhost.to.c - o) * step}px, ${(twinGhost.to.r - o) * step}px)` }}
          />
        )}

        {sel && (
          <div
            className="board-ghost"
            style={{ width: cell, height: cell, transform: `translate(${(sel.c - o) * step}px, ${(sel.r - o) * step}px)` }}
          >
            <div
              className="pg-shape"
              style={{
                background: alpha(myColor, 0.2), border: `2px dashed ${myColor}`, boxSizing: 'border-box',
                transform: st.mode === 'DIAGONAL' ? 'rotate(45deg) scale(.95)' : 'none',
              }}
            />
          </div>
        )}
      </div>

      {view.modeOverlay && <ModeOverlay mode={st.mode} round={st.round} />}
      {view.banner && <CenterBanner key={view.banner.key} banner={view.banner} state={st} />}
    </div>
  );
}

