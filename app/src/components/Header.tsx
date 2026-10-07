import { collapseDue, nextCollapseRound, starOf } from '../../../engine/rules.js';
import type { GameState, Mode } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { ICON } from '../game/look';
import { ME, modeWord } from '../game/names';
import { Icon, MatchClock, RingIcon, useMatchTime } from './bits';
import { ModeIcon } from './ModeOverlay';
import { tr } from '../i18n';

// Halka çipi. Üst çubukta maç saati de olduğu için yazı kısa tutulur; dar ekranda ve izlerken daha da kısalır.
function ringInfo(st: GameState) {
  if (st.puzzle) {
    const text = tr('Move {a}/{b}', { a: Math.min(st.puzzle.used + 1, st.puzzle.limit), b: st.puzzle.limit });
    return { long: text, short: text, full: text, warn: st.puzzle.used + 1 >= st.puzzle.limit, soon: false };
  }
  const next = nextCollapseRound(st);
  if (next == null) return { long: tr('Arena at its smallest'), short: tr('Smallest'), full: tr("The arena won't shrink any more"), warn: false, soon: false };
  if (next === st.round) return { long: tr('Ring collapsing'), short: tr('Collapsing'), full: tr('The outer ring collapses at the end of this round'), warn: collapseDue(st), soon: false };
  const k = next - st.round;
  const text = tr('Shrink: {k} {k:round|rounds}', { k });
  return { long: text, short: text, full: tr('The outer ring collapses in {k} {k:round|rounds}', { k }), warn: false, soon: k === 1 };
}

const watching = (st: GameState) => !st.over && !starOf(st, ME)?.alive;
const turText = (st: GameState) => `${watching(st) ? tr('SPECTATOR · ') : ''}${tr('ROUND {n}', { n: st.round })}`;

function LogButton({ ctl, view, size }: { ctl: GameController; view: View; size: number }) {
  const n = view.events.length;
  return (
    <button type="button" className="icon-btn" style={{ width: size }} aria-label={tr('Battle log, {n} {n:take|takes}', { n })} onClick={() => ctl.openLog()}>
      <Icon d={ICON.sword} size={size > 40 ? 22 : 20} />
      <span className="icon-cap" aria-hidden="true">{tr('Log')}</span>
      {n > 0 && <span className="icon-badge">{n}</span>}
    </button>
  );
}

function MenuButton({ ctl, size }: { ctl: GameController; size: number }) {
  return (
    <button type="button" className="icon-btn" style={{ width: size }} aria-label={tr('Menu')} onClick={() => ctl.openMenu()}>
      <Icon d={ICON.menu} size={size > 40 ? 22 : 20} />
      <span className="icon-cap" aria-hidden="true">{tr('Menu')}</span>
    </button>
  );
}

// Üst çubuk (390): menü · TUR n + halka çipi + maç saati · savaş kaydı
export function TopBar({ ctl, view }: { ctl: GameController; view: View }) {
  const st = ctl.state;
  const ring = ringInfo(st);
  return (
    <header className="topbar">
      <MenuButton ctl={ctl} size={44} />
      <div className="topbar-mid">
        <span className="topbar-tur">
          {watching(st) && <span className="topbar-eye" aria-label={tr('Spectator')}><Icon d={ICON.eye} size={16} stroke={2.2} /></span>}
          {tr('ROUND {n}', { n: st.round })}
        </span>
        <span className={`ring-chip${ring.warn ? ' is-warn' : ring.soon ? ' is-soon' : ''}${watching(st) ? ' is-short' : ''}`} aria-label={ring.full}>
          <RingIcon />
          <span className="ring-long" aria-hidden="true">{ring.long}</span>
          <span className="ring-short" aria-hidden="true">{ring.short}</span>
        </span>
        <MatchClock start={view.clockStart} end={view.clockEnd} />
      </div>
      <LogButton ctl={ctl} view={view} size={44} />
    </header>
  );
}

const modeSub = (mode: Mode) => (mode === 'STRAIGHT' ? tr('Stars move straight and take straight') : tr('Stars move diagonally and take diagonally'));

// Mod göstergesi: oyunun en önemli bilgisi. DÜZ buz zemin, ÇAPRAZ gece zemin + çapraz desen.
export function ModeIndicator({ mode, showSub }: { mode: Mode; showSub: boolean }) {
  const next: Mode = mode === 'STRAIGHT' ? 'DIAGONAL' : 'STRAIGHT';
  return (
    <div key={mode} className={`mode-box mode-flip mode-${mode === 'STRAIGHT' ? 'straight' : 'diagonal'}${showSub ? ' has-sub' : ''}`} role="status" aria-label={tr('Mode {mode}. {sub}. Next round {next}.', { mode: modeWord(mode), sub: modeSub(mode), next: modeWord(next) })}>
      <ModeIcon mode={mode} size={34} stroke={9} />
      <div className="mode-box-text">
        <span className="mode-box-label">{modeWord(mode)}</span>
        {showSub && <span className="mode-box-sub">{modeSub(mode)}</span>}
      </div>
      <div className="mode-box-next">
        <span>{tr('NEXT ROUND')}</span>
        <span className="mode-box-next-mode">
          <svg width="13" height="13" viewBox="0 0 100 100" style={{ overflow: 'visible' }} aria-hidden="true">
            <polygon points={next === 'STRAIGHT' ? '17,17 83,17 83,83 17,83' : '50,5 95,50 50,95 5,50'} fill="none" stroke="currentColor" strokeWidth="12" />
          </svg>
          {modeWord(next)}
        </span>
      </div>
    </div>
  );
}

// Kısa ekran (SE): başlık ve mod tek satırda.
export function CompactBar({ ctl, view }: { ctl: GameController; view: View }) {
  const st = ctl.state;
  const ring = ringInfo(st);
  const time = useMatchTime(view.clockStart, view.clockEnd);
  const mode = st.mode;
  return (
    <header className="compact-bar">
      <MenuButton ctl={ctl} size={40} />
      <div key={mode} className={`mode-box mode-box-compact mode-flip mode-${mode === 'STRAIGHT' ? 'straight' : 'diagonal'}`} role="status" aria-label={tr('Mode {mode}', { mode: modeWord(mode) })}>
        <ModeIcon mode={mode} size={24} stroke={10} />
        <span className="mode-box-label">{modeWord(mode)}</span>
        <div className="compact-info">
          <span>{turText(st)} · <span role="timer" aria-label={tr('Match time {time}', { time })}>{time}</span></span>
          <span className={ring.warn ? 'is-warn' : undefined}>{ring.long}</span>
        </div>
      </div>
      <LogButton ctl={ctl} view={view} size={40} />
    </header>
  );
}
