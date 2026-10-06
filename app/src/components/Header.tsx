import { collapseDue, nextCollapseRound, starOf } from '../../../engine/rules.js';
import type { GameState, Mode } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import { ICON } from '../game/look';
import { ME, modeWord } from '../game/names';
import { Icon, MatchClock, RingIcon, useMatchTime } from './bits';
import { ModeIcon } from './ModeOverlay';

// Halka çipi. Üst çubukta maç saati de olduğu için yazı kısa tutulur; dar ekranda ve izlerken daha da kısalır.
function ringInfo(st: GameState) {
  const next = nextCollapseRound(st);
  if (next == null) return { long: 'Arena en dar', short: 'En dar', full: 'Arena daha fazla daralmaz', warn: false };
  if (next === st.round) return { long: 'Halka çöküyor', short: 'Çöküyor', full: 'Dış halka bu turun sonunda çöküyor', warn: collapseDue(st) };
  const k = next - st.round;
  return { long: `Halka ${k} tur sonra`, short: `${k} tur sonra`, full: `Dış halka ${k} tur sonra çökecek`, warn: false };
}

const watching = (st: GameState) => !starOf(st, ME)?.alive;
const turText = (st: GameState) => `${watching(st) ? 'İZLEYİCİ · ' : ''}TUR ${st.round}`;

function LogButton({ ctl, view, size }: { ctl: GameController; view: View; size: number }) {
  const n = view.events.length;
  return (
    <button type="button" className="icon-btn" style={{ width: size }} aria-label={`Savaş kaydı, ${n} alma`} onClick={() => ctl.openLog()}>
      <Icon d={ICON.sword} size={size > 40 ? 22 : 20} />
      {n > 0 && <span className="icon-badge">{n}</span>}
    </button>
  );
}

function MenuButton({ ctl, size }: { ctl: GameController; size: number }) {
  return (
    <button type="button" className="icon-btn" style={{ width: size }} aria-label="Menü" onClick={() => ctl.openMenu()}>
      <Icon d={ICON.menu} size={size > 40 ? 22 : 20} />
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
          {watching(st) && <span className="topbar-eye" aria-label="İzleyici"><Icon d={ICON.eye} size={16} stroke={2.2} /></span>}
          TUR {st.round}
        </span>
        <span className={`ring-chip${ring.warn ? ' is-warn' : ''}${watching(st) ? ' is-short' : ''}`} aria-label={ring.full}>
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

const modeSub = (mode: Mode) => (mode === 'DUZ' ? 'Yıldızlar düz gider, düz alır' : 'Yıldızlar çapraz gider, çapraz alır');

// Mod göstergesi: oyunun en önemli bilgisi. DÜZ buz zemin, ÇAPRAZ gece zemin + çapraz desen.
export function ModeIndicator({ mode }: { mode: Mode }) {
  const next: Mode = mode === 'DUZ' ? 'CAPRAZ' : 'DUZ';
  return (
    <div className={`mode-box mode-${mode === 'DUZ' ? 'duz' : 'capraz'}`} role="status" aria-label={`Mod ${modeWord(mode)}. ${modeSub(mode)}. Sonraki tur ${modeWord(next)}.`}>
      <ModeIcon mode={mode} size={34} stroke={9} />
      <div className="mode-box-text">
        <span className="mode-box-label">{modeWord(mode)}</span>
        <span className="mode-box-sub">{modeSub(mode)}</span>
      </div>
      <div className="mode-box-next">
        <span>SONRAKİ TUR</span>
        <span className="mode-box-next-mode">
          <svg width="13" height="13" viewBox="0 0 100 100" style={{ overflow: 'visible' }} aria-hidden="true">
            <polygon points={next === 'DUZ' ? '17,17 83,17 83,83 17,83' : '50,5 95,50 50,95 5,50'} fill="none" stroke="currentColor" strokeWidth="12" />
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
      <div className={`mode-box mode-box-compact mode-${mode === 'DUZ' ? 'duz' : 'capraz'}`} role="status" aria-label={`Mod ${modeWord(mode)}`}>
        <ModeIcon mode={mode} size={24} stroke={10} />
        <span className="mode-box-label">{modeWord(mode)}</span>
        <div className="compact-info">
          <span>{turText(st)} · <span role="timer" aria-label={`Maç süresi ${time}`}>{time}</span></span>
          <span className={ring.warn ? 'is-warn' : undefined}>{ring.long}</span>
        </div>
      </div>
      <LogButton ctl={ctl} view={view} size={40} />
    </header>
  );
}
