import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BOARD_PAD, Board, boardGap, boardOuter } from '../components/Board';
import { Icon } from '../components/bits';
import { PlayerStrip } from '../components/PlayerStrip';
import { GameController } from '../game/controller';
import { modeWord } from '../game/names';
import { parseReplay } from '../game/record';
import { tr } from '../i18n';
import './RulesScreen.css';

// Maç tekrarı: tohum + hamle listesinden maçı baştan oynatır. Tahtaya dokunmak bir şey yapmaz.
export function ReplayScreen({ code, onBack }: { code: string; onBack: () => void }) {
  const spec = parseReplay(code);
  const [ctl] = useState(() => {
    const c = new GameController();
    if (spec) c.loadReplay(spec);
    return c;
  });
  const view = useSyncExternalStore(ctl.subscribe, ctl.getSnapshot);
  const [playing, setPlaying] = useState(false);
  const [fast, setFast] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => () => ctl.dispose(), [ctl]);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(e => setStage({ w: e[0].contentRect.width, h: e[0].contentRect.height }));
    if (stageRef.current) {
      setStage({ w: stageRef.current.clientWidth, h: stageRef.current.clientHeight });
      ro.observe(stageRef.current);
    }
    return () => ro.disconnect();
  }, [!!spec]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = ctl.replay;
  const total = r?.moves.length ?? 0, i = r?.i ?? 0;
  useEffect(() => {
    if (!playing) return;
    if (i >= total) { setPlaying(false); return; }
    const id = window.setTimeout(() => ctl.seek(i + 1), 700 / fast);
    return () => clearTimeout(id);
  }, [playing, i, total, fast, ctl, view.version]);

  if (!spec || !r) {
    return (
      <div className="rules">
        <header className="rules-head">
          <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
          <h1>{tr('Maç tekrarı')}</h1>
        </header>
        <div className="rules-body"><p className="rules-foot">{tr('Bu tekrar bağlantısı bozuk.')}</p></div>
      </div>
    );
  }
  const st = ctl.state, n = st.size, gap = boardGap(n);
  const fit = (a: number) => Math.floor((a - 2 * BOARD_PAD - gap * (n - 1)) / n);
  const cell = Math.max(14, Math.min(fit(stage.w - 12), fit(stage.h - 8)));
  const outer = boardOuter(n, cell);
  const btn = (label: string, d: string, on: () => void, disabled = false) => (
    <button type="button" className="round-btn" aria-label={label} disabled={disabled} onClick={on}><Icon d={d} size={20} stroke={2.4} /></button>
  );
  return (
    <div className="rules replay">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Maç tekrarı')}</h1>
      </header>
      <PlayerStrip ctl={ctl} view={view} compact />
      <div className="replay-info">{tr('Tur {n}', { n: st.round })} · {modeWord(st.mode)} · {tr('hamle {a}/{b}', { a: i, b: total })}</div>
      <div ref={stageRef} className="replay-stage">
        {stage.w > 0 && <div style={{ width: outer, margin: '0 auto' }}><Board ctl={ctl} view={view} cell={cell} /></div>}
      </div>
      <input className="replay-bar" type="range" min={0} max={total} value={i} aria-label={tr('Hamle')}
        onChange={e => { setPlaying(false); ctl.seek(Number(e.target.value)); }} />
      <div className="replay-ctl">
        {btn(tr('Başa dön'), 'M6 5 V19 M18 6 L9 12 L18 18 Z', () => { setPlaying(false); ctl.seek(0); }, i === 0)}
        {btn(tr('Önceki hamle'), 'M15 5 L8 12 L15 19', () => { setPlaying(false); ctl.seek(i - 1); }, i === 0)}
        {btn(playing ? tr('Duraklat') : tr('Oynat'), playing ? 'M8 5 V19 M16 5 V19' : 'M7 4.5 L19 12 L7 19.5 Z', () => { if (i >= total) ctl.seek(0); setPlaying(p => !p); })}
        {btn(tr('Sonraki hamle'), 'M9 5 L16 12 L9 19', () => { setPlaying(false); ctl.seek(i + 1); }, i >= total)}
        <button type="button" className="round-btn replay-speed" aria-label={tr('Hız')} onClick={() => setFast(f => (f >= 4 ? 1 : f * 2))}>{fast}×</button>
      </div>
    </div>
  );
}
