import { Icon } from '../components/bits';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import './RulesScreen.css';

const hours = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? tr('{n} min', { n: m }) : tr('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 });
};

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const s = loadStats();
  const stars = Object.values(s.puzzleStars).reduce((a, b) => a + b, 0);
  const tiles: [string, string][] = [
    [String(s.matches), tr('Matches')],
    [String(s.wins), tr('Wins')],
    [s.matches ? `%${Math.round((100 * s.wins) / s.matches)}` : '–', tr('Win rate')],
    [String(s.bestScore), tr('Best score')],
    [String(s.takes), tr('Pieces taken')],
    [String(s.bestRounds), tr('Longest survival (rounds)')],
    [hours(s.totalMs), tr('Time played')],
    [String(s.dailyPlayed), tr('Daily challenge')],
    [`${stars} ★`, tr('Puzzle stars')],
  ];
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Statistics')}</h1>
      </header>
      <div className="rules-body">
        <div className="stat-grid">
          {tiles.map(([v, l]) => (
            <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
        <p className="rules-foot">{tr('Statistics are stored only on this device.')}</p>
      </div>
    </div>
  );
}
