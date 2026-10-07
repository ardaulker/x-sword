import { useState } from 'react';
import { Icon } from '../components/bits';
import { AVATAR_COLORS, NAME_MAX, providerLabel, updateProfile, useProfile } from '../game/profile';
import type { Profile } from '../game/profile';
import { importProgress, progressCode } from '../game/progress';
import { platform } from '../game/platform';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import './RulesScreen.css';

// Yuvarlak profil rozeti: adın baş harfi, profil renginde.
export function ProfileAvatar({ profile, size }: { profile: Pick<Profile, 'name' | 'color'>; size: number }) {
  const initial = (profile.name.trim()[0] ?? '?').toLocaleUpperCase('tr');
  return (
    <span className="avatar" aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46), background: AVATAR_COLORS[profile.color] ?? AVATAR_COLORS[0] }}>
      {initial}
    </span>
  );
}

export function ProfileScreen({ onBack, onStats }: { onBack: () => void; onStats: () => void }) {
  const p = useProfile();
  const [name, setName] = useState(p.name);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState<'' | 'ok' | 'bad'>('');
  const s = loadStats();
  const stars = Object.values(s.puzzleStars).reduce((a, b) => a + b, 0);
  const native = platform() !== 'web';

  const copy = async () => {
    try { await navigator.clipboard.writeText(progressCode()); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* izin yok */ }
  };
  const load = () => {
    const ok = importProgress(paste);
    setResult(ok ? 'ok' : 'bad');
    if (ok) setPaste('');
  };

  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Profil')}</h1>
      </header>
      <div className="rules-body">
        <div className="rule set-col profile-card">
          <div className="profile-top">
            <ProfileAvatar profile={{ name: name || p.name, color: p.color }} size={64} />
            <label className="profile-name">
              <span>{tr('Görünen ad')}</span>
              <input value={name} maxLength={NAME_MAX} autoComplete="nickname" spellCheck={false}
                onChange={e => setName(e.target.value)} onBlur={() => { updateProfile({ name }); setName(n => n.trim() || p.name); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            </label>
          </div>
          <div className="profile-colors" role="radiogroup" aria-label={tr('Renk')}>
            {AVATAR_COLORS.map((c, i) => (
              <button key={c} type="button" role="radio" aria-checked={p.color === i} aria-label={`${tr('Renk')} ${i + 1}`}
                className={`profile-color${p.color === i ? ' is-on' : ''}`} style={{ background: c }} onClick={() => updateProfile({ color: i })} />
            ))}
          </div>
          <p className="set-note">{tr('Çok oyunculu maçta rakipler yalnız adını ve rengini görür.')}</p>
        </div>

        <div className="rule set-col">
          <div className="rule-text">
            <h3>{tr('Hesap')}</h3>
            <p><b>{providerLabel(p.provider)}</b>{p.providerName ? ` · ${p.providerName}` : ''}</p>
            <p>{p.provider === 'guest'
              ? (native ? tr('Hesabına bağlanılamadı. İlerlemen bu cihazda saklanıyor.') : tr("Bu cihazda misafir profil. Telefon uygulamasında iPhone'da Game Center, Android'de Google Play Games ile kendiliğinden bağlanır; ilerlemen hesabına kaydedilir."))
              : tr('İlerlemen hesabına kaydediliyor; yeni telefonda aynı hesapla açınca kaldığın yerden sürer.')}</p>
          </div>
        </div>

        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('İlerleme')}</h3></div>
          <div className="profile-stats">
            <div><b>{s.matches}</b><span>{tr('Maç')}</span></div>
            <div><b>{s.wins}</b><span>{tr('Galibiyet')}</span></div>
            <div><b>{stars} ★</b><span>{tr('Bulmaca yıldızı')}</span></div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onStats}>{tr('İstatistikler')}</button>
        </div>

        <div className="rule set-col">
          <div className="rule-text">
            <h3>{tr('İlerleme yedeği')}</h3>
            <p>{tr('Kodu kopyala, öbür cihazda buraya yapıştırıp yükle. İki cihazın ilerlemesi birleşir; hiçbir şey silinmez.')}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? tr('Kopyalandı') : tr('Yedek kodunu kopyala')}</button>
          <textarea className="profile-paste" rows={2} value={paste} placeholder={tr('Yedek kodunu buraya yapıştır')}
            onChange={e => { setPaste(e.target.value); setResult(''); }} />
          <button type="button" className="btn btn-main" disabled={!paste.trim()} onClick={load}>{tr('Kodu yükle')}</button>
          {result && <p className={`set-note${result === 'bad' ? ' is-bad' : ''}`}>{result === 'ok' ? tr('İlerleme yüklendi ve birleştirildi.') : tr('Bu kod okunamadı.')}</p>}
        </div>
        <p className="rules-foot">{tr('Profilin bir sunucuya gönderilmez.')}</p>
      </div>
    </div>
  );
}
