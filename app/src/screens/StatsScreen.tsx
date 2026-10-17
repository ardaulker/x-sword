import { Icon } from '../components/bits';
import { loadStats } from '../game/stats';
import { ACHIEVEMENTS, achievementProgress, isEarned } from '../game/achievements';
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
        <h2>{tr('Achievements')} · {tr('{a}/{b} unlocked', { a: ACHIEVEMENTS.filter(a => isEarned(a, s)).length, b: ACHIEVEMENTS.length })}</h2>
        {ACHIEVEMENTS.map(a => {
          const done = isEarned(a, s), have = achievementProgress(a, s);
          return (
            <div key={a.id} className={`rule ach${done ? ' is-done' : ''}`}>
              <span className="ach-icon" aria-hidden="true"><Icon d={done ? 'M5 12.5 L10 17 L19 7' : a.icon} size={24} stroke={2.2} /></span>
              <div className="rule-text">
                <h3>{a.name()}</h3>
                <p>{a.desc()}</p>
                {!done && a.n > 1 && (
                  <>
                    <small className="ach-count">{have}/{a.n}</small>
                    <div className="peek-bar" aria-hidden="true"><i style={{ width: `${Math.round((100 * have) / a.n)}%` }} /></div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <p className="rules-foot">{tr('Statistics are stored only on this device.')}</p>
      </div>
    </div>
  );
}
