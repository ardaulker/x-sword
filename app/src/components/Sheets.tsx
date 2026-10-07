import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { POINTS, isWinner, SIZE_BY_STARS, BOARD_SIZES, defaultNeutrals, maxNeutrals, pieceById, ranking, starOf } from '../../../engine/rules.js';
import type { GameState, Level, Piece } from '../../../engine/rules.js';
import type { GameController, Setup, TakeEvent } from '../game/controller';
import { HAZARD_TXT, ICON, TXT, colorOf, diamondOf, seatOf } from '../game/look';
import { ME, labelOf, modeLower, seatName, subjectOf, winnerLine } from '../game/names';
import { PLAYER_COLORS } from '../game/look';
import { Icon, RingIcon } from './bits';
import { PieceGlyph } from './PieceGlyph';
import { shareReplay, shareResult } from '../game/share';
import { replayCode } from '../game/record';
import { freshRewards, markRewardsSeen } from '../game/themes';
import { SkinFx } from './SkinFx';
import { PUZZLES } from '../game/puzzles';
import { puzzleNo, puzzleTitle } from '../game/puzzleText';
import { tr } from '../i18n';

// Alttan açılan kart; arka plan kararır, dışına dokununca kapanır.
function SheetFrame({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

const Mini = ({ st, p, size, grey }: { st: GameState; p: Piece; size: number; grey?: boolean }) => (
  <PieceGlyph kind={p.kind} seat={seatOf(p)} size={size} diamond={diamondOf(p, st.mode)} grey={grey} />
);

// ------------------------------------------------------------ savaş kaydı

export function LogSheet({ ctl, events }: { ctl: GameController; events: TakeEvent[] }) {
  const st = ctl.state;
  const close = () => ctl.closeSheet();
  const rows: ReactNode[] = [];
  let lastRound = -1;
  for (const e of [...events].reverse()) {
    if (e.round !== lastRound) {
      rows.push(<div key={`h${e.round}`} className="log-head">{tr('ROUND {n}', { n: e.round })}{e.round === st.round ? tr(' · THIS ROUND') : ''}</div>);
      lastRound = e.round;
    }
    const a = e.attackerId ? pieceById(st, e.attackerId) : null;
    const v = pieceById(st, e.victimId)!;
    rows.push(
      <div key={e.key} className="log-row">
        {a ? <Mini st={st} p={a} size={26} /> : <span className="log-ring"><RingIcon size={20} /></span>}
        <span className="log-name" style={{ color: a ? (a.kind === 'star' || a.kind === 'twin' ? colorOf(a) : TXT) : HAZARD_TXT }}>
          {a ? labelOf(st, a) : tr('Ring')}
        </span>
        <Icon d={ICON.sword} size={20} color="#A9B4DA" />
        <Mini st={st} p={v} size={26} grey />
        <span className="log-victim">{labelOf(st, v)}</span>
        {a?.kind === 'star' && <span className="log-points" style={{ color: colorOf(a) }}>+{POINTS[v.kind]}</span>}
      </div>,
    );
  }
  return (
    <SheetFrame label={tr('Battle log')} onClose={close}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Battle log')}</div>
        <button type="button" className="round-btn" aria-label={tr('Close')} onClick={close}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="log-list">
        {rows.length ? rows : <div className="log-empty">{tr('Nobody has been taken yet.')}</div>}
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ ipucu (ilk üç maç)

export function CoachSheet({ step, onDone }: { step: number; onDone: () => void }) {
  const tips: [string, string[]][] = [
    [tr('Getting started'), [
      tr('Tap a lit square, check the preview, press Confirm.'),
      tr('The shape tells the direction: square is straight, diamond is diagonal. The mode changes every round.'),
      tr('A striped square is dangerous: a piece can take you there.'),
      tr('Pale red squares: next round a piece can take you there.'),
    ]],
    [tr('Read the bots'), [
      tr('Tap a bot: its paths and who it chases show on the board.'),
      tr('The Red bot walks straight and takes diagonally. The Steel bot walks diagonally and takes straight.'),
      tr('The number on a piece is its place in the order: a lower number plays first.'),
    ]],
    [tr('Arena and bonuses'), [
      tr("Every 6 rounds the outer ring collapses. Don't stay on the orange-striped ring."),
      tr('Bonuses come from points and survival. Tap a bonus in the panel, then pick a square.'),
      tr("In solo, clear all the bots: the Twin copies you and can't take you."),
    ]],
  ];
  const [page, setPage] = useState(Math.min(step, tips.length - 1));
  const [title, lines] = tips[page];
  const last = page === tips.length - 1;
  return (
    <SheetFrame label={title} onClose={onDone}>
      <div className="sheet-head">
        <div className="sheet-title">{title}</div>
        <div className="coach-step">{page + 1} / {tips.length}</div>
      </div>
      <ul className="coach-list">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      <div className="coach-dots" role="tablist" aria-label={tr('Tip pages')}>
        {tips.map((_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={tr('Page {n}', { n: i + 1 })}
            className={i === page ? 'is-on' : ''} onClick={() => setPage(i)} />
        ))}
      </div>
      <div className="btn-row">
        {page > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPage(page - 1)}>{tr('Back')}</button>}
        {last
          ? <button type="button" className="btn btn-main" onClick={onDone}>{tr('Got it')}</button>
          : <button type="button" className="btn btn-main" onClick={() => setPage(page + 1)}>{tr('Next tip')}</button>}
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ menü (ana menü gelene kadar)

const levelLabels = (): [Level, string][] => [['easy', tr('Easy')], ['normal', tr('Normal')], ['hard', tr('Hard')]];

export function Opt({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="opt-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="opt-text"><b>{label}</b><small>{sub}</small></span>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

// Duraklatma menüsü: yerel maçta menü düğmesine basınca açılır; oyun bu sırada durur.
export function PauseSheet({ onResume, onNew, onRestart, onSettings, onHome, onEnd }: {
  onResume: () => void; onNew: () => void; onRestart: () => void; onSettings: () => void; onHome: () => void; onEnd?: () => void;
}) {
  const row = (label: string, on: () => void, main = false) => (
    <button type="button" className={`btn ${main ? 'btn-main' : 'btn-ghost'} pause-btn`} onClick={on}>{label}</button>
  );
  return (
    <SheetFrame label={tr('Paused')} onClose={onResume}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Paused')}</div>
        <button type="button" className="round-btn" aria-label={tr('Close')} onClick={onResume}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="pause-list">
        {row(tr('Continue'), onResume, true)}
        {onEnd && row(tr('End match'), onEnd)}
        {row(tr('Restart'), onRestart)}
        {row(tr('New game'), onNew)}
        {row(tr('Settings'), onSettings)}
        {row(tr('Main menu'), onHome)}
      </div>
    </SheetFrame>
  );
}

// Maç ayarı: ana menüden "Oyuna başla" ile ve oyun içindeki menü düğmesiyle açılır.
export function SetupSheet({ setup, onStart, onClose, onHome, onRules, onEnd }: {
  setup: Setup; onStart: (s: Setup) => void; onClose: () => void; onHome?: () => void; onRules?: () => void; onEnd?: () => void;
}) {
  const [players, setPlayers] = useState(setup.players);
  const [level, setLevel] = useState<Level>(setup.level);
  const [aiLevel, setAiLevel] = useState<Level>(setup.aiLevel);
  const [personas, setPersonas] = useState(!!setup.personas);
  const [obstacles, setObstacles] = useState(!!setup.obstacles);
  const [teams, setTeams] = useState(!!setup.teams);
  const [pickedSize, setBoardSize] = useState(setup.boardSize);
  // Bot sayısına dokunulmadıysa (null) tahtaya ve oyuncu sayısına göre varsayılan kalabalık kullanılır.
  const [picked, setBots] = useState<number | null>(
    setup.bots === defaultNeutrals(setup.players, Math.max(setup.boardSize, SIZE_BY_STARS[setup.players])) ? null : setup.bots);
  const minSize = SIZE_BY_STARS[players];
  const size = Math.max(pickedSize, minSize);
  const maxBots = maxNeutrals(size);
  const botCount = Math.min(picked ?? defaultNeutrals(players, size), maxBots);
  return (
    <SheetFrame label={tr('New match')} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('New match')}</div>
        <button type="button" className="round-btn" aria-label={tr('Close')} onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="field-label">{tr('PLAYERS')}</div>
      <div className="seg" role="radiogroup" aria-label={tr('Number of players')}>
        {[1, 2, 3, 4].map(n => (
          <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'is-on' : ''} onClick={() => setPlayers(n)}>
            <b>{n === 1 ? tr('Solo') : n}</b><span>{n === 1 ? tr('with Twin') : `${SIZE_BY_STARS[n]}×${SIZE_BY_STARS[n]}`}</span>
          </button>
        ))}
      </div>
      {(
        <>
          <div className="field-label">{tr('BOARD')}</div>
          <div className="seg" role="radiogroup" aria-label={tr('Board size')}>
            {BOARD_SIZES.map(n => (
              <button key={n} type="button" role="radio" aria-checked={size === n} disabled={n < minSize} className={size === n ? 'is-on' : ''} onClick={() => setBoardSize(n)}>
                <b>{n}×{n}</b>
              </button>
            ))}
          </div>
          <div className="field-label">{tr('ARENA BOTS: {n}', { n: botCount })}</div>
          <div className="bots-row">
            <input type="range" min={2} max={maxBots} value={botCount} aria-label={tr('Number of arena bots')} onChange={e => setBots(Number(e.target.value))} />
            <button type="button" className="btn btn-ghost bots-max" onClick={() => setBots(maxBots)}>{tr('Max {n}', { n: maxBots })}</button>
          </div>
        </>
      )}
      {players > 1 && (
        <>
          <div className="field-label">{tr('RIVAL INTELLIGENCE')}</div>
          <div className="seg" role="radiogroup" aria-label={tr('Rival intelligence')}>
            {levelLabels().map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={aiLevel === v} className={aiLevel === v ? 'is-on' : ''} onClick={() => setAiLevel(v)}>
                <b>{t}</b>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="field-label">{tr('ARENA BOT INTELLIGENCE')}</div>
      <div className="seg" role="radiogroup" aria-label={tr('Arena bot intelligence')}>
        {levelLabels().map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'is-on' : ''} onClick={() => setLevel(v)}>
            <b>{t}</b>
          </button>
        ))}
      </div>
      <div className="field-label">{tr('OPTIONS')}</div>
      <div className="opts">
        {players > 1 && <Opt label={tr('Rival personalities')} sub={tr('AI rivals play as a hunter, a cautious one or an opportunist.')} on={personas} onChange={setPersonas} />}
        {players === 4 && <Opt label={tr('Teams (2 vs 2)')} sub={tr("Opposite corners form a team; you can't take your teammate.")} on={teams} onChange={setTeams} />}
        <Opt label={tr('Obstacle squares')} sub={tr('Places blocked squares on the board that never touch each other.')} on={obstacles} onChange={setObstacles} />
      </div>
      <div className="menu-note">
        {players === 1
          ? tr('You, your mirror Twin and {bots} arena bots · {size}×{size} board. Clear out every bot.', { bots: botCount, size })
          : tr('You and {ai} AI {ai:player|players} · {size}×{size} board · {bots} arena bots.', { ai: players - 1, size, bots: botCount })}
        {level === 'easy' ? tr(' You go first.') : level === 'hard' ? tr(" The bots' targets are hidden.") : ''}
      </div>
      {(onRules || onEnd) && (
        <div className="btn-row" style={{ marginBottom: 8 }}>
          {onRules && <button type="button" className="btn btn-ghost" onClick={onRules}>{tr('How to play')}</button>}
          {onEnd && <button type="button" className="btn btn-ghost" onClick={onEnd}>{tr('End match')}</button>}
        </div>
      )}
      <div className="btn-row">
        {onHome
          ? <button type="button" className="btn btn-ghost" onClick={onHome}>{tr('Main menu')}</button>
          : <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('Close')}</button>}
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...setup, players, level, aiLevel, boardSize: size, bots: botCount, daily: null, puzzle: null, personas: players > 1 && personas, obstacles, teams: players === 4 && teams })}>{tr('Start')}</button>
      </div>
    </SheetFrame>
  );
}

// Çok oyunculu maçta menü: odadan çıkış.
export function LeaveSheet({ onLeave, onClose }: { onLeave: () => void; onClose: () => void }) {
  return (
    <SheetFrame label={tr('Leave match')} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Leave the match?')}</div>
        <button type="button" className="round-btn" aria-label={tr('Close')} onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <p className="menu-note">{tr('If you leave, an AI takes your place. If you created the room, the match ends for everyone.')}</p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('Cancel')}</button>
        <button type="button" className="btn btn-main" style={{ background: 'var(--danger)' }} onClick={onLeave}>{tr('Leave match')}</button>
      </div>
    </SheetFrame>
  );
}

