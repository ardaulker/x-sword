import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../components/bits';
import { feel } from '../game/haptics';
import { paletteOf, saveSettings, settings } from '../game/settings';
import { PieceGlyph } from '../components/PieceGlyph';
import type { Settings } from '../game/settings';
import './RulesScreen.css';
import { Flag } from '../components/Flag';
import { LANGS, setLang, tr, useLang } from '../i18n';
import { SKINS, THEMES, isUnlocked, needProgress, needText } from '../game/themes';
import type { Need } from '../game/themes';
import { SkinFx } from '../components/SkinFx';
import { loadStats } from '../game/stats';

const speeds = (): [Settings['speed'], string, string][] => [
  ['yavas', tr('Yavaş'), tr('Kayma 320 ms · bot turu ~2 sn')],
  ['normal', tr('Normal'), tr('Kayma 220 ms · bot turu ~1,2 sn')],
  ['hizli', tr('Hızlı'), tr('Kayma 140 ms · bot turu ~0,8 sn')],
];

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="rule set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div className="rule-text"><h3>{label}</h3><p>{sub}</p></div>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

// Kilitli bir stilin büyük önizlemesi: neye benzediği, nasıl açıldığı ve ilerleme.
function PeekCard({ title, need, stats, children, onClose }: { title: string; need: null | Need; stats: ReturnType<typeof loadStats>; children: ReactNode; onClose: () => void }) {
  const have = need ? needProgress({ need }, stats) : 0;
  return (
    <div className="peek" role="status">
      <div className="peek-pv">{children}</div>
      <div className="peek-text">
        <b>{title}</b>
        <span>{tr('Önizleme · kilitli')}</span>
        {need && <small>{tr('Açmak için: {need}', { need: needText({ need }) })} ({have}/{need.n})</small>}
        {need && <div className="peek-bar" aria-hidden="true"><i style={{ width: `${Math.round((100 * have) / need.n)}%` }} /></div>}
      </div>
      <button type="button" className="round-btn" aria-label={tr('Kapat')} onClick={onClose}><Icon d="M6 6 L18 18 M18 6 L6 18" size={16} stroke={2.4} /></button>
    </div>
  );
}

