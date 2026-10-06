import {
  attackersOf, collapseDue, currentActor, nextMode, pieceById, takeDirs, threatsFor,
} from '../../../engine/rules.js';
import type { GameState, Piece } from '../../../engine/rules.js';
import type { GameController, View } from '../game/controller';
import {
  DANGER, DANGER_TXT, HAZARD, HAZARD_TXT, ICON, PLAYER_COLORS, TXT, TXT2, colorOf, diamondOf,
} from '../game/look';
import { ME, labelOf, modeLower, modeWord, seatName } from '../game/names';
import { Icon, useMatchTime } from './bits';
import { PieceGlyph } from './PieceGlyph';

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
          <PieceGlyph kind={p.kind} seat={p.kind === 'star' ? p.seat : 0} size={22} diamond={diamondOf(p, st.mode)} />
          <span className="chip-label">{labelOf(st, p)}</span>
          <span className="chip-how">{takesStraight(st, p) ? 'düz alır' : 'çapraz alır'}</span>
        </div>
      ))}
    </div>
  );
}

function Who({ st, p }: { st: GameState; p: Piece | null | undefined }) {
  if (!p) return null;
  return <PieceGlyph kind={p.kind} seat={p.kind === 'star' ? p.seat : 0} size={34} diamond={diamondOf(p, st.mode)} />;
}

