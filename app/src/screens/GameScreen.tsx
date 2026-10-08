import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentActor, isWinner } from '../../../engine/rules.js';
import type { GameController, Setup, View } from '../game/controller';
import { ICON } from '../game/look';
import { labelOf, modeWord } from '../game/names';
import { ActionPanel } from '../components/ActionPanel';
import { BOARD_PAD, Board, RING_W, boardGap, boardOuter } from '../components/Board';
import { SPEED, settings } from '../game/settings';
import { CompactBar, ModeIndicator, TopBar } from '../components/Header';
import { PlayerStrip } from '../components/PlayerStrip';
import { TurnQueue } from '../components/TurnQueue';
import { BonusSheet, CoachSheet, LeaveSheet, LogSheet, PauseSheet, ResultsSheet, SetupSheet } from '../components/Sheets';
import { useMatchTime } from '../components/bits';
import { RulesScreen } from './RulesScreen';
import { SettingsScreen } from './SettingsScreen';
import { InfoChip } from '../components/InfoChip';
import { Icon } from '../components/bits';
import './GameScreen.css';
import { tr } from '../i18n';

// On a short screen (iPhone SE, or with browser bars showing) the header and mode fold into one row.
const COMPACT_BELOW = 740;
// The panel needs this much room at its tallest (preview + threat chips). The board always leaves it,
// so the board neither grows nor shifts when the panel changes. Centering uses the panel's usual height.
const PANEL_ROOM = { full: 196, compact: 182 };
const PANEL_USUAL = { full: 128, compact: 104 };
const GAP = 6;

function announce(ctl: GameController, view: View) {
  const st = ctl.state;
  if (view.phase === 'over') return isWinner(st, 0) ? tr('You won!') : tr('Match over.');
  if (view.phase === 'mine') return tr('Your turn.');
  if (view.phase === 'bot') return tr('Bots are playing.');
  if (view.phase === 'mode') return tr('New round. Mode {mode}.', { mode: modeWord(st.mode) });
  if (view.phase === 'rival') {
    const a = currentActor(st);
    return a ? tr('{name} is playing.', { name: labelOf(st, a) }) : '';
  }
  return '';
}

// In a multiplayer match: the menu leaves the room; the host can send everyone back to the lobby after the match.
export interface NetActions {
  onLeave: () => void;
  onRematch?: () => void;
}