// Ödül: animasyonlu efektli yıldız. Bulmaca 3 yıldız alevli, 2 yıldız kristal, maç galibiyeti altın, günlük şimşek.
function Trophy({ fx, label }: { fx: string; label?: string }) {
  return (
    <div className="res-trophy" aria-hidden="true">
      <PieceGlyph kind="star" seat={ME} size={64} diamond={false}><SkinFx id={fx} /></PieceGlyph>
      {label && <span>{label}</span>}
    </div>
  );
}

// Maç sonu özeti: başlık, senin istatistiklerin, sıralama.
export function ResultsSheet({ ctl, time, onAgain, againLabel, onClose, onPuzzle }: {
  ctl: GameController; time: string; onAgain?: () => void; againLabel: string; onClose: () => void;
  onPuzzle?: (id: number | null) => void; // bulmaca bitti: sonraki bulmaca (id) ya da liste (null)
}) {
  const st = ctl.state;
  const me = st.seats[ME];
  const won = isWinner(st, ME);
  const [shared, setShared] = useState(false);
  const [linked, setLinked] = useState(false);
  const [fresh] = useState(() => freshRewards());
  useEffect(() => { markRewardsSeen(); }, []);
  const newSkin = fresh.find(r => r.kind === 'skin');
  const unlocked = fresh.length > 0 && (
    <div className="res-unlock">
      {newSkin && <PieceGlyph kind="star" seat={ME} size={44} diamond={false} className="res-unlock-pv"><SkinFx id={newSkin.id} /></PieceGlyph>}
      <div>
        <b>{tr('New reward unlocked: {name}', { name: fresh.map(r => r.name).join(', ') })}</b>
        <span>{tr('Settings → Piece effect and Board theme')}</span>
      </div>
    </div>
  );
  const daily = ctl.setup.daily ?? null;
  const order = ranking(st);
  const lasted = (i: number) => (st.seats[i].out ? st.seats[i].outRound ?? st.round : st.round);
  const pending = st.decided && !st.over;
  const title = won ? tr('You won!') : st.solo ? tr('You were taken') : winnerLine(st, order[0]);
  // Kaybedince: seni kim, hangi turda, hangi yönle aldı.
  const myStar = starOf(st, ME);
  const fatal = !st.puzzle && myStar && !myStar.alive ? ctl.view.events.find(e => e.victimId === myStar.id) : undefined;
  const killer = fatal?.attackerId ? pieceById(st, fatal.attackerId) : null;
  const why = fatal
    ? killer
      ? tr('{name} took you ({how}) · round {n}', { name: subjectOf(st, killer), how: modeLower(fatal.round % 2 === 1 ? 'STRAIGHT' : 'DIAGONAL'), n: fatal.round })
      : tr('You were caught in the ring · round {n}', { n: fatal.round })
    : '';
  if (st.puzzle && onPuzzle) {
    const id = ctl.setup.puzzle ?? 1;
    const def = PUZZLES.find(p => p.id === id);
    const stars = won && def ? (st.puzzle.used <= def.par ? 3 : 2) : 0;
    const no = def ? puzzleNo(PUZZLES, def) : 1;
    const at = PUZZLES.findIndex(p => p.id === id);
    const next = PUZZLES[at + 1], prev = PUZZLES[at - 1];
    return (
      <SheetFrame label={tr('Puzzle')} onClose={onClose}>
        <div className="res-head">
          <div className="res-daily">{def?.tutorial ? tr('Tutorial {n}', { n: no }) : tr('Puzzle {n}', { n: no })}{def ? ` · ${puzzleTitle(def.title)}` : ''}</div>
          <div className="res-title" style={{ color: won ? PLAYER_COLORS[ME] : undefined }}>{won ? tr('Solved!') : tr('Not solved')}</div>
          {won && <Trophy fx={stars === 3 ? 'flame' : 'crystal'} label={stars === 3 ? tr('Flawless!') : tr('Well done!')} />}
          <div className="puzzle-stars res-stars" aria-label={tr('{n} {n:star|stars}', { n: stars })}>{[0, 1, 2].map(i => i < stars ? <span key={i} className="star-on" style={{ animationDelay: `${300 + i * 260}ms` }}>★</span> : <span key={i}>☆</span>)}</div>
          <div className="res-sub">{tr('You used {a}/{b} moves', { a: st.puzzle.used, b: st.puzzle.limit })}</div>
        </div>
        {unlocked}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => onPuzzle(null)}>{tr('Puzzles')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => ctl.restart()}>{tr('Try again')}</button>
        </div>
        <div className="btn-row">
          {prev && <button type="button" className="btn btn-ghost" onClick={() => onPuzzle(prev.id)}>{tr('Previous')}</button>}
          {next && <button type="button" className={`btn ${won ? 'btn-main' : 'btn-ghost'}`} onClick={() => onPuzzle(next.id)}>{tr('Next')}</button>}
        </div>
      </SheetFrame>
    );
  }
  return (
    <SheetFrame label={tr('Match result')} onClose={onClose}>
      <div className="res-head">
        {daily && <div className="res-daily">{tr('Daily {date}', { date: daily })}</div>}
        {won && !pending && <Trophy fx={daily ? 'bolt' : 'gold'} />}
        <div className="res-title" style={{ color: won ? PLAYER_COLORS[ME] : undefined }}>{title}</div>
        <div className="res-sub">{pending ? tr('No rival stars left. You can keep fighting the bots') : st.solo ? (won ? tr('No bots left in the arena') : tr('Better luck next time')) : tr('You finished #{n}', { n: order.indexOf(ME) + 1 })} · {time}</div>
      </div>
      {why && <div className="res-why">{why}</div>}
      {unlocked}
      <div className="res-stats">
        <div><b>{me.score}</b><span>{tr('Score')}</span></div>
        <div><b>{me.takes}</b><span>{tr('Takes')}</span></div>
        <div><b>{lasted(ME)}</b><span>{tr('Rounds alive')}</span></div>
      </div>
      {!st.solo && (
        <ol className="rank-list">
          {order.map((seat, i) => {
            const s = st.seats[seat], p = starOf(st, seat)!;
            return (
              <li key={seat} className={`rank-row${seat === ME ? ' is-me' : ''}`}>
                <span className="rank-no">{i + 1}.</span>
                <PieceGlyph kind="star" seat={seat} size={20} diamond={false} grey={!p.alive} />
                <span className="rank-name" style={{ color: PLAYER_COLORS[seat] }}>{seat === ME ? tr('You') : seatName(st, seat)}</span>
                <span className="rank-meta">{tr('{n} {n:take|takes}', { n: s.takes })} · {tr('{n} {n:round|rounds}', { n: lasted(seat) })}{s.bonus ? ` · +${s.bonus}` : ''}</span>
                <span className="rank-score">{s.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="btn-row">
        {pending ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => ctl.endNow()}>{tr('Finish')}</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.resume()}>{tr('Continue')}</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('View board')}</button>
        )}
        {!pending && (
          <button type="button" className="btn btn-ghost" onClick={async () => { const r = await shareResult({ st, time, daily }); setShared(r !== 'shared'); }}>
            {shared ? tr('Copied') : tr('Share')}
          </button>
        )}
        {!pending && onAgain && <button type="button" className="btn btn-main" onClick={onAgain}>{daily ? tr('Try again') : againLabel}</button>}
      </div>
      {!pending && fatal && ctl.replaySpec() && (
        <button type="button" className="link-btn res-link" onClick={() => { location.hash = `#/izle/${replayCode(ctl.replaySpec()!)}~${Math.max(0, fatal.at - 6)}`; }}>
          {tr('Watch the last moves')}
        </button>
      )}
      {!pending && ctl.replaySpec() && (
        <button type="button" className="link-btn res-link" onClick={async () => { await shareReplay(ctl); setLinked(true); }}>
          {linked ? tr('Link copied') : tr('Share the match replay')}
        </button>
      )}
    </SheetFrame>
  );
}
