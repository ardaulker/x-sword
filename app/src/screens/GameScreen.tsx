import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === rootRef.current) setRootH(e.contentRect.height);
        else setStage({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(rootRef.current!);
    ro.observe(stageRef.current!);
    return () => ro.disconnect();
  }, []);

  const compact = rootH > 0 && rootH < COMPACT_BELOW;
  const st = ctl.state;
  const n = st.size, gap = boardGap(n);
  const room = compact ? PANEL_ROOM.compact : PANEL_ROOM.full;
  const usual = compact ? PANEL_USUAL.compact : PANEL_USUAL.full;
  const availW = stage.w - 12, availH = stage.h - room - GAP;
  const fit = (a: number) => Math.floor((a - 2 * BOARD_PAD - gap * (n - 1)) / n);
  const cell = Math.max(14, Math.min(fit(availW), fit(availH)));
  const outer = boardOuter(n, cell);
  const boardTop = Math.max(0, Math.min(availH - outer, Math.floor((stage.h - usual - GAP - outer) / 2)));

  const sheet = view.sheet;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sub, setSub] = useState<null | 'yeni' | 'ayar'>(null);
  const matchTime = useMatchTime(view.clockStart, view.clockEnd);
  return (
    <div ref={rootRef} className={`game${compact ? ' is-compact' : ''}`}>
      {compact ? <CompactBar ctl={ctl} view={view} /> : (
        <>
          <TopBar ctl={ctl} view={view} />
          <ModeIndicator mode={st.mode} showSub={ctl.autoMap || !!st.puzzle} />
        </>
      )}
      <TurnQueue ctl={ctl} view={view} compact={compact} />
      <PlayerStrip ctl={ctl} view={view} compact={compact} />

      <div ref={stageRef} className="stage">
        <div className="board-area" style={{ paddingTop: boardTop }}>
          {stage.w > 0 && <Board ctl={ctl} view={view} cell={cell} />}
          {view.inspect && <InfoChip ctl={ctl} id={view.inspect} />}
          {view.toast && (
            <div key={view.toast.key} className="toast" role="status">
              <Icon d={view.toast.icon === 'clock' ? ICON.clock : view.toast.icon === 'info' ? ICON.info : view.toast.icon === 'ring' ? ICON.warn : ICON.sword} size={16} stroke={2.2} color="#0B1026" />
              <span>{view.toast.text}</span>
            </div>
          )}
        </div>
        <ActionPanel ctl={ctl} view={view} net={net} />
      </div>

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
