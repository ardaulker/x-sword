import type { CSSProperties, ReactNode } from 'react';
import { POINTS, SURVIVOR_BONUS } from '../../../engine/rules.js';
import { Icon } from '../components/bits';
import { PieceGlyph } from '../components/PieceGlyph';
import type { PieceLook } from '../components/PieceGlyph';
import { CROSS, DANGER, ICE, PLUS } from '../game/look';
import { rich, tr } from '../i18n';
import './RulesScreen.css';

const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Small 3×3 board: the piece in the middle, dots on squares it walks to, crosshairs on squares it takes.
// hop: the middle piece walks or takes by this offset (row, col) and returns; prey: a piece on the hop square that vanishes when taken.
function Mini({ piece, diamond, walk, take, hop, prey }: { piece: PieceLook; diamond: boolean; walk: number[][]; take: number[][]; hop?: number[]; prey?: PieceLook }) {
  const cells: ReactNode[] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      const w = walk.some(([a, b]) => a === r && b === c), t = take.some(([a, b]) => a === r && b === c);
      cells.push(
        <div key={`${r},${c}`} className="mini-cell">
          {r === 0 && c === 0 && (hop
            ? <div className="mini-mover" style={{ '--dr': hop[0], '--dc': hop[1] } as CSSProperties}><PieceGlyph {...piece} size={30} diamond={diamond} /></div>
            : <PieceGlyph {...piece} size={30} diamond={diamond} />)}
          {prey && hop && r === hop[0] && c === hop[1] && <div className="mini-prey"><PieceGlyph {...prey} size={30} diamond={!diamond} /></div>}
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
        <h3>{title}{soon && <span className="menu-soon">{tr('Soon')}</span>}</h3>
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
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('How to play')}</h1>
      </header>

      <div className="rules-body">
        <h2>{tr('Basic rules')}</h2>
        <Card title={tr('Goal')} visual={<div className="anim-float">+{POINTS.star}</div>}>
          <p>{tr("Take your rivals and collect points. The match ends when one star is left. The score decides the winner; hiding alone doesn't win.")}</p>
        </Card>
        <Card title={tr('The mode changes every round')} visual={<div className="anim-morph"><PieceGlyph {...star} size={44} diamond={false} /></div>}>
          <p>{rich('In a **STRAIGHT** round, stars move straight and take straight. In a **DIAGONAL** round, they move and take diagonally.')}</p>
          <p>{tr('The shape tells the direction: square is straight, diamond is diagonal.')}</p>
        </Card>
        <Card title={tr('Pieces')} visual={<Mini piece={{ kind: 'red' }} diamond={false} walk={ORTH} take={DIAG} hop={[-1, 0]} />}>
          <p>{rich('**Red bot** (square, ×): walks straight, takes diagonally.')}</p>
          <p>{rich('**Steel bot** (diamond, +): walks diagonally, takes straight.')}</p>
          <p>{tr('Everyone moves one square. Dots are walks, crosshairs are takes.')}</p>
        </Card>
        <Card title={tr('Taking')} visual={<Mini piece={star} diamond={false} walk={[]} take={ORTH} hop={[0, 1]} prey={{ kind: 'red' }} />}>
          <p>{tr("Step onto a piece's square and you take it; that piece leaves the game. Anyone can take anyone: player takes player, bot takes player, bot takes bot.")}</p>
        </Card>
        <Card title={tr('Move order')} visual={<div className="anim-queue">{[3, 4, 5, 6, 7].map(n => <span key={n}>{n}</span>)}</div>}>
          <p>{tr("The order is shuffled once at the start and stays the same all match. The number on a piece is its place among the players still alive; numbers are re-dealt every round, the order itself never changes. The strip on top shows who's playing and who's next.")}</p>
          <p>{tr('A move takes two steps: tap a square, see the preview, confirm. You have 20 seconds; if time runs out, the game plays a safe move for you.')}</p>
        </Card>

        <h2>{tr('Board')}</h2>
        <Card title={tr('The arena shrinks')} visual={<div className="anim-ring">{Array.from({ length: 25 }, (_, i) => {
          const r = Math.floor(i / 5), c = i % 5, edge = r === 0 || c === 0 || r === 4 || c === 4;
          return <div key={i} className={edge ? 'cell-flow' : ''} style={{ background: edge ? 'var(--pat-hazard)' : 'var(--square)' }} />;
        })}</div>}>
          <p>{tr('Every 6 rounds (6th, 12th, 18th), the outermost ring collapses at the end of the round.')}</p>
          <p>{tr('One round before, the ring gets a thin orange edge; in the collapsing round it is marked with orange stripes. A piece left there is out. Move inward!')}</p>
        </Card>

        <h2>{tr('Score')}</h2>
        <Card title={tr('Points')} visual={<div className="rule-points"><span>{tr('Player')} <b>{POINTS.star}</b></span><span>{tr('Twin')} <b>{POINTS.twin}</b></span><span>{tr('Bot')} <b>{POINTS.red}</b></span></div>}>
          <p>{tr('Taking earns points. The scoreboard updates instantly; the points also pop up on the square you took.')}</p>
          <p>{tr('The last star standing gets a +{n} survival bonus.', { n: SURVIVOR_BONUS })}</p>
          <p>{tr('In a 2–4 player match, the winner is decided once the rival stars are gone; if you like, you can keep fighting the bots.')}</p>
        </Card>
        <Card title={tr('Ranking')} visual={<ol className="rule-rank"><li>{tr('Score')}</li><li>{tr('Number of takes')}</li><li>{tr('Survival')}</li></ol>}>
          <p>{tr('Score comes first. On a tie, more takes wins; if still tied, whoever lasted longer. A player who is knocked out early but took a lot can still finish first.')}</p>
        </Card>

        <h2>{tr('Modes')}</h2>
        <Card title={tr('Easy · Normal · Hard')} visual={<PieceGlyph kind="blue" size={44} diamond svgExtra={<path d="M114 50 L94 37 L94 63 Z" fill="#3BFF8F" stroke="#0B1026" strokeWidth="4" />} />}>
          <p>{rich("**Easy:** you play first. **Normal:** your place in the order is random. **Hard:** your place is random and the bots' target triangle is hidden; you must guess who they chase.")}</p>
          <p>{tr("The triangle on a bot's edge points toward the player it chases, in that player's color.")}</p>
          <p>{tr('On Easy you can undo your move 3 times per match; unlimited in puzzles.')}</p>
          <p>{tr("On the new match screen you pick the board (at least 9, 11, 13; at most 15) and the number of bots. The AI rivals' and the arena bots' intelligence are set separately: a Hard rival hunts like a predator, a Normal one sometimes slips.")}</p>
        </Card>
        <Card title={tr('Solo: the Twin')} visual={<div className="rule-pair"><PieceGlyph {...star} size={34} diamond={false} /><PieceGlyph kind="twin" seat={0} size={34} diamond={false} /></div>}>
          <p>{tr("The Twin is your mirror: right after you, it plays the same direction you did. If that square is occupied it takes the piece there; if the way is blocked it stays put. It can never take you. You win when all bots are gone; you don't need to take the Twin. If the Twin takes a piece, you get double points and a Mirror bonus.")}</p>
        </Card>

        <Card title={tr('Options')} visual={<Icon d="M4 7 H14 M18 7 H20 M4 17 H8 M12 17 H20 M16 5 V9 M10 15 V19" size={36} stroke={2} />}>
          <p>{rich("**Teams (2 vs 2):** with 4 players, opposite corners form a team. You can't take your teammate; you win when both stars of the other team are gone.")}</p>
          <p>{rich("**Obstacle squares:** the board has blocked squares that never touch each other; pieces can't enter them or jump over them with a double step.")}</p>
          <p>{rich('**Rival personalities:** AI rivals play as a hunter, a cautious one or an opportunist.')}</p>
        </Card>
        <Card title={tr('Puzzles')} visual={<Icon d="M10 3 H14 V6 A2 2 0 1 0 18 6 V3 H21 V9 H18 A2 2 0 1 0 18 13 H21 V21 H3 V13 H6 A2 2 0 1 1 6 9 H3 V3 Z" size={36} stroke={2} />}>
          <p>{tr("Take every bot within a limited number of moves. Bots don't walk, but they take you if you step into their reach. Solving in fewer moves earns more stars.")}</p>
        </Card>

        <h2>{tr('Bonuses')}</h2>
        <Card title={tr('Armor')} visual={<Icon d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z" size={36} stroke={2} />}>
          <p>{tr('+1 life: protects you from being taken once. It works by itself; the piece that tried to take you bounces back.')}</p>
          <p className="rule-when">{rich('**How to earn it:** be still standing when the arena shrinks for the first time.')}</p>
        </Card>
        <Card title={tr('Double step')} visual={<Icon d="M4 12 H12 M9 8 L13 12 L9 16 M12 12 H20 M17 8 L21 12 L17 16" size={36} stroke={2} />}>
          <p>{tr('This move you go two squares (the square between must be empty).')}</p>
          <p className="rule-when">{rich('**How to earn it:** reach 20 points. At 60 points you get one of the two at random. You start the match with one.')}</p>
        </Card>
        <Card title={tr('Double move')} visual={<Icon d="M3 5 L12 12 L3 19 Z M12 5 L21 12 L12 19 Z" size={36} stroke={2} />}>
          <p>{tr('After your move you immediately make another.')}</p>
          <p className="rule-when">{rich('**How to earn it:** reach 40 points, and survive the second shrink. At 60 points it comes at random alongside Double step.')}</p>
        </Card>
        <Card title={tr('Switcheroo')} visual={<Icon d="M4 8 H18 M15 5 L18 8 L15 11 M20 16 H6 M9 13 L6 16 L9 19" size={36} stroke={2} />}>
          <p>{tr('Swap places with any piece on the board (a rival star or a bot).')}</p>
          <p className="rule-when">{rich('**How to earn it:** reach 50 points. In solo mode it also comes when the Twin takes a piece; that take scores you double points too.')}</p>
        </Card>
        <p className="rules-foot">{tr('Everyone starts with a Double step. On your turn, tap a bonus in the panel and the squares light up for it.')}</p>
      </div>
    </div>
  );
}
