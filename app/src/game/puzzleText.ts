// Bulmaca adları ve ipuçları çevrilsin diye burada düz tr() çağrısı olarak durur (çıkarıcı yalnız düz yazıyı görür).
// tools/puzzle-maps.mjs'e yeni bulmaca eklenince buraya da ekle.
import { tr } from '../i18n';
import type { PuzzleDef } from './puzzles';

const titles = (): Record<string, string> => ({
  'Take straight': tr('Take straight'),
  'The mode changes': tr('The mode changes'),
  'Danger': tr('Danger'),
  'Corridor': tr('Corridor'),
  'Cross': tr('Cross'),
  'Ring': tr('Ring'),
  'Pillars': tr('Pillars'),
  'Staircase': tr('Staircase'),
  'Double step': tr('Double step'),
  'Mirror': tr('Mirror'),
  'Diamond': tr('Diamond'),
  'Fortress': tr('Fortress'),
  'Maze': tr('Maze'),
  'L': tr('L'),
  'U': tr('U'),
  'Armor': tr('Armor'),
  'Pair': tr('Pair'),
  'Collapse': tr('Collapse'),
  'Butterfly': tr('Butterfly'),
  'Courtyard': tr('Courtyard'),
  'Zigzag': tr('Zigzag'),
  'Hourglass': tr('Hourglass'),
  'Finale': tr('Finale'),
});

const hints = (): Record<string, string> => ({
  "It's a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm.": tr("It's a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm."),
  'The mode changes every round. Walk straight first, then take diagonally next round.': tr('The mode changes every round. Walk straight first, then take diagonally next round.'),
  'A red-striped square is dangerous: a piece will take you there. Take both pieces; pick the unstriped square first.': tr('A red-striped square is dangerous: a piece will take you there. Take both pieces; pick the unstriped square first.'),
  'The mode changes every round: straight this round, diagonal the next.': tr('The mode changes every round: straight this round, diagonal the next.'),
  'The arms are narrow. Choose well which bot to take first.': tr('The arms are narrow. Choose well which bot to take first.'),
  'The middle is empty. The short way is always along the edge.': tr('The middle is empty. The short way is always along the edge.'),
  'No one can enter a blocked square. Behind a pillar can be safe.': tr('No one can enter a blocked square. Behind a pillar can be safe.'),
  'A diagonal strip: in a straight round your path gets narrow.': tr('A diagonal strip: in a straight round your path gets narrow.'),
  'Double step takes you two squares. Wait for the right moment.': tr('Double step takes you two squares. Wait for the right moment.'),
  "Use the Mirror to take a bot's place. Sometimes it's the only way to change direction.": tr("Use the Mirror to take a bot's place. Sometimes it's the only way to change direction."),
  "Double move: two moves in a row, the bots don't play in between.": tr("Double move: two moves in a row, the bots don't play in between."),
  'The gates in the walls are narrow. Work out which gate to enter through.': tr('The gates in the walls are narrow. Work out which gate to enter through.'),
  'Narrow paths and one double step. Plan the order well.': tr('Narrow paths and one double step. Plan the order well.'),
  'Four bots, a tight corner. A greedy take leads you into a trap.': tr('Four bots, a tight corner. A greedy take leads you into a trap.'),
  'Two arms, one bottom. Which arm you start with changes everything.': tr('Two arms, one bottom. Which arm you start with changes everything.'),
  'Armor protects you once. Sometimes you must step into danger on purpose.': tr('Armor protects you once. Sometimes you must step into danger on purpose.'),
  'Double step and mirror together. Use both at the right moment.': tr('Double step and mirror together. Use both at the right moment.'),
  "The arena shrinks at the end of round 2. Stay on the orange ring and you're out.": tr("The arena shrinks at the end of round 2. Stay on the orange ring and you're out."),
  'Two wings, a narrow waist. The mirror can carry you to the other wing.': tr('Two wings, a narrow waist. The mirror can carry you to the other wing.'),
  'A courtyard closed in the middle. Work out which side of the wall to go around.': tr('A courtyard closed in the middle. Work out which side of the wall to go around.'),
  'The diagonal wall blocks you in straight rounds. Choose when to cross.': tr('The diagonal wall blocks you in straight rounds. Choose when to cross.'),
  'The waist is a single square. Spend the double move at the pass.': tr('The waist is a single square. Spend the double move at the pass.'),
  'Four bots, two bonuses. Every move counts.': tr('Four bots, two bonuses. Every move counts.'),
});

export const puzzleTitle = (t: string) => titles()[t] ?? t;
export const puzzleHint = (h: string) => hints()[h] ?? h;

// Listede ve sonuç kartında görünen sıra: eğitim ve bulmacalar ayrı sayılır.
export function puzzleNo(list: PuzzleDef[], def: PuzzleDef) {
  return list.filter(p => p.tutorial === def.tutorial).findIndex(p => p.id === def.id) + 1;
}