// inGame: maç sürerken açıldı; oyunu değiştiren ayarlar gizlenir (yalnız ses, titreşim ve dil kalır).
export function SettingsScreen({ onBack, onRules, inGame = false }: { onBack: () => void; onRules?: () => void; inGame?: boolean }) {
  const lang = useLang();
  const [s, setS] = useState(settings);
  const stats = loadStats();
  // Kilitli bir stile dokunmak onu seçmez, büyük önizlemesini açar: neyi elde edeceğini görür.
  const [peek, setPeek] = useState<{ kind: 'skin' | 'theme'; id: string } | null>(null);
  const update = (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); saveSettings(next); };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Geri')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Ayarlar')}</h1>
      </header>
      <div className="rules-body">
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Dil')}</h3><p>{tr('Oyunun bütün yazıları seçtiğin dilde görünür.')}</p></div>
          <div className="seg lang-seg" role="radiogroup" aria-label={tr('Dil')}>
            {LANGS.map(l => (
              <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} className={lang === l.code ? 'is-on' : ''} aria-label={l.name} title={l.name} onClick={() => setLang(l.code)}>
                <Flag lang={l.code} width={38} />
              </button>
            ))}
          </div>
        </div>
        {onRules && (
          <button type="button" className="rule set-row" onClick={onRules}>
            <div className="rule-text"><h3>{tr('Nasıl oynanır?')}</h3><p>{tr('Kurallar, puanlar ve bonusların nasıl kazanıldığı.')}</p></div>
          </button>
        )}
        <Toggle label={tr('Ses efektleri')} sub={tr('Hamle, alma, puan, sıra, bonus ve maç sonu sesleri.')} on={s.sound}
          onChange={v => { update({ sound: v }); if (v) feel('select'); }} />
        <Toggle label={tr('Müzik')} sub={tr('Arena daralacak turlarda çalan gergin müzik.')} on={s.music}
          onChange={v => update({ music: v })} />
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Ses seviyesi')}</h3></div>
          <input type="range" className="vol" min={0} max={100} value={Math.round(s.volume * 100)} aria-label={tr('Ses seviyesi')}
            onChange={e => update({ volume: Number(e.target.value) / 100 })} onPointerUp={() => feel('select')} />
        </div>
        <Toggle label={tr('Titreşim')} sub={tr("Desteklenen telefonlarda. iPhone'da tarayıcı titreşime izin vermez.")} on={s.haptics}
          onChange={v => { update({ haptics: v }); if (v) feel('select', 20); }} />
        {!inGame && (
          <>
        <Toggle label={tr('İpuçları')} sub={tr('İlk üç maçın başında kısa bir ipucu kartı gösterir.')} on={s.tips}
          onChange={v => update({ tips: v })} />
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Animasyon hızı')}</h3><p>{tr('Taş kayması, mod kartı, halka çöküşü: hepsi bu hızla oynar.')}</p></div>
          <div className="seg" role="radiogroup" aria-label={tr('Animasyon hızı')}>
            {speeds().map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={s.speed === v} className={s.speed === v ? 'is-on' : ''} onClick={() => update({ speed: v })}>
                <b>{t}</b>
              </button>
            ))}
          </div>
          <p className="set-note">{speeds().find(x => x[0] === s.speed)?.[2]}</p>
        </div>
        <Toggle label={tr('Önizlemesiz oyna')} sub={tr('Kareye dokununca hamle hemen oynanır. Onay ekranı çıkmaz.')} on={s.quick}
          onChange={v => update({ quick: v })} />
        <Toggle label={tr('Botları hızlı oynat')} sub={tr('Bot turları bekletmez. Hamleler tek seferde oynanır.')} on={s.fastBots}
          onChange={v => update({ fastBots: v })} />
        <Toggle label={tr('Tehlike göstergesi')} sub={tr('Seni alabilecek taşların karelerini kırmızı çizgiyle gösterir.')} on={s.danger}
          onChange={v => update({ danger: v })} />
        <Toggle label={tr('Tehlike haritası')} sub={tr('Gelecek turda bir taşın seni alabileceği bütün kareleri soluk kırmızıyla gösterir.')} on={s.dangerMap}
          onChange={v => update({ dangerMap: v })} />
        <Toggle label={tr('Bot hedef işareti')} sub={tr('Botun kenarındaki üçgen, kovaladığı oyuncunun renginde. Zor modda hep gizli.')} on={s.targets}
          onChange={v => update({ targets: v })} />
        <Toggle label={tr('Bot sıra numaraları')} sub={tr('Kapalıyken numara yalnız oynayan ve sıradaki 3 taşta görünür.')} on={s.numbers}
          onChange={v => update({ numbers: v })} />
        <div className="rule set-col">
          <Toggle label={tr('Renk desteği')} sub={tr('Oyuncu renklerini daha rahat ayırt etmen için ayrı bir renk paleti kullanır. Amblemler zaten farklı.')} on={s.colorBlind}
            onChange={v => update({ colorBlind: v })} />
          <div className="set-swatches" aria-hidden="true">
            {paletteOf(s.colorBlind).map((_, i) => <PieceGlyph key={`${i}${s.colorBlind}`} kind="star" seat={i} size={36} diamond={false} />)}
          </div>
        </div>
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Taş efekti')}</h3><p>{tr('Senin yıldızında görünür. Başarılarla açılır.')}</p></div>
          <div className="theme-grid" role="radiogroup" aria-label={tr('Taş efekti')}>
            {SKINS.map(k => {
              const open = isUnlocked(k, stats);
              return (
                <button key={k.id} type="button" role="radio" aria-checked={s.skin === k.id}
                  className={`theme-chip${s.skin === k.id ? ' is-on' : ''}${open ? '' : ' is-locked'}${peek?.id === k.id && peek.kind === 'skin' ? ' is-peek' : ''}`}
                  onClick={() => { if (open) { update({ skin: k.id }); setPeek(null); } else setPeek({ kind: 'skin', id: k.id }); }}>
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
          {peek?.kind === 'skin' && (() => {
            const k = SKINS.find(x => x.id === peek.id)!;
            return (
              <PeekCard title={k.name()} need={k.need} stats={stats} onClose={() => setPeek(null)}>
                <PieceGlyph kind="star" seat={0} size={76} diamond={false}><SkinFx id={k.id} /></PieceGlyph>
              </PeekCard>
            );
          })()}
        </div>
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Tahta teması')}</h3><p>{tr('Oynadıkça yeni temalar açılır.')}</p></div>
          <div className="theme-grid" role="radiogroup" aria-label={tr('Tahta teması')}>
            {THEMES.map(t => {
              const open = isUnlocked(t, stats);
              return (
                <button key={t.id} type="button" role="radio" aria-checked={s.theme === t.id}
                  className={`theme-chip${s.theme === t.id ? ' is-on' : ''}${open ? '' : ' is-locked'}${peek?.id === t.id && peek.kind === 'theme' ? ' is-peek' : ''}`}
                  onClick={() => { if (open) { update({ theme: t.id }); setPeek(null); } else setPeek({ kind: 'theme', id: t.id }); }}>
                  <span className="theme-sw" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${t.kare} 50%, ${t.kare2} 50%)`, boxShadow: `inset 0 0 0 5px ${t.cerceve}` }}>
                    {!open && <Icon d="M7 11 V8 A5 5 0 0 1 17 8 V11 M6 11 H18 V20 H6 Z" size={16} stroke={2.2} />}
                  </span>
                  <b>{t.name()}</b>
                  {!open && t.need && <small>{needText(t)} ({needProgress(t, stats)}/{t.need.n})</small>}
                </button>
              );
            })}
          </div>
          {peek?.kind === 'theme' && (() => {
            const t = THEMES.find(x => x.id === peek.id)!;
            return (
              <PeekCard title={t.name()} need={t.need} stats={stats} onClose={() => setPeek(null)}>
                <div className="peek-board" style={{ background: t.cerceve }}>
                  {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ background: (Math.floor(i / 7) + i) % 2 ? t.kare2 : t.kare }} />)}
                  <span className="peek-star"><PieceGlyph kind="star" seat={0} size={22} diamond={false} /></span>
                </div>
              </PeekCard>
            );
          })()}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
