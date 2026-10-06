import { Icon } from '../components/bits';
import { PUZZLES } from '../game/puzzles';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import './RulesScreen.css';

export function PuzzleScreen({ onBack, onPick }: { onBack: () => void; onPick: (id: number) => void }) {
  const stars = loadStats().puzzleStars;
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Bulmacalar')}</h1>
      </header>
      <div className="rules-body">
        <p className="rules-foot" style={{ marginTop: 0 }}>{tr('Sınırlı hamlede bütün botları al. Az hamlede çözmek daha çok yıldız verir.')}</p>
        <div className="puzzle-grid">
          {PUZZLES.map(p => {
            const got = stars[p.id] ?? 0;
            return (
              <button key={p.id} type="button" className="puzzle-btn" onClick={() => onPick(p.id)}>
                <b>{p.id}</b>
                <span className="puzzle-stars" aria-label={tr('{n} yıldız', { n: got })}>{'★'.repeat(got)}{'☆'.repeat(3 - got)}</span>
                <span className="puzzle-par">{tr('{n} hamle', { n: p.par })}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
