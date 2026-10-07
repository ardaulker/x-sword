import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentActor, isWinner } from '../../../engine/rules.js';
import type { GameController, Setup, View } from '../game/controller';
import { ICON } from '../game/look';
import { labelOf, modeWord } from '../game/names';
import { ActionPanel } from '../components/ActionPanel';
import { BOARD_PAD, Board, boardGap, boardOuter } from '../components/Board';
import { CompactBar, ModeIndicator, TopBar } from '../components/Header';
import { PlayerStrip } from '../components/PlayerStrip';
import { TurnQueue } from '../components/TurnQueue';
import { CoachSheet, LeaveSheet, LogSheet, PauseSheet, ResultsSheet, SetupSheet } from '../components/Sheets';
import { useMatchTime } from '../components/bits';
import { RulesScreen } from './RulesScreen';
import { SettingsScreen } from './SettingsScreen';
import { InfoChip } from '../components/InfoChip';
import { Icon } from '../components/bits';
import './GameScreen.css';
import { tr } from '../i18n';

// Kısa ekranda (iPhone SE ya da tarayıcı çubukları açıkken) başlık ve mod tek satıra iner.
const COMPACT_BELOW = 740;
// Panel en uzun hâlinde (önizleme + tehdit çipleri) bu kadar yer ister. Tahta bu payı hep bırakır;
// böylece panel değişince tahta ne büyür ne kayar. Ortalama ise panelin olağan boyuna göre yapılır.
const PANEL_ROOM = { full: 196, compact: 182 };
const PANEL_USUAL = { full: 128, compact: 104 };
const GAP = 6;

function announce(ctl: GameController, view: View) {
  const st = ctl.state;
  if (view.phase === 'bitti') return isWinner(st, 0) ? tr('Kazandın!') : tr('Maç bitti.');
  if (view.phase === 'sen') return tr('Senin sıran.');
  if (view.phase === 'bot') return tr('Botlar oynuyor.');
  if (view.phase === 'mod') return tr('Yeni tur. Mod {mode}.', { mode: modeWord(st.mode) });
  if (view.phase === 'rakip') {
    const a = currentActor(st);
    return a ? tr('{name} oynuyor.', { name: labelOf(st, a) }) : '';
  }
  return '';
}

// Çok oyunculu maçta: menü odadan çıkarır; kurucu maç sonunda herkesi lobiye döndürebilir.
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
  // Telefon yan çevrilince (kısa ve geniş ekran): tahta solda tam yükseklikte, bilgi ve panel sağda.
  const landscape = rootH > 0 && rootH < 520 && rootW > rootH * 1.2;
  const st = ctl.state;
  const n = st.size, gap = boardGap(n);
  const room = landscape ? 0 : compact ? PANEL_ROOM.compact : PANEL_ROOM.full;
  const usual = landscape ? 0 : compact ? PANEL_USUAL.compact : PANEL_USUAL.full;
  const availW = stage.w - 12, availH = stage.h - room - (landscape ? 0 : GAP);
  const fit = (a: number) => Math.floor((a - 2 * BOARD_PAD - gap * (n - 1)) / n);
  const cell = Math.max(14, Math.min(fit(availW), fit(availH)));
  const outer = boardOuter(n, cell);
  const boardTop = Math.max(0, Math.min(availH - outer, Math.floor((stage.h - usual - (landscape ? 0 : GAP) - outer) / 2)));

  // Büyük tahtada (13×13 ve üstü) yakınlaştır: kareler en az 34 px olur, tahta kaydırılır ve senin taşına ortalanır.
  const [zoom, setZoom] = useState(false);
  const canZoom = n >= 13 && !st.puzzle;
  const zoomed = canZoom && zoom;
  const cellZ = zoomed ? Math.max(cell, 34) : cell;
  const areaRef = useRef<HTMLDivElement>(null);
  const myTurnNow = view.phase === 'sen';
  useEffect(() => {
    const a = areaRef.current;
    if (!a || !zoomed) return;
    const me = ctl.myStar(), g = boardGap(n);
    a.scrollTo({
      left: BOARD_PAD + me.c * (cellZ + g) + cellZ / 2 - a.clientWidth / 2,
      top: BOARD_PAD + me.r * (cellZ + g) + cellZ / 2 - a.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [zoomed, cellZ, myTurnNow, ctl, n]);

  const sheet = view.sheet;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sub, setSub] = useState<null | 'yeni' | 'ayar'>(null);
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
          ? <div ref={areaRef} className="board-scroll"><Board ctl={ctl} view={view} cell={cellZ} /></div>
          : <Board ctl={ctl} view={view} cell={cell} />)}
        {canZoom && (
          <button type="button" className="zoom-btn" aria-pressed={zoomed} aria-label={zoomed ? tr('Uzaklaştır') : tr('Yakınlaştır')} onClick={() => setZoom(z => !z)}>
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

      {sheet?.type === 'ipucu' && <CoachSheet step={sheet.step} onDone={() => ctl.closeCoach()} />}
      {sheet?.type === 'kayit' && <LogSheet ctl={ctl} events={view.events} />}
      {sheet?.type === 'sonuc' && (
        <ResultsSheet
          ctl={ctl} time={matchTime} onClose={() => ctl.closeSheet()}
          onAgain={net ? net.onRematch : () => ctl.newGame()} againLabel={net ? tr('Lobiye dön') : tr('Rövanş')}
          onPuzzle={id => (id == null ? onPuzzles?.() : onNewGame({ ...ctl.setup, puzzle: id }))}
        />
      )}
      {sheet?.type === 'menu' && !net && (sub === 'yeni'
        ? <SetupSheet setup={ctl.setup} onStart={s => { setSub(null); onNewGame(s); }} onClose={() => setSub(null)} />
        : <PauseSheet onResume={() => ctl.closeSheet()} onNew={() => setSub('yeni')} onRestart={() => ctl.restart()} onSettings={() => setSub('ayar')}
          onHome={onHome} onEnd={ctl.state.decided && !ctl.state.over ? () => ctl.endNow() : undefined} />)}
      {sheet?.type === 'menu' && !net && sub === 'ayar' && (
        <div className="rules-overlay"><SettingsScreen inGame onBack={() => setSub(null)} onRules={() => setRulesOpen(true)} /></div>
      )}
      {rulesOpen && <div className="rules-overlay"><RulesScreen onBack={() => setRulesOpen(false)} /></div>}
      {sheet?.type === 'menu' && net && <LeaveSheet onLeave={net.onLeave} onClose={() => ctl.closeSheet()} />}

      {view.hit > 0 && <div key={view.hit} className="hit-flash" aria-hidden="true" />}
      <div className="sr-only" aria-live="polite">{announce(ctl, view)}</div>
    </div>
  );
}