export function GameScreen({ ctl, onNewGame, onHome, onPuzzles, net }: {
  ctl: GameController; onNewGame: (s: Setup) => void; onHome: () => void; onPuzzles?: () => void; net?: NetActions;
}) {
  const view = useSyncExternalStore(ctl.subscribe, ctl.getSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [rootH, setRootH] = useState(0);
  const [rootW, setRootW] = useState(0);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === rootRef.current) { setRootH(e.contentRect.height); setRootW(e.contentRect.width); }
        else setStage({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(rootRef.current!);
    ro.observe(stageRef.current!);
    return () => ro.disconnect();
  }, []);

  const compact = rootH > 0 && rootH < COMPACT_BELOW;
  // Phone turned sideways (short and wide screen): the board fills the height on the left, info and panel on the right.
  const landscape = rootH > 0 && rootH < 520 && rootW > rootH * 1.2;
  const st = ctl.state;
  const n = st.size;
  // As the arena shrinks, collapsed rings are not drawn and the remaining area grows. It switches after the ring's fall animation.
  const [shown, setShown] = useState(st.ring);
  useEffect(() => {
    if (st.ring <= shown) { if (st.ring < shown) setShown(st.ring); return; }
    if (!(view.fall && view.fall.ring === st.ring - 1)) { setShown(st.ring); return; }
    const id = window.setTimeout(() => setShown(st.ring), 950 * SPEED[settings.speed]);
    return () => clearTimeout(id);
  }, [st.ring]); // eslint-disable-line react-hooks/exhaustive-deps
  const vis = n - 2 * shown, gap = boardGap(vis), rings = shown * RING_W;
  const room = landscape ? 0 : compact ? PANEL_ROOM.compact : PANEL_ROOM.full;
  const usual = landscape ? 0 : compact ? PANEL_USUAL.compact : PANEL_USUAL.full;
  const availW = stage.w - 12, availH = stage.h - room - (landscape ? 0 : GAP);
  const fitK = (a: number, k: number, g: number, pad: number) => Math.floor((a - 2 * BOARD_PAD - 2 * pad - g * (k - 1)) / k);
  // The full board's square size is the base; after a shrink squares grow, but in moderation: at most 1.7× and 64 px (a bigger base stays).
  const base = Math.max(14, Math.min(fitK(availW, n, boardGap(n), 0), fitK(availH, n, boardGap(n), 0)));
  const cell = Math.max(14, Math.min(fitK(availW, vis, gap, rings), fitK(availH, vis, gap, rings), Math.round(base * 1.7), Math.max(base, 64)));
  const outer = boardOuter(vis, cell) + 2 * rings;
  const boardTop = Math.max(0, Math.min(availH - outer, Math.floor((stage.h - usual - (landscape ? 0 : GAP) - outer) / 2)));

  // Zoom on big boards (13×13 and up): squares become at least 34 px, the board scrolls and centers on your piece.
  const [zoom, setZoom] = useState(false);
  const canZoom = vis >= 13 && !st.puzzle;
  const zoomed = canZoom && zoom;
  const cellZ = zoomed ? Math.max(cell, 34) : cell;
  const areaRef = useRef<HTMLDivElement>(null);
  const myTurnNow = view.phase === 'mine';
  useEffect(() => {
    const a = areaRef.current;
    if (!a || !zoomed) return;
    const me = ctl.myStar(), g = gap;
    a.scrollTo({
      left: rings + BOARD_PAD + (me.c - shown) * (cellZ + g) + cellZ / 2 - a.clientWidth / 2,
      top: rings + BOARD_PAD + (me.r - shown) * (cellZ + g) + cellZ / 2 - a.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [zoomed, cellZ, myTurnNow, ctl, gap, shown, rings]);

  const sheet = view.sheet;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sub, setSub] = useState<null | 'new' | 'settings'>(null);
  const matchTime = useMatchTime(view.clockStart, view.clockEnd);
  const goPuzzle = (id: number) => onNewGame({ ...ctl.setup, puzzle: id });
  const bars = (
    <>
      {compact ? <CompactBar ctl={ctl} view={view} /> : (
        <>
          <TopBar ctl={ctl} view={view} />
          <ModeIndicator mode={st.mode} showSub={ctl.autoMap || !!st.puzzle} />
        </>
      )}
      <TurnQueue ctl={ctl} view={view} compact={compact} />
      <PlayerStrip ctl={ctl} view={view} compact={compact} />
    </>
  );
  const stageEl = (
    <div key="stage" ref={stageRef} className="stage">
      <div className="board-area" style={{ paddingTop: zoomed ? 0 : boardTop }}>
        {stage.w > 0 && (zoomed
          ? <div ref={areaRef} className="board-scroll"><Board ctl={ctl} view={view} cell={cellZ} offset={shown} /></div>
          : <Board ctl={ctl} view={view} cell={cell} offset={shown} />)}
        {canZoom && (
          <button type="button" className="zoom-btn" aria-pressed={zoomed} aria-label={zoomed ? tr('Zoom out') : tr('Zoom in')} onClick={() => setZoom(z => !z)}>
            <Icon d={zoomed ? 'M10 4 A6 6 0 1 0 10.01 4 Z M15 15 L20 20 M7.5 10 H12.5' : 'M10 4 A6 6 0 1 0 10.01 4 Z M15 15 L20 20 M7.5 10 H12.5 M10 7.5 V12.5'} size={20} stroke={2.2} />
          </button>
        )}
        {view.inspect && <InfoChip ctl={ctl} id={view.inspect} />}
        {view.toast && (
          <div key={view.toast.key} className="toast" role="status">
            <Icon d={view.toast.icon === 'clock' ? ICON.clock : view.toast.icon === 'info' ? ICON.info : view.toast.icon === 'ring' ? ICON.warn : ICON.sword} size={16} stroke={2.2} color="#0B1026" />
            <span>{view.toast.text}</span>
          </div>
        )}
      </div>
      {!landscape && <ActionPanel ctl={ctl} view={view} net={net} onPuzzle={goPuzzle} />}
    </div>
  );
  return (
    <div ref={rootRef} className={`game${compact ? ' is-compact' : ''}${landscape ? ' is-landscape' : ''}`}>
      {landscape
        ? [stageEl, <div key="side" className="land-side">{bars}<ActionPanel ctl={ctl} view={view} net={net} onPuzzle={goPuzzle} /></div>]
        : [<Fragment key="bars">{bars}</Fragment>, stageEl]}

      {sheet?.type === 'coach' && <CoachSheet step={sheet.step} onDone={() => ctl.closeCoach()} />}
      {sheet?.type === 'log' && <LogSheet ctl={ctl} events={view.events} />}
      {sheet?.type === 'bonus' && <BonusSheet ctl={ctl} />}
      {sheet?.type === 'results' && (
        <ResultsSheet
          ctl={ctl} time={matchTime} onClose={() => ctl.closeSheet()}
          onAgain={net ? net.onRematch : () => ctl.newGame()} againLabel={net ? tr('Back to lobby') : tr('Rematch')}
          onPuzzle={id => (id == null ? onPuzzles?.() : onNewGame({ ...ctl.setup, puzzle: id }))}
        />
      )}
      {sheet?.type === 'menu' && !net && (sub === 'new'
        ? <SetupSheet setup={ctl.setup} onStart={s => { setSub(null); onNewGame(s); }} onClose={() => setSub(null)} />
        : <PauseSheet onResume={() => ctl.closeSheet()} onNew={() => setSub('new')} onRestart={() => ctl.restart()} onSettings={() => setSub('settings')}
          onHome={onHome} onEnd={ctl.state.decided && !ctl.state.over ? () => ctl.endNow() : undefined} />)}
      {sheet?.type === 'menu' && !net && sub === 'settings' && (
        <div className="rules-overlay"><SettingsScreen inGame onBack={() => setSub(null)} onRules={() => setRulesOpen(true)} /></div>
      )}
      {rulesOpen && <div className="rules-overlay"><RulesScreen onBack={() => setRulesOpen(false)} /></div>}
      {sheet?.type === 'menu' && net && <LeaveSheet onLeave={net.onLeave} onClose={() => ctl.closeSheet()} />}

      {view.hit > 0 && <div key={view.hit} className="hit-flash" aria-hidden="true" />}
      <div className="sr-only" aria-live="polite">{announce(ctl, view)}</div>
    </div>
  );
}
