import type { ReactNode } from 'react';
import { POINTS, SURVIVOR_BONUS } from '../../../engine/rules.js';
import { Icon } from '../components/bits';
import { PieceGlyph } from '../components/PieceGlyph';
import type { PieceLook } from '../components/PieceGlyph';
import { CROSS, DANGER, ICE, PLUS } from '../game/look';
import './RulesScreen.css';

const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// 3×3 küçük tahta: ortada taş, yürüdüğü kareler nokta, alabildiği kareler nişan.
function Mini({ piece, diamond, walk, take }: { piece: PieceLook; diamond: boolean; walk: number[][]; take: number[][] }) {
  const cells: ReactNode[] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      const w = walk.some(([a, b]) => a === r && b === c), t = take.some(([a, b]) => a === r && b === c);
      cells.push(
        <div key={`${r},${c}`} className="mini-cell">
          {r === 0 && c === 0 && <PieceGlyph {...piece} size={30} diamond={diamond} />}
          {w && <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="12" fill={ICE} /></svg>}
          {t && <svg viewBox="0 0 100 100"><path d={take === ORTH ? PLUS : CROSS} stroke={DANGER} strokeWidth="11" strokeLinecap="round" fill="none" /></svg>}
        </div>,
      );
    }
  }
  return <div className="mini">{cells}</div>;
}

function Card({ visual, title, children, soon }: { visual: ReactNode; title: string; children: ReactNode; soon?: boolean }) {
  return (
    <article className={`rule${soon ? ' is-soon' : ''}`}>
      <div className="rule-visual" aria-hidden="true">{visual}</div>
      <div className="rule-text">
        <h3>{title}{soon && <span className="menu-soon">Yakında</span>}</h3>
        {children}
      </div>
    </article>
  );
}

