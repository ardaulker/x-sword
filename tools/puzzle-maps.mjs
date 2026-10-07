// Bulmaca haritaları: her biri bir fikri öğretir. Haritayı elle çiziyoruz, taşların yerini üretici arar.
// '.' zemin, '#' engel, '-' harita dışı, 'S' sen (yoksa üretici koyar), 'K' / 'C' sabit bot.
// bots: üreticinin koyacağı bot sayısı. par: hedef en az hamle. bonuses: başta verilen bonuslar.
// needBonus: bonus olmadan par+1 hamlede çözülmemeli (bonus şart). botCols: en az bir bot bu sütunlarda olur.
// Yeni harita eklerken CLAUDE.md'deki "Bulmaca haritaları" listesine bak; aynı fikri tekrar etme.
// near: botlar sana en çok bu kadar (Chebyshev) uzak konur.
// trap: ilk hamlede en az bir "tuzak" olmalı (oynayınca hemen alınırsın).
// shrink: { start, every } bulmacada da arena daralır.
// tutorial: true olanlar Eğitim bölümüne girer (1. ve 2. sabit haritadır: fixed). İlk açılışta menüde önerilir.
export const MAPS = [
  {
    id: 201, tutorial: true, fixed: true, title: 'Take straight', hint: 'It\'s a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm.', mode: 'DUZ', par: 1,
    map: [
      '.....',
      '..K..',
      '..S..',
      '.....',
    ],
  },
  {
    id: 202, tutorial: true, fixed: true, title: 'The mode changes', hint: 'The mode changes every round. Walk straight first, then take diagonally next round.', mode: 'DUZ', par: 2,
    map: [
      '.C...',
      '.....',
      '..S..',
      '.....',
      '.....',
    ],
  },
  {
    id: 203, tutorial: true, fixed: true, title: 'Danger', hint: 'A red-striped square is dangerous: a piece will take you there. Take both pieces; pick the unstriped square first.', mode: 'DUZ', par: 2,
    map: [
      '.....',
      '.SC..',
      '.K...',
      '.....',
      '.....',
    ],
  },
  {
    id: 101, title: 'Corridor', hint: 'The mode changes every round: straight this round, diagonal the next.', mode: 'DUZ', bots: 2, par: 3,
    map: [
      '#.....#',
      '.......',
      '.......',
      '.......',
      '#.....#',
    ],
  },
  {
    id: 102, title: 'Cross', hint: 'The arms are narrow. Choose well which bot to take first.', mode: 'CAPRAZ', bots: 2, par: 4,
    map: [
      '--...--',
      '--...--',
      '.......',
      '.......',
      '.......',
      '--...--',
      '--...--',
    ],
  },
  {
    id: 103, title: 'Ring', hint: 'The middle is empty. The short way is always along the edge.', mode: 'DUZ', bots: 3, par: 5,
    map: [
      '-.....-',
      '.......',
      '..---..',
      '..---..',
      '..---..',
      '.......',
      '-.....-',
    ],
  },
  {
    id: 104, title: 'Pillars', hint: 'No one can enter a blocked square. Behind a pillar can be safe.', mode: 'CAPRAZ', bots: 3, par: 5,
    map: [
      '.......',
      '.#...#.',
      '...#...',
      '.......',
      '.#...#.',
      '...#...',
      '.......',
    ],
  },
  {
    id: 105, title: 'Staircase', hint: 'A diagonal strip: in a straight round your path gets narrow.', mode: 'DUZ', bots: 3, par: 5,
    map: [
      '...-----',
      '....----',
      '-....---',
      '--....--',
      '---....-',
      '----....',
      '-----...',
    ],
  },
  {
    id: 106, title: 'Double step', hint: 'Double step takes you two squares. Wait for the right moment.', mode: 'DUZ', bots: 2, par: 3, bonuses: { step: 1 }, needBonus: true,
    map: [
      '....---',
      '....---',
      '..#....',
      '..#....',
      '.......',
    ],
  },
  {
    id: 107, title: 'Mirror', hint: 'Use the Mirror to take a bot\'s place. Sometimes it\'s the only way to change direction.', mode: 'CAPRAZ', bots: 2, par: 4, bonuses: { swap: 1 }, needBonus: true,
    map: [
      '.........',
      '.........',
      '---...---',
      '---...---',
      '---...---',
      '---...---',
    ],
  },
  {
    id: 108, title: 'Diamond', hint: 'Double move: two moves in a row, the bots don\'t play in between.', mode: 'CAPRAZ', bots: 3, par: 4, bonuses: { double: 1 }, needBonus: true,
    map: [
      '---.---',
      '--...--',
      '-.....-',
      '.......',
      '-.....-',
      '--...--',
      '---.---',
    ],
  },
  {
    id: 109, title: 'Fortress', hint: 'The gates in the walls are narrow. Work out which gate to enter through.', mode: 'DUZ', bots: 3, par: 6,
    map: [
      '.........',
      '.###.###.',
      '.#.....#.',
      '.#.....#.',
      '.........',
      '.#.....#.',
      '.#.....#.',
      '.###.###.',
      '.........',
    ],
  },
  {
    id: 110, title: 'Maze', hint: 'Narrow paths and one double step. Plan the order well.', mode: 'CAPRAZ', bots: 3, par: 6, bonuses: { step: 1 },
    map: [
      '-...#...-',
      '.#.....#.',
      '...##....',
      '.#.....#.',
      '....#....',
      '.#.....#.',
      '....##...',
      '.#.....#.',
      '-...#...-',
    ],
  },
  // ---------------------------------------------------------- ikinci set (daha zor): 111–120
  {
    id: 111, title: 'L', hint: 'Four bots, a tight corner. A greedy take leads you into a trap.', mode: 'DUZ', bots: 4, par: 6, trap: true,
    map: [
      '....-----',
      '....-----',
      '....-----',
      '.........',
      '.........',
    ],
  },
  {
    id: 112, title: 'U', hint: 'Two arms, one bottom. Which arm you start with changes everything.', mode: 'CAPRAZ', bots: 4, par: 6, trap: true,
    map: [
      '...---...',
      '...---...',
      '...---...',
      '.........',
      '.........',
    ],
  },
  {
    id: 113, title: 'Armor', hint: 'Armor protects you once. Sometimes you must step into danger on purpose.', mode: 'DUZ', bots: 3, par: 4, bonuses: { armor: 1 }, needBonus: true,
    map: [
      '.......',
      '.#...#.',
      '.......',
      '.......',
      '.......',
      '.#...#.',
      '.......',
    ],
  },
  {
    id: 114, title: 'Pair', hint: 'Double step and mirror together. Use both at the right moment.', mode: 'CAPRAZ', bots: 3, par: 5, near: 4, bonuses: { step: 1, swap: 1 }, needBonus: true,
    map: [
      '........',
      '.##..##.',
      '........',
      '........',
      '.##..##.',
      '........',
    ],
  },
  {
    id: 115, title: 'Collapse', hint: 'The arena shrinks at the end of round 2. Stay on the orange ring and you\'re out.', mode: 'DUZ', bots: 3, par: 5, shrink: { start: 2, every: 2 }, trap: true,
    map: [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...S...',
    ],
  },
  {
    id: 116, title: 'Butterfly', hint: 'Two wings, a narrow waist. The mirror can carry you to the other wing.', mode: 'CAPRAZ', bots: 3, par: 4, near: 4, bonuses: { swap: 1 }, needBonus: true,
    map: [
      '..-----..',
      '...---...',
      '....-....',
      '.........',
      '....-....',
      '...---...',
      '..-----..',
    ],
  },
  {
    id: 117, title: 'Courtyard', hint: 'A courtyard closed in the middle. Work out which side of the wall to go around.', mode: 'DUZ', bots: 3, par: 6, trap: true, near: 4,
    map: [
      '.........',
      '.........',
      '..##.##..',
      '..#...#..',
      '.........',
      '..#...#..',
      '..##.##..',
      '.........',
      '.........',
    ],
  },
  {
    id: 118, title: 'Zigzag', hint: 'The diagonal wall blocks you in straight rounds. Choose when to cross.', mode: 'DUZ', bots: 3, par: 6, trap: true, near: 4,
    map: [
      '#.......',
      '.#......',
      '..#.....',
      '...#....',
      '....#...',
      '.....#..',
      '......#.',
      '.......#',
    ],
  },
  {
    id: 119, title: 'Hourglass', hint: 'The waist is a single square. Spend the double move at the pass.', mode: 'CAPRAZ', bots: 4, par: 5, bonuses: { double: 1 }, needBonus: true,
    map: [
      '.......',
      '-.....-',
      '--...--',
      '---.---',
      '--...--',
      '-.....-',
      '.......',
    ],
  },
  {
    id: 120, title: 'Finale', hint: 'Four bots, two bonuses. Every move counts.', mode: 'DUZ', bots: 4, par: 6, near: 3, bonuses: { step: 1, double: 1 }, trap: true,
    map: [
      '...#...',
      '.#...#.',
      '...#...',
      '#.....#',
      '...#...',
      '.#...#.',
      '...#...',
    ],
  },
];
