import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './bits';
import { PieceGlyph } from './PieceGlyph';
import { SkinFx } from './SkinFx';
import { SKINS, isUnlocked, needProgress, needText } from '../game/themes';
import type { Need } from '../game/themes';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import '../screens/RulesScreen.css';

// Big preview of a locked style: what it looks like, how it unlocks and the progress.
export function PeekCard({ title, need, stats, children, onClose }: { title: string; need: null | Need; stats: ReturnType<typeof loadStats>; children: ReactNode; onClose: () => void }) {
  const have = need ? needProgress({ need }, stats) : 0;
  return (
    <div className="peek" role="status">
      <div className="peek-pv">{children}</div>
      <div className="peek-text">
        <b>{title}</b>
        <span>{tr('Preview · locked')}</span>
        {need && <small>{tr('To unlock: {need}', { need: needText({ need }) })} ({have}/{need.n})</small>}
        {need && <div className="peek-bar" aria-hidden="true"><i style={{ width: `${Math.round((100 * have) / need.n)}%` }} /></div>}
      </div>
      <button type="button" className="round-btn" aria-label={tr('Close')} onClick={onClose}><Icon d="M6 6 L18 18 M18 6 L6 18" size={16} stroke={2.4} /></button>
    </div>
  );
}

// The piece effects (flame, lightning ...) shown on your star. Tapping a locked one opens a big preview with how to unlock it.
// Used in Settings and in the new-game sheet ("Customize character").
export function SkinPicker({ skin, onPick, title = true }: { skin: string; onPick: (id: string) => void; title?: boolean }) {
  const stats = loadStats();
  const [peek, setPeek] = useState<string | null>(null);
  return (
    <div className="rule set-col">
      {title && <div className="rule-text"><h3>{tr('Piece effect')}</h3><p>{tr('Shown on your star. Unlocked by achievements.')}</p></div>}
      <div className="theme-grid" role="radiogroup" aria-label={tr('Piece effect')}>
        {SKINS.map(k => {
          const open = isUnlocked(k, stats);
          return (
            <button key={k.id} type="button" role="radio" aria-checked={skin === k.id}
              className={`theme-chip${skin === k.id ? ' is-on' : ''}${open ? '' : ' is-locked'}${peek === k.id ? ' is-peek' : ''}`}
              onClick={() => { if (open) { onPick(k.id); setPeek(null); } else setPeek(k.id); }}>
              <span className="skin-pv" aria-hidden="true">
                <PieceGlyph kind="star" seat={0} size={34} diamond={false}><SkinFx id={k.id} /></PieceGlyph>
                {!open && <Icon d="M7 11 V8 A5 5 0 0 1 17 8 V11 M6 11 H18 V20 H6 Z" size={16} stroke={2.2} />}
              </span>
              <b>{k.name()}</b>
              {!open && k.need && <small>{needText(k)} ({needProgress(k, stats)}/{k.need.n})</small>}
            </button>
          );
        })}
      </div>
      {peek && (() => {
        const k = SKINS.find(x => x.id === peek)!;
        return (
          <PeekCard title={k.name()} need={k.need} stats={stats} onClose={() => setPeek(null)}>
            <PieceGlyph kind="star" seat={0} size={76} diamond={false}><SkinFx id={k.id} /></PieceGlyph>
          </PeekCard>
        );
      })()}
    </div>
  );
}
