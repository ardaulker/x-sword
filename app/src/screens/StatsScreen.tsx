import { Icon } from '../components/bits';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import './RulesScreen.css';

const hours = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? tr('{n} dk', { n: m }) : tr('{h} sa {m} dk', { h: Math.floor(m / 60), m: m % 60 });
};

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const s = loadStats();
  const stars = Object.values(s.puzzleStars).reduce((a, b) => a + b, 0);
  const tiles: [string, string][] = [
    [String(s.matches), tr('Maç')],
    [String(s.wins), tr('Galibiyet')],
    [s.matches ? `%${Math.round((100 * s.wins) / s.matches)}` : '–', tr('Kazanma oranı')],
    [String(s.bestScore), tr('En iyi skor')],
    [String(s.takes), tr('Aldığın taş')],
    [String(s.bestRounds), tr('En uzun hayatta kalma (tur)')],
    [hours(s.totalMs), tr('Oynama süresi')],
    [String(s.dailyPlayed), tr('Günlük meydan okuma')],
    [`${stars} ★`, tr('Bulmaca yıldızı')],
  ];
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('İstatistikler')}</h1>
      </header>
      <div className="rules-body">
        <div className="stat-grid">
          {tiles.map(([v, l]) => (
            <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
        <p className="rules-foot">{tr('İstatistikler yalnız bu cihazda saklanır.')}</p>
      </div>
    </div>
  );
}
