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
          <span className="chip-how">{takesStraight(st, p) ? tr('düz alır') : tr('çapraz alır')}</span>
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
    if (p.id === me.id) return n <= 1 ? tr('Bu hamleden sonra sıra sende') : tr('{n} hamle sonra sıra sende', { n });
    n++;
  }
  return tr('Sonraki turda {n}. sıradasın', { n: orderNo(st, me.id, st.round + 1) });
}

function Who({ st, p }: { st: GameState; p: Piece | null | undefined }) {
  if (!p) return null;
  return <PieceGlyph kind={p.kind} seat={seatOf(p)} size={34} diamond={diamondOf(p, st.mode)} />;
}

export function ActionPanel({ ctl, view, net }: { ctl: GameController; view: View; net?: NetActions }) {
  const st = ctl.state;
  const me = ctl.myStar();
  const myColor = PLAYER_COLORS[me.seat];
  const t = view.timer, lastSeconds = t <= 5;
  const timerColor = lastSeconds ? DANGER : TXT;
  const time = useMatchTime(view.clockStart, view.clockEnd);

  // ---------------------------------------------------------- oyun sonu
  if (view.phase === 'bitti') {
    const won = isWinner(st, ME);
    const mine = st.seats[ME];
    const order = ranking(st);
    let title: string, sub: string;
    if (st.solo) {
      title = won ? tr('Kazandın!') : tr('Alındın');
      sub = `${tr('{n} puan', { n: mine.score })} · ${tr('{n} alma', { n: mine.takes })}${won ? ` · ${tr('arenada bot kalmadı')}` : ` · ${tr('{n}. turda', { n: st.round })}`}`;
    } else {
      title = won ? tr('Kazandın!') : winnerLine(st, order[0]);
      sub = `${tr('Sen {n}. oldun', { n: order.indexOf(ME) + 1 })} · ${tr('{n} puan', { n: mine.score })} · ${tr('{n} alma', { n: mine.takes })}`;
    }
    return (
      <section className="panel" aria-label={tr('Maç sonu')}>
        <div className="panel-stack">
          <div className="panel-big" style={{ color: won ? myColor : TXT }}>{title}</div>
          <div className="panel-sub-strong">{sub}</div>
          {!st.solo && (
            <ol className="rank-list" aria-label={tr('Sıralama')}>
              {order.map((seat, i) => {
                const s = st.seats[seat], p = starOf(st, seat)!;
                return (
                  <li key={seat} className={`rank-row${seat === ME ? ' is-me' : ''}`}>
                    <span className="rank-no">{i + 1}.</span>
                    <PieceGlyph kind="star" seat={seat} size={20} diamond={diamondOf(p, st.mode)} grey={!p.alive} />
                    <span className="rank-name" style={{ color: PLAYER_COLORS[seat] }}>{seatName(st, seat)}</span>
                    <span className="rank-meta">{tr('{n} alma', { n: s.takes })}{s.bonus ? ` · +${s.bonus} ${tr('bonus')}` : ''}</span>
                    <span className="rank-score">{s.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="panel-hint">{tr('Maç süresi {time}', { time })} · {tr('{n} tur', { n: st.round })} · <button type="button" className="link-btn" onClick={() => ctl.openResults()}>{tr('Sonuçlar')}</button></div>
          {net && !net.onRematch && <div className="panel-hint">{tr('Kurucu rövanş açarsa lobiye dönersin.')}</div>}
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => (net ? net.onLeave() : ctl.openMenu())}>{net ? tr('Odadan çık') : tr('Menü')}</button>
            {(!net || net.onRematch) && (
              <button type="button" className="btn btn-main" style={{ background: won ? myColor : undefined }} onClick={() => (net?.onRematch ? net.onRematch() : ctl.newGame())}>
                <Icon d={ICON.replay} size={18} stroke={2.2} color="#0B1026" />
                {net ? tr('Lobiye dön') : tr('Rövanş')}
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
      <section className="panel" aria-label={tr('Elendin')}>
        <div className="panel-stack">
          <div className="panel-row-baseline">
            <div className="panel-big">{tr('Elendin')}</div>
            <div className="panel-sub-strong">{tr('{n} puan', { n: mine.score })} · {tr('şu an {n}.', { n: ranking(st).indexOf(ME) + 1 })}</div>
          </div>
          <div className="panel-hint">{tr('Skorun sayılmaya devam eder: kazananı skor belirler. İzleyebilir ya da çıkabilirsin.')}</div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => (net ? net.onLeave() : ctl.openMenu())}>{tr('Maçtan çık')}</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.watch()}>
              <Icon d={ICON.eye} size={18} stroke={2.2} color="#0B1026" />
              {tr('İzlemeye devam')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- önizleme
  if (view.phase === 'onizleme' && view.sel) {
    const sel = view.sel;
    const victim = sel.type === 'take' && sel.targetId ? pieceById(st, sel.targetId) : null;
    const { attackers, doomed } = threatsFor(st, me, sel);
    const risky = doomed || attackers.length > 0;
    const risk = doomed
      ? tr('Riskli · bu kare tur sonunda çöküyor')
      : attackers.length ? tr('Riskli · {n} taş seni burada alabilir', { n: attackers.length }) : tr('Güvenli · burada kimse seni alamaz');
    return (
      <section className="panel" aria-label={tr('Hamle önizlemesi')}>
        <div className="panel-stack">
          <div className="panel-row">
            <div className="panel-title-sm">
              {sel.bonus ? `${tr(BONUS_NAMES[sel.bonus])} · ` : ''}{sel.type === 'swap' && sel.targetId ? tr('{name} ile yer değiş', { name: labelOf(st, pieceById(st, sel.targetId)!) }) : victim ? tr('{name} alınacak', { name: labelOf(st, victim) }) : tr('Hamle önizlemesi')}
            </div>
            {!st.puzzle && <div className="panel-timer-sm" style={{ color: timerColor }}>{tr('{n} sn', { n: t })}</div>}
          </div>
          <div className={`risk-row${risky ? ' is-risky' : ''}`}>
            <Icon d={risky ? ICON.warn : ICON.check} size={18} stroke={2.2} />
            <span>{risk}</span>
          </div>
          <Chips st={st} pieces={attackers} />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => ctl.cancel()}>{tr('Vazgeç')}</button>
            <button type="button" className="btn btn-main" style={{ background: risky ? DANGER : myColor }} onClick={() => ctl.confirm()}>
              {risky ? tr('Riskli · Onayla') : tr('Onayla')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- seni alabilecekler
  if (view.phase === 'sen' && view.showThreats) {
    const th = attackersOfMe(st, me);
    return (
      <section className="panel" aria-label={tr('Seni alabilecek taşlar')}>
        <div className="panel-stack">
          <div className="panel-row">
            <Icon d={th.length ? ICON.warn : ICON.check} size={22} stroke={2.2} color={th.length ? DANGER : myColor} />
            <div className="panel-title-sm" style={{ color: th.length ? DANGER_TXT : TXT }}>
              {th.length ? tr('Şu an {n} taş seni alabilir', { n: th.length }) : tr('Şu an kimse seni alamaz')}
            </div>
            {!st.puzzle && <div className="panel-timer-sm" style={{ color: timerColor }}>{tr('{n} sn', { n: t })}</div>}
          </div>
          <Chips st={st} pieces={th} danger />
          <div className="panel-hint">
            {th.length ? tr('Bu taşlar senden sonra oynuyor. Çizgisiz yanan kareler güvenli.') : tr('Çizgisiz yanan kareler güvenli. Taşına tekrar dokun: kapanır.')}
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
      <section className="panel" aria-label={tr('Botlar oynuyor')}>
        <div className="panel-stack">
          <div className="panel-row">
            <svg width="30" height="30" viewBox="0 0 100 100" style={{ flex: 'none' }} aria-hidden="true">
              <rect x="12" y="12" width="44" height="44" rx="5" fill="#D3765B" />
              <path d="M24 24 L44 44 M44 24 L24 44" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
              <polygon points="66,44 92,70 66,96 40,70" fill="#6F98DA" />
              <path d="M66 58 V82 M54 70 H78" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <div className="panel-titles">
              <div className="panel-title">{tr('Botlar oynuyor')}</div>
              <div className="panel-sub">{cur && cur.kind !== 'star' && isBot(cur) ? tr('Şimdi #{n} · alınan bot atlanır', { n: cur.label }) : tr('Sırayla, art arda')}</div>
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
              {tr('Hızlandır · ya da tahtaya dokun')}
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

  if (view.phase === 'sen') {
    who = me; timer = t; title = tr('Senin sıran'); sub = tr('Yanan karelerden birine dokun');
    const threats = attackersOfMe(st, me).length;
    if (threats) { hint = tr('Şu an {n} taş seni alabilir. Çizgili kareler tehlikeli.', { n: threats }); hintColor = DANGER_TXT; }
    else if (st.puzzle) hint = puzzleHint(PUZZLES.find(p => p.id === ctl.setup.puzzle)?.hint ?? '');
    else hint = tr('Bir taşa dokun: yolları ve kimi kovaladığı tahtada görünür.');
    if (collapseDue(st)) {
      sub = tr('Dış halka bu turun sonunda çöküyor');
      hint = tr('Turuncu çizgili halkada kalan taş elenir. İçeri gir.'); hintColor = HAZARD_TXT; border = HAZARD;
    }
    if (lastSeconds) {
      sub = tr('Son saniyeler');
      hint = tr('Süre biterse oyun senin yerine güvenli bir hamle yapar.'); hintColor = TXT2;
      border = DANGER; glow = '0 0 0 3px rgba(255,59,92,.18)';
    }
  } else if (view.phase === 'rakip' && actor) {
    who = actor; timer = t; barColor = colorOf(actor);
    title = tr('{name} oynuyor', { name: actor.kind === 'star' ? seatName(st, actor.seat) : labelOf(st, actor) });
    const next = pieceById(st, st.order[st.turn + 1]);
    sub = !next ? tr('Sonra: yeni tur') : next.kind === 'star' ? tr('Sonra: {name}', { name: labelOf(st, next) }) : tr('Sonra: botlar');
    hint = me.alive ? untilMe(st, me) : tr('İzliyorsun. Bir taşa dokun: yolları tahtada görünür.');
  } else if (view.phase === 'mod') {
    const first = actor?.kind === 'star' ? actor : null;
    who = first; title = tr('Mod değişti: {mode}', { mode: modeWord(st.mode) });
    sub = `${tr('Tur {n}', { n: st.round })}${first ? ` · ${tr('ilk sıra {name}', { name: labelOf(st, first) })}` : ''}`;
    hint = tr('Yıldızlar artık {mode} gider ve {mode} alır.', { mode: modeLower(st.mode) });
  } else if (view.phase === 'hazir') {
    const k = st.matchOrder.indexOf(me.id) + 1;
    who = me; title = tr('Maç başlıyor'); sub = tr('Tur 1 · {mode} · sıran {k} / {total}', { mode: modeWord(st.mode), k, total: st.matchOrder.length });
    hint = k === 1 ? tr('İlk sen oynuyorsun. Sıra bütün maç aynı kalır.') : tr('Senden önce {n} taş oynuyor. Sıra bütün maç aynı kalır.', { n: k - 1 });
  } else {
    title = tr('Sıra geçiyor…'); sub = tr('Tur {n}', { n: st.round });
    hint = tr('Bot turunda tahtaya dokunarak hızlandırabilirsin.');
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
            <div className={`panel-timer${lastSeconds && view.phase === 'sen' ? ' is-pulse' : ''}`} style={{ color: view.phase === 'sen' ? timerColor : TXT }}>
              {timer}
            </div>
          )}
        </div>
        {timer != null && (
          <div className="bar" aria-hidden="true">
            <div style={{ width: `${Math.max(0, Math.min(100, Math.round((timer / total) * 100)))}%`, background: view.phase === 'sen' && lastSeconds ? DANGER : barColor }} />
          </div>
        )}
        <div className="panel-hint" style={{ color: hintColor }}>{hint}</div>
        {view.phase === 'sen' && <BonusBar ctl={ctl} view={view} />}
        {view.phase === 'sen' && ctl.undoAvailable && (
          <button type="button" className="btn btn-ghost btn-undo" disabled={!ctl.canUndo} onClick={() => ctl.undo()}>
            <Icon d="M9 14 L4 9 L9 4 M4 9 H15 A5 5 0 0 1 15 19 H8" size={16} stroke={2.2} />
            {ctl.undosRemaining == null ? tr('Geri al') : tr('Geri al ({n})', { n: ctl.undosRemaining })}
          </button>
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
const shortBonus = (k: BonusKind) => (k === 'step' ? tr('Adım ×2') : k === 'double' ? tr('Hamle ×2') : tr(BONUS_NAMES[k]));

// Sırandayken elindeki bonuslar. Zırh kendiliğinden çalışır; diğerine dokun, kareler ona göre yanar.
function BonusBar({ ctl, view }: { ctl: GameController; view: View }) {
  const b = ctl.state.seats[ME].bonuses;
  if (!Object.values(b).some(n => n > 0)) return null;
  return (
    <div className="bonus-bar" role="group" aria-label={tr('Bonuslar')}>
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

