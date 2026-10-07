import { PUZZLES } from '../game/puzzles';
import { puzzleHint } from '../game/puzzleText';
import {
  BONUS_NAMES, collapseDue, currentActor, isWinner, nextMode, pieceById, ranking, starOf, takeDirs, threatsFor,
} from '../../../engine/rules.js';
import type { BonusKind, GameState, Piece } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import type { NetActions } from '../screens/GameScreen';
import {
  DANGER, DANGER_TXT, HAZARD, HAZARD_TXT, ICON, PLAYER_COLORS, TXT, TXT2, colorOf, diamondOf, isBot, seatOf,
} from '../game/look';
import { attackersOfMe } from '../game/threats';
import { orderNo } from '../game/order';
import { ME, labelOf, modeLower, modeWord, seatName, winnerLine } from '../game/names';
import { Icon, useMatchTime } from './bits';
import { PieceGlyph } from './PieceGlyph';
import { tr } from '../i18n';

const takesStraight = (st: GameState, p: Piece) => {
  const [dr, dc] = takeDirs(p, nextMode(st, p))[0];
  return dr === 0 || dc === 0;
};

function Chips({ st, pieces, danger }: { st: GameState; pieces: Piece[]; danger?: boolean }) {
  if (!pieces.length) return null;
  return (
    <div className="chips">
      {pieces.map(p => (
        <div key={p.id} className={`chip${danger ? ' is-danger' : ''}`}>
          <PieceGlyph kind={p.kind} seat={seatOf(p)} size={22} diamond={diamondOf(p, st.mode)} />
          <span className="chip-label">{labelOf(st, p)}</span>
          <span className="chip-how">{takesStraight(st, p) ? tr('takes straight') : tr('takes diagonally')}</span>
        </div>
      ))}
    </div>
  );
}

// Başkaları oynarken: sıra sana kaç hamle sonra geliyor?
function untilMe(st: GameState, me: Piece) {
  if (!me.alive || st.over) return '';
  let n = 0;
  for (let i = st.turn; i < st.order.length; i++) {
    const p = pieceById(st, st.order[i]);
    if (!p?.alive) continue;
    if (p.id === me.id) return n <= 1 ? tr('Your turn comes after this move') : tr('Your turn in {n} {n:move|moves}', { n });
    n++;
  }
  return tr('Next round you are number {n}', { n: orderNo(st, me.id, st.round + 1) });
}

function Who({ st, p }: { st: GameState; p: Piece | null | undefined }) {
  if (!p) return null;
  return <PieceGlyph kind={p.kind} seat={seatOf(p)} size={34} diamond={diamondOf(p, st.mode)} />;
}