export function RulesScreen({ onBack }: { onBack: () => void }) {
  const star: PieceLook = { kind: 'star', seat: 0 };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label="Geri" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>Nasıl oynanır?</h1>
      </header>

      <div className="rules-body">
        <h2>Temel kurallar</h2>
        <Card title="Amaç" visual={<div className="anim-float">+{POINTS.star}</div>}>
          <p>Rakipleri al ve puan topla. Maç tek yıldız kalınca biter. Kazananı skor belirler, saklanmak tek başına kazandırmaz.</p>
        </Card>
        <Card title="Her tur mod değişir" visual={<div className="anim-morph"><PieceGlyph {...star} size={44} diamond={false} /></div>}>
          <p><b>DÜZ</b> turda yıldızlar düz gider ve düz alır. <b>ÇAPRAZ</b> turda çapraz gider ve çapraz alır.</p>
          <p>Şekil yönü söyler: kare düz, elmas çapraz.</p>
        </Card>
        <Card title="Taşlar" visual={<Mini piece={{ kind: 'red' }} diamond={false} walk={ORTH} take={DIAG} />}>
          <p><b>Kızıl bot</b> (kare, ×): düz yürür, çapraz alır.</p>
          <p><b>Çelik bot</b> (elmas, +): çapraz yürür, düz alır.</p>
          <p>Herkes tek kare gider. Noktalar yürüyüş, nişanlar almadır.</p>
        </Card>
        <Card title="Almak" visual={<Mini piece={star} diamond={false} walk={[]} take={ORTH} />}>
          <p>Bir taşın karesine geçersen onu alırsın; o taş oyundan çıkar. Herkes herkesi alabilir: oyuncu oyuncuyu, bot oyuncuyu, bot botu.</p>
        </Card>
        <Card title="Hamle sırası" visual={<div className="anim-queue">{[3, 4, 5, 6, 7].map(n => <span key={n}>{n}</span>)}</div>}>
          <p>Sıra maç başında bir kez karılır ve bütün maç aynı kalır. Taşın üstündeki numara sıradaki yeridir. Üstteki şerit şu an oynayanı ve sıradakileri gösterir.</p>
          <p>Hamle iki adımdır: kareye dokun, önizlemeyi gör, onayla. Süren 20 saniye; biterse oyun senin yerine güvenli bir hamle yapar.</p>
        </Card>

        <h2>Tahta</h2>
        <Card title="Arena daralır" visual={<div className="anim-ring">{Array.from({ length: 25 }, (_, i) => {
          const r = Math.floor(i / 5), c = i % 5, edge = r === 0 || c === 0 || r === 4 || c === 4;
          return <div key={i} className={edge ? 'cell-flow' : ''} style={{ background: edge ? 'var(--pat-hazard)' : 'var(--kare)' }} />;
        })}</div>}>
          <p>Her 6 turda bir (6., 12., 18. tur), turun sonunda en dıştaki halka çöker.</p>
          <p>Bir tur önce halka ince turuncu kenarla, çökeceği tur turuncu çizgiyle işaretlenir. Orada kalan taş elenir. İçeri gir!</p>
        </Card>

        <h2>Skor</h2>
        <Card title="Puan" visual={<div className="rule-points"><span>Oyuncu <b>{POINTS.star}</b></span><span>İkiz <b>{POINTS.twin}</b></span><span>Bot <b>{POINTS.red}</b></span></div>}>
          <p>Almak puan kazandırır. Skor tablosu anında güncellenir; puan, aldığın karede de belirir.</p>
          <p>Ayakta kalan son yıldız +{SURVIVOR_BONUS} hayatta kalma bonusu alır.</p>
          <p>2–4 oyunculu maçta rakip yıldızlar gidince kazanan belli olur; istersen botlarla savaşa devam edersin.</p>
        </Card>
        <Card title="Sıralama" visual={<ol className="rule-rank"><li>Skor</li><li>Alma sayısı</li><li>Hayatta kalma</li></ol>}>
          <p>Önce skor bakılır. Eşitse daha çok alan, o da eşitse daha uzun ayakta kalan önde olur. Erken elenen ama çok alan oyuncu da birinci olabilir.</p>
        </Card>

        <h2>Modlar</h2>
        <Card title="Kolay · Normal · Zor" visual={<PieceGlyph kind="blue" size={44} diamond svgExtra={<path d="M114 50 L94 37 L94 63 Z" fill="#3BFF8F" stroke="#0B1026" strokeWidth="4" />} />}>
          <p><b>Kolay:</b> ilk sen oynarsın. <b>Normal:</b> sıradaki yerin rastgele. <b>Zor:</b> yerin rastgele ve botların hedef üçgeni gizli; kimi kovaladığını tahmin etmen gerekir.</p>
          <p>Botun kenarındaki üçgen, kovaladığı oyuncunun yönünde ve renginde durur.</p>
        </Card>
        <Card title="Tek oyunculu: İkiz" visual={<div className="rule-pair"><PieceGlyph {...star} size={34} diamond={false} /><PieceGlyph kind="twin" seat={0} size={34} diamond={false} /></div>}>
          <p>İkiz senin aynandır: senden hemen sonra, senin yaptığın yönün aynısını oynar. O kare doluysa oradaki taşı alır, yol kapalıysa yerinde kalır. Seni hiç alamaz. Bütün botlar gidince kazanırsın; İkiz'i almana gerek yok. İkiz bir taş alırsa sana çift puan ve bir Ayna bonusu verir.</p>
        </Card>

        <h2>Bonuslar</h2>
        <Card title="Zırh" visual={<Icon d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z" size={36} stroke={2} />}>
          <p>+1 can: seni bir kez alınmaktan korur. Kendiliğinden çalışır; seni alan taş geri döner.</p>
          <p className="rule-when"><b>Nasıl kazanılır:</b> arena ilk kez daraldığında hâlâ ayaktaysan.</p>
        </Card>
        <Card title="Çift adım" visual={<Icon d="M4 12 H12 M9 8 L13 12 L9 16 M12 12 H20 M17 8 L21 12 L17 16" size={36} stroke={2} />}>
          <p>Bu hamlede iki kare gidersin (aradaki kare boş olmalı).</p>
          <p className="rule-when"><b>Nasıl kazanılır:</b> 20 puana ulaşınca. 60 puanda ikisinden biri rastgele gelir. Maça bir tane ile başlarsın.</p>
        </Card>
        <Card title="Çift hamle" visual={<Icon d="M3 5 L12 12 L3 19 Z M12 5 L21 12 L12 19 Z" size={36} stroke={2} />}>
          <p>Hamlenden sonra hemen bir hamle daha yaparsın.</p>
          <p className="rule-when"><b>Nasıl kazanılır:</b> 40 puana ulaşınca. 60 puanda çift adımla birlikte rastgele gelir.</p>
        </Card>
        <Card title="Ayna" visual={<Icon d="M4 8 H18 M15 5 L18 8 L15 11 M20 16 H6 M9 13 L6 16 L9 19" size={36} stroke={2} />}>
          <p>En fazla 3 kare uzaktaki bir taşla yer değiştirirsin.</p>
          <p className="rule-when"><b>Nasıl kazanılır:</b> tek oyunculu modda İkiz bir taş alınca. Aynı alma sana çift puan da yazar.</p>
        </Card>
        <p className="rules-foot">Herkes maça bir çift adımla başlar. Sıran gelince paneldeki bonusa dokun, kareler ona göre yanar.</p>
      </div>
    </div>
  );
}