export function ActionPanel({ ctl, view }: { ctl: GameController; view: View }) {
  const st = ctl.state;
  const me = ctl.myStar();
  const myColor = PLAYER_COLORS[me.seat];
  const t = view.timer, lastSeconds = t <= 5;
  const timerColor = lastSeconds ? DANGER : TXT;
  const time = useMatchTime(view.clockStart, view.clockEnd);

  // ---------------------------------------------------------- oyun sonu
  if (view.phase === 'bitti') {
    const won = st.winner === ME;
    const place = st.seats.length - st.outOrder.indexOf(ME);
    let title = 'Maç bitti', sub = '';
    if (won) { title = 'Kazandın!'; sub = `Son kalan yıldız sensin · ${st.seats[ME].takes} alma`; }
    else if (st.winner == null) { title = 'Berabere'; sub = 'Arenada yıldız kalmadı'; }
    else sub = `${seatName(st, st.winner)} kazandı · sen ${place}. sıradasın`;
    return (
      <section className="panel" aria-label="Maç sonu">
        <div className="panel-stack">
          <div className="panel-big" style={{ color: won ? myColor : TXT }}>{title}</div>
          <div className="panel-sub-strong">{sub}</div>
          <div className="panel-hint">Maç süresi {time} · {st.round} tur</div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => ctl.openMenu()}>Menü</button>
            <button type="button" className="btn btn-main" style={{ background: won ? myColor : undefined }} onClick={() => ctl.newGame()}>
              <Icon d={ICON.replay} size={18} stroke={2.2} color="#0B1026" />
              Rövanş
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- elendin
  if (!me.alive && !view.watching) {
    const place = st.seats.length - st.outOrder.indexOf(ME);
    return (
      <section className="panel" aria-label="Elendin">
        <div className="panel-stack">
          <div className="panel-row-baseline">
            <div className="panel-big">Elendin</div>
            <div className="panel-sub-strong">{place}. sıra · {st.seats[ME].takes} alma</div>
          </div>
          <div className="panel-hint">Maçı izlemeye devam edebilir ya da çıkabilirsin.</div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => ctl.openMenu()}>Maçtan çık</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.watch()}>
              <Icon d={ICON.eye} size={18} stroke={2.2} color="#0B1026" />
              İzlemeye devam
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
      ? 'Riskli · bu kare tur sonunda çöküyor'
      : attackers.length ? `Riskli · ${attackers.length} taş seni burada alabilir` : 'Güvenli · burada kimse seni alamaz';
    return (
      <section className="panel" aria-label="Hamle önizlemesi">
        <div className="panel-stack">
          <div className="panel-row">
            <div className="panel-title-sm">{victim ? `${labelOf(st, victim)} alınacak` : 'Hamle önizlemesi'}</div>
            <div className="panel-timer-sm" style={{ color: timerColor }}>{t} sn</div>
          </div>
          <div className={`risk-row${risky ? ' is-risky' : ''}`}>
            <Icon d={risky ? ICON.warn : ICON.check} size={18} stroke={2.2} />
            <span>{risk}</span>
          </div>
          <Chips st={st} pieces={attackers} />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => ctl.cancel()}>Vazgeç</button>
            <button type="button" className="btn btn-main" style={{ background: risky ? DANGER : myColor }} onClick={() => ctl.confirm()}>
              {risky ? 'Riskli · Onayla' : 'Onayla'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------- seni alabilecekler
  if (view.phase === 'sen' && view.showThreats) {
    const th = attackersOf(st, me.r, me.c, [me.id]);
    return (
      <section className="panel" aria-label="Seni alabilecek taşlar">
        <div className="panel-stack">
          <div className="panel-row">
            <Icon d={th.length ? ICON.warn : ICON.check} size={22} stroke={2.2} color={th.length ? DANGER : myColor} />
            <div className="panel-title-sm" style={{ color: th.length ? DANGER_TXT : TXT }}>
              {th.length ? `Şu an ${th.length} taş seni alabilir` : 'Şu an kimse seni alamaz'}
            </div>
            <div className="panel-timer-sm" style={{ color: timerColor }}>{t} sn</div>
          </div>
          <Chips st={st} pieces={th} danger />
          <div className="panel-hint">
            {th.length ? 'Bu taşlar senden sonra oynuyor. Çizgisiz yanan kareler güvenli.' : 'Çizgisiz yanan kareler güvenli. Taşına tekrar dokun: kapanır.'}
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
      <section className="panel" aria-label="Botlar oynuyor">
        <div className="panel-stack">
          <div className="panel-row">
            <svg width="30" height="30" viewBox="0 0 100 100" style={{ flex: 'none' }} aria-hidden="true">
              <rect x="12" y="12" width="44" height="44" rx="5" fill="#D3765B" />
              <path d="M24 24 L44 44 M44 24 L24 44" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
              <polygon points="66,44 92,70 66,96 40,70" fill="#6F98DA" />
              <path d="M66 58 V82 M54 70 H78" stroke="#0B1026" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <div className="panel-titles">
              <div className="panel-title">Botlar oynuyor</div>
              <div className="panel-sub">{cur && cur.kind !== 'star' ? `Şimdi #${cur.label} · alınan bot atlanır` : 'Sırayla, art arda'}</div>
            </div>
            <div className="panel-count">{Math.min(done, total)} / {total}</div>
          </div>
          <div className="segs" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} style={{ background: i < done - 1 ? '#6F7FB8' : i === done - 1 ? '#EEF2FF' : '#232D5E' }} />
            ))}
          </div>
          <button type="button" className="btn btn-fast" onClick={() => ctl.speedUp()}>
            <Icon d={ICON.fast} size={18} fill="#EEF2FF" />
            Hızlandır · ya da tahtaya dokun
          </button>
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
    who = me; timer = t; title = 'Senin sıran'; sub = 'Yanan karelerden birine dokun';
    const threats = attackersOf(st, me.r, me.c, [me.id]).length;
    if (threats) { hint = `Şu an ${threats} taş seni alabilir. Çizgili kareler tehlikeli.`; hintColor = DANGER_TXT; }
    else hint = 'Bir taşa uzun bas: nasıl yürür, nasıl alır, kimi hedefler.';
    if (collapseDue(st)) {
      sub = 'Dış halka bu turun sonunda çöküyor';
      hint = 'Turuncu çizgili halkada kalan taş elenir. İçeri gir.'; hintColor = HAZARD_TXT; border = HAZARD;
    }
    if (lastSeconds) {
      sub = 'Son saniyeler';
      hint = 'Süre biterse oyun senin yerine güvenli bir hamle yapar.'; hintColor = TXT2;
      border = DANGER; glow = '0 0 0 3px rgba(255,59,92,.18)';
    }
  } else if (view.phase === 'rakip' && actor) {
    who = actor; timer = t; barColor = colorOf(actor);
    title = `${actor.kind === 'star' ? seatName(st, actor.seat) : labelOf(st, actor)} oynuyor`;
    const next = pieceById(st, st.order[st.turn + 1]);
    sub = !next ? 'Sonra: yeni tur' : next.kind === 'star' ? `Sonra: ${labelOf(st, next)}` : 'Sonra: botlar';
    hint = me.alive ? 'Sıran gelince gidebileceğin kareler kendiliğinden yanar.' : 'İzliyorsun. Bir taşa dokun: nasıl yürür, nasıl alır.';
  } else if (view.phase === 'mod') {
    const first = actor?.kind === 'star' ? actor : null;
    who = first; title = `Mod değişti: ${modeWord(st.mode)}`;
    sub = `Tur ${st.round}${first ? ` · ilk sıra ${labelOf(st, first)}` : ''}`;
    hint = `Yıldızlar artık ${modeLower(st.mode)} gider ve ${modeLower(st.mode)} alır.`;
  } else if (view.phase === 'hazir') {
    who = me; title = 'Maç başlıyor'; sub = `Tur 1 · ${modeWord(st.mode)}`;
    hint = 'Sıran gelince gidebileceğin kareler kendiliğinden yanar.';
  } else {
    title = 'Sıra geçiyor…'; sub = `Tur ${st.round}`;
    hint = 'Bot turunda tahtaya dokunarak hızlandırabilirsin.';
  }

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
      </div>
    </section>
  );
}