export function ActionPanel({ ctl, view, net, onPuzzle }: { ctl: GameController; view: View; net?: NetActions; onPuzzle?: (id: number) => void }) {
  const st = ctl.state;
  const me = ctl.myStar();
  const myColor = PLAYER_COLORS[me.seat];
  const t = view.timer, lastSeconds = t <= 5;
  const timerColor = lastSeconds ? DANGER : TXT;
  const time = useMatchTime(view.clockStart, view.clockEnd);

  // ---------------------------------------------------------- oyun sonu
  if (view.phase === 'over') {
    const won = isWinner(st, ME);
    const mine = st.seats[ME];
    const order = ranking(st);
    let title: string, sub: string;
    if (st.solo) {
      title = won ? tr('You won!') : tr('You were taken');
      sub = `${tr('{n} pts', { n: mine.score })} · ${tr('{n} {n:take|takes}', { n: mine.takes })}${won ? ` · ${tr('no bots left in the arena')}` : ` · ${tr('in round {n}', { n: st.round })}`}`;
    } else {
      title = won ? tr('You won!') : winnerLine(st, order[0]);
      sub = `${tr('Your place: #{n}', { n: order.indexOf(ME) + 1 })} · ${tr('{n} pts', { n: mine.score })} · ${tr('{n} {n:take|takes}', { n: mine.takes })}`;
    }
    return (
      <section className="panel" aria-label={tr('Match over')}>
        <div className="panel-stack">
          <div className="panel-big" style={{ color: won ? myColor : TXT }}>{title}</div>
          <div className="panel-sub-strong">{sub}</div>
          {!st.solo && (
            <ol className="rank-list" aria-label={tr('Ranking')}>
              {order.map((seat, i) => {
                const s = st.seats[seat], p = starOf(st, seat)!;
                return (
                  <li key={seat} className={`rank-row${seat === ME ? ' is-me' : ''}`}>
                    <span className="rank-no">{i + 1}.</span>
                    <PieceGlyph kind="star" seat={seat} size={20} diamond={diamondOf(p, st.mode)} grey={!p.alive} />
                    <span className="rank-name" style={{ color: PLAYER_COLORS[seat] }}>{seatName(st, seat)}</span>
                    <span className="rank-meta">{tr('{n} {n:take|takes}', { n: s.takes })}{s.bonus ? ` · +${s.bonus} ${tr('bonus')}` : ''}</span>
                    <span className="rank-score">{s.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="panel-hint">{tr('Match time {time}', { time })} · {tr('{n} {n:round|rounds}', { n: st.round })} · <button type="button" className="link-btn" onClick={() => ctl.openResults()}>{tr('Results')}</button></div>
          {net && !net.onRematch && <div className="panel-hint">{tr('If the host starts a rematch, you return to the lobby.')}</div>}
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => (net ? net.onLeave() : ctl.openMenu())}>{net ? tr('Leave room') : tr('Menu')}</button>
            {(!net || net.onRematch) && (
              <button type="button" className="btn btn-main" style={{ background: won ? myColor : undefined }} onClick={() => (net?.onRematch ? net.onRematch() : ctl.newGame())}>
                <Icon d={ICON.replay} size={18} stroke={2.2} color="#0B1026" />
                {net ? tr('Back to lobby') : tr('Rematch')}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- elendin
  if (!me.alive && !view.watching) {
    const mine = st.seats[ME];
    return (
      <section className="panel" aria-label={tr("You're out")}>
        <div className="panel-stack">
          <div className="panel-row-baseline">
            <div className="panel-big">{tr("You're out")}</div>
            <div className="panel-sub-strong">{tr('{n} pts', { n: mine.score })} · {tr('now #{n}', { n: ranking(st).indexOf(ME) + 1 })}</div>
          </div>
          <div className="panel-hint">{tr('Your score keeps counting: the score decides the winner. You can watch or leave.')}</div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => (net ? net.onLeave() : ctl.openMenu())}>{tr('Leave match')}</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.watch()}>
              <Icon d={ICON.eye} size={18} stroke={2.2} color="#0B1026" />
              {tr('Keep watching')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- önizleme
  if (view.phase === 'preview' && view.sel) {
    const sel = view.sel;
    const victim = sel.type === 'take' && sel.targetId ? pieceById(st, sel.targetId) : null;
    const { attackers, doomed } = threatsFor(st, me, sel);
    const risky = doomed || attackers.length > 0;
    const risk = doomed
      ? tr('Risky · this square collapses at the end of the round')
      : attackers.length ? tr('Risky · {n} {n:piece|pieces} can take you here', { n: attackers.length }) : tr('Safe · nobody can take you here');
    return (
      <section className="panel" aria-label={tr('Move preview')}>
        <div className="panel-stack">
          <div className="panel-row">
            <div className="panel-title-sm">
              {sel.bonus ? `${tr(BONUS_NAMES[sel.bonus])} · ` : ''}{sel.type === 'swap' && sel.targetId ? tr('Swap with {name}', { name: labelOf(st, pieceById(st, sel.targetId)!) }) : victim ? tr('Takes {name}', { name: labelOf(st, victim) }) : tr('Move preview')}
            </div>
            {!st.puzzle && <div className="panel-timer-sm" style={{ color: timerColor }}>{tr('{n} s', { n: t })}</div>}
          </div>
          <div className={`risk-row${risky ? ' is-risky' : ''}`}>
            <Icon d={risky ? ICON.warn : ICON.check} size={18} stroke={2.2} />
            <span>{risk}</span>
          </div>
          <Chips st={st} pieces={attackers} />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => ctl.cancel()}>{tr('Cancel')}</button>
            <button type="button" className="btn btn-main" style={{ background: risky ? DANGER : myColor }} onClick={() => ctl.confirm()}>
              {risky ? tr('Risky · Confirm') : tr('Confirm')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- seni alabilecekler
  if (view.phase === 'mine' && view.showThreats) {
    const th = attackersOfMe(st, me);
    return (
      <section className="panel" aria-label={tr('Pieces that can take you')}>
        <div className="panel-stack">
          <div className="panel-row">
            <Icon d={th.length ? ICON.warn : ICON.check} size={22} stroke={2.2} color={th.length ? DANGER : myColor} />
            <div className="panel-title-sm" style={{ color: th.length ? DANGER_TXT : TXT }}>
              {th.length ? tr('{n} {n:piece|pieces} can take you right now', { n: th.length }) : tr('Nobody can take you right now')}
            </div>
            {!st.puzzle && <div className="panel-timer-sm" style={{ color: timerColor }}>{tr('{n} s', { n: t })}</div>}
          </div>
          <Chips st={st} pieces={th} danger />
          <div className="panel-hint">
            {th.length ? tr('These pieces move after you. Squares lit without stripes are safe.') : tr('Squares lit without stripes are safe. Tap your piece again to close.')}
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- bot turu
  if (view.phase === 'bot') {
    const { done, total, currentId } = view.bots;
    const cur = currentId ? pieceById(st, currentId) : null;
    return (
      <section className="panel" aria-label={tr('Bots are playing')}>
        <div className="panel-stack">
          <div className="panel-row">
            <svg width="30" height="30" viewBox="0 0 100 100" style={{ flex: 'none' }} aria-hidden="true">
              <rect x="12" y="12" width="44" height="44" rx="5" fill="#D3765B" />
              <path d="M24 24 L44 44 M44 24 L24 44" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
              <polygon points="66,44 92,70 66,96 40,70" fill="#6F98DA" />
              <path d="M66 58 V82 M54 70 H78" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <div className="panel-titles">
              <div className="panel-title">{tr('Bots are playing')}</div>
              <div className="panel-sub">{cur && cur.kind !== 'star' && isBot(cur) ? tr('Now #{n} · taken bots are skipped', { n: cur.label }) : tr('One after another')}</div>
            </div>
            <div className="panel-count">{Math.min(done, total)} / {total}</div>
          </div>
          <div className="segs" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} style={{ background: i < done - 1 ? '#6F7FB8' : i === done - 1 ? '#EEF2FF' : '#232D5E' }} />
            ))}
          </div>
          {me.alive && <div className="panel-hint">{untilMe(st, me)}</div>}
          {!ctl.isGuest && (
            <button type="button" className="btn btn-fast" onClick={() => ctl.speedUp()}>
              <Icon d={ICON.fast} size={18} fill="#EEF2FF" />
              {tr('Speed up · or tap the board')}
            </button>
          )}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- genel
  const actor = currentActor(st);
  let who: Piece | null | undefined = null;
  let title = '', sub = '', hint = '', hintColor = TXT2, border: string | undefined, glow: string | undefined;
  let timer: number | null = null, barColor = myColor;

  if (view.phase === 'mine') {
    who = me; timer = t; title = tr('Your turn'); sub = tr('Tap one of the lit squares');
    const threats = attackersOfMe(st, me).length;
    // Bulmacanın kendi ipucu tehdit uyarısından önce gelir: eğitim ipuçları hep okunsun, tehlike zaten çizgili karelerde görünür.
    if (st.puzzle) hint = puzzleHint(PUZZLES.find(p => p.id === ctl.setup.puzzle)?.hint ?? '');
    else if (threats) { hint = tr('{n} {n:piece|pieces} can take you right now. Striped squares are dangerous.', { n: threats }); hintColor = DANGER_TXT; }
    else hint = tr('Tap a piece: its paths and who it is chasing show on the board.');
    if (collapseDue(st)) {
      sub = tr('The outer ring collapses at the end of this round');
      hint = tr('Any piece left on the orange-striped ring is out. Move inward.'); hintColor = HAZARD_TXT; border = HAZARD;
    }
    if (lastSeconds) {
      sub = tr('Last seconds');
      hint = tr('If time runs out, the game plays a safe move for you.'); hintColor = TXT2;
      border = DANGER; glow = '0 0 0 3px rgba(255,59,92,.18)';
    }
  } else if (view.phase === 'rival' && actor) {
    who = actor; timer = t; barColor = colorOf(actor);
    title = tr('{name} is playing', { name: actor.kind === 'star' ? seatName(st, actor.seat) : labelOf(st, actor) });
    const next = pieceById(st, st.order[st.turn + 1]);
    sub = !next ? tr('Next: new round') : next.kind === 'star' ? tr('Next: {name}', { name: labelOf(st, next) }) : tr('Next: bots');
    hint = me.alive ? untilMe(st, me) : tr("You're watching. Tap a piece: its paths show on the board.");
  } else if (view.phase === 'mode') {
    const first = actor?.kind === 'star' ? actor : null;
    who = first; title = tr('Mode changed: {mode}', { mode: modeWord(st.mode) });
    sub = `${tr('Round {n}', { n: st.round })}${first ? ` · ${tr('{name} goes first', { name: labelOf(st, first) })}` : ''}`;
    hint = tr('Stars now move {mode} and take {mode}.', { mode: modeLower(st.mode) });
  } else if (view.phase === 'ready') {
    const k = st.matchOrder.indexOf(me.id) + 1;
    who = me; title = tr('Match starting'); sub = tr("Round 1 · {mode} · you're {k} of {total}", { mode: modeWord(st.mode), k, total: st.matchOrder.length });
    hint = k === 1 ? tr('You play first. The order stays the same all match.') : tr('{n} {n:piece plays|pieces play} before you. The order stays the same all match.', { n: k - 1 });
  } else {
    title = tr('Passing the turn…'); sub = tr('Round {n}', { n: st.round });
    hint = tr("During the bots' turn, tap the board to speed up.");
  }

  if (st.puzzle) timer = null; // bulmacada süre yok
  const total = ctl.setup.moveSeconds;
  return (
    <section className="panel" aria-label={title} style={{ borderColor: border, boxShadow: glow }}>
      <div className="panel-stack">
        <div className="panel-row">
          <Who st={st} p={who} />
          <div className="panel-titles">
            <div className="panel-title">{title}</div>
            <div className="panel-sub">{sub}</div>
          </div>
          {timer != null && (
            <div className={`panel-timer${lastSeconds && view.phase === 'mine' ? ' is-pulse' : ''}`} style={{ color: view.phase === 'mine' ? timerColor : TXT }}>
              {timer}
            </div>
          )}
        </div>
        {timer != null && (
          <div className="bar" aria-hidden="true">
            <div style={{ width: `${Math.max(0, Math.min(100, Math.round((timer / total) * 100)))}%`, background: view.phase === 'mine' && lastSeconds ? DANGER : barColor }} />
          </div>
        )}
        <div className="panel-hint" style={{ color: hintColor }}>{hint}</div>
        {view.phase === 'mine' && <BonusBar ctl={ctl} view={view} />}
        {view.phase === 'mine' && (ctl.undoAvailable || (st.puzzle && onPuzzle)) && (
          <div className="mini-row">
            {ctl.undoAvailable && (
              <button type="button" className="btn btn-ghost btn-undo" disabled={!ctl.canUndo} onClick={() => ctl.undo()}>
                <Icon d="M9 14 L4 9 L9 4 M4 9 H15 A5 5 0 0 1 15 19 H8" size={16} stroke={2.2} />
                {ctl.undosRemaining == null ? tr('Undo') : tr('Undo ({n})', { n: ctl.undosRemaining })}
              </button>
            )}
            {st.puzzle && onPuzzle && (() => {
              const i = PUZZLES.findIndex(p => p.id === ctl.setup.puzzle);
              const prev = PUZZLES[i - 1], next = PUZZLES[i + 1];
              return (
                <>
                  <button type="button" className="btn btn-ghost btn-undo btn-nav" disabled={!prev} aria-label={tr('Previous puzzle')} onClick={() => prev && onPuzzle(prev.id)}>
                    <Icon d="M15 5 L8 12 L15 19" size={16} stroke={2.4} />{tr('Previous')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-undo btn-nav" disabled={!next} aria-label={tr('Next puzzle')} onClick={() => next && onPuzzle(next.id)}>
                    {tr('Next')}<Icon d="M9 5 L16 12 L9 19" size={16} stroke={2.4} />
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}

const BONUS_ICONS: Record<BonusKind, string> = {
  armor: 'M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z',
  step: 'M4 12 H12 M9 8 L13 12 L9 16 M12 12 H20 M17 8 L21 12 L17 16',
  double: 'M3 5 L12 12 L3 19 Z M12 5 L21 12 L12 19 Z',
  swap: 'M4 8 H18 M15 5 L18 8 L15 11 M20 16 H6 M9 13 L6 16 L9 19',
};

// Düğmede kısa ad: "Çift adım" ile "Çift hamle" dar ekranda aynı görünüyordu.
const shortBonus = (k: BonusKind) => (k === 'step' ? tr('Step ×2') : k === 'double' ? tr('Move ×2') : tr(BONUS_NAMES[k]));

// Sırandayken elindeki bonuslar. Zırh kendiliğinden çalışır; diğerine dokun, kareler ona göre yanar.
function BonusBar({ ctl, view }: { ctl: GameController; view: View }) {
  const b = ctl.state.seats[ME].bonuses;
  if (!Object.values(b).some(n => n > 0)) return null;
  return (
    <div className="bonus-bar" role="group" aria-label={tr('Bonuses')}>
      {(Object.keys(BONUS_ICONS) as BonusKind[]).map(k => (
        <button key={k} type="button" disabled={!b[k] || k === 'armor'} aria-pressed={view.bonus === k}
          className={`bonus${view.bonus === k ? ' is-on' : ''}${k === 'armor' && b[k] ? ' is-passive' : ''}`}
          onClick={() => ctl.selectBonus(k)} aria-label={`${tr(BONUS_NAMES[k])}: ${b[k]}`}>
          <Icon d={BONUS_ICONS[k]} size={18} stroke={2} fill={k === 'double' ? 'currentColor' : 'none'} />
          <span>{shortBonus(k)}</span>
          {b[k] > 0 && <b>{b[k]}</b>}
        </button>
      ))}
    </div>
  );
}

