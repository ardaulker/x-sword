import { useState } from 'react';
import { Icon } from '../components/bits';
import { contactEmail, hasOwnText, legalDocs, updatedOn } from '../legal';
import { useLang, tr } from '../i18n';
import './RulesScreen.css';

// Settings → Legal documents: the list, and one document at a time. `docId` comes from the address (#/legal/privacy).
export function LegalScreen({ docId, onOpen, onBack }: { docId: string; onOpen: (id: string) => void; onBack: () => void }) {
  const lang = useLang();
  const docs = legalDocs(lang);
  const doc = docs.find(d => d.id === docId) ?? null;
  const [confirm, setConfirm] = useState(false);
  const date = new Date(updatedOn).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });

  const eraseAll = () => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('xsword-')).forEach(k => localStorage.removeItem(k));
    } catch { /* private tab: nothing to erase */ }
    location.hash = '#/';
    location.reload();
  };

  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={doc ? () => onOpen('') : onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{doc ? doc.title : tr('Legal documents')}</h1>
      </header>
      <div className="rules-body">
        {!doc && (
          <>
            {docs.map(d => (
              <button key={d.id} type="button" className="rule set-row" onClick={() => onOpen(d.id)}>
                <div className="rule-text"><h3>{d.title}</h3><p>{d.summary}</p></div>
                <Icon d="M9 5 L16 12 L9 19" size={18} stroke={2.4} />
              </button>
            ))}
            <div className="rule set-col">
              <div className="rule-text">
                <h3>{tr('Delete data on this device')}</h3>
                <p>{tr('Removes your settings, statistics, puzzle stars, profile and paused match from this device. This cannot be undone.')}</p>
              </div>
              {confirm ? (
                <div className="btn-row">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>{tr('Cancel')}</button>
                  <button type="button" className="btn btn-main" style={{ background: 'var(--danger)' }} onClick={eraseAll}>{tr('Delete everything')}</button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirm(true)}>{tr('Delete data on this device')}</button>
              )}
            </div>
          </>
        )}
        {doc && doc.sections.map(s => (
          <div key={s.h} className="rule">
            <div className="rule-text">
              <h3>{s.h}</h3>
              {s.p.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          </div>
        ))}
        <p className="rules-foot">
          {tr('Last updated: {date}', { date })}
          {contactEmail && <><br />{tr('Contact: {email}', { email: contactEmail })}</>}
          {!hasOwnText(lang) && <><br />{tr('Legal documents are available in English and Turkish. The English text applies in other languages.')}</>}
        </p>
      </div>
    </div>
  );
}
