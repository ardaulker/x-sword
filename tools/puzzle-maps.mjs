// Puzzle maps: each one teaches one idea. We draw the map by hand; the generator searches where the pieces go.
// '.' floor, '#' obstacle, '-' off the map, 'S' you (placed by the generator if missing), 'R' / 'B' fixed red / blue bot.
// bots: how many bots the generator places. par: target fewest moves. bonuses: bonuses held at the start.
// needBonus: it must not be solvable in par+1 moves without the bonus. botCols: at least one bot lands in these columns.
// near: bots are placed at most this far (Chebyshev) from you.
// walk: how many of the placed bots are hunters (they also step toward you every round; small letters 'r' / 'b' in the output).
// trap: the first move must offer at least one "trap" (a move that gets you taken right away).
// shrink: { start, every } makes the arena shrink in the puzzle too.
// tutorial: true puts the puzzle in the Tutorial section (fixed: a hand-placed map the generator only verifies).
//   New players are offered the tutorial from the main menu.
// Before adding a map, read the "Puzzle maps" list in CLAUDE.md and don't repeat an idea.
export const MAPS = [
  {
    id: 201, tutorial: true, fixed: true, title: 'Take straight', hint: 'It\'s a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm.', mode: 'STRAIGHT', par: 1,
    map: [
      '.....',
      '..R..',
      '..S..',
      '.....',
    ],
  },
  {
    id: 202, tutorial: true, fixed: true, title: 'The mode changes', hint: 'The mode changes every round. Walk straight first, then take diagonally next round.', mode: 'STRAIGHT', par: 2,
    map: [
      '.B...',
      '.....',
      '..S..',
      '.....',
      '.....',
    ],
  },
  {
    id: 203, tutorial: true, fixed: true, title: 'Danger', hint: 'A red-striped square is dangerous: a piece will take you there. Take both pieces; pick the unstriped square first.', mode: 'STRAIGHT', par: 2,
    map: [
      '.....',
      '.SB..',
      '.R...',
      '.....',
      '.....',
    ],
  },
  {
    id: 101, title: 'Corridor', hint: 'Bots with a dashed ring are hunters: they step toward you every round. Let them come.', mode: 'STRAIGHT', bots: 2, walk: 1, par: 4,
    map: [
      '#.....#',
      '.......',
      '.......',
      '.......',
      '#.....#',
    ],
  },
  {
    id: 102, title: 'Cross', hint: 'The arms are narrow. Choose well which bot to take first.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 5,
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
    id: 103, title: 'Ring', hint: 'The middle is empty. The short way is always along the edge.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 6,
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
    id: 104, title: 'Pillars', hint: 'No one can enter a blocked square. Behind a pillar can be safe.', mode: 'DIAGONAL', bots: 3, walk: 2, par: 6,
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
    id: 105, title: 'Staircase', hint: 'A diagonal strip: in a straight round your path gets narrow.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 6,
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
    id: 106, title: 'Double step', hint: 'Double step takes you two squares. Wait for the right moment.', mode: 'STRAIGHT', bots: 2, walk: 1, par: 4, bonuses: { step: 1 }, needBonus: true,
    map: [
      '....---',
      '....---',
      '..#....',
      '..#....',
      '.......',
    ],
  },
  {
    id: 107, title: 'Switcheroo', hint: 'Use the Switcheroo to take a bot\'s place. Sometimes it\'s the only way to change direction.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 5, bonuses: { swap: 1 }, needBonus: true,
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
    id: 108, title: 'Diamond', hint: 'Double move: two moves in a row, the bots don\'t play in between.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 5, bonuses: { double: 1 }, needBonus: true,
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
    id: 109, title: 'Fortress', hint: 'The gates in the walls are narrow. Work out which gate to enter through.', mode: 'STRAIGHT', bots: 3, walk: 2, par: 7,
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
    id: 110, title: 'Maze', hint: 'Narrow paths and one double step. Plan the order well.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 7, bonuses: { step: 1 },
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
  // ---------------------------------------------------------- second set (harder): 111–120
  {
    id: 111, title: 'L', hint: 'Four bots, a tight corner. A greedy take leads you into a trap.', mode: 'STRAIGHT', bots: 4, walk: 2, par: 7, trap: true,
    map: [
      '....-----',
      '....-----',
      '....-----',
      '.........',
      '.........',
    ],
  },
  {
    id: 112, title: 'U', hint: 'Two arms, one bottom. Which arm you start with changes everything.', mode: 'DIAGONAL', bots: 4, walk: 2, par: 7, trap: true,
    map: [
      '...---...',
      '...---...',
      '...---...',
      '.........',
      '.........',
    ],
  },
  {
    id: 113, title: 'Armor', hint: 'Armor protects you once. Sometimes you must step into danger on purpose.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 5, bonuses: { armor: 1 }, needBonus: true,
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
    id: 114, title: 'Pair', hint: 'Double step and Switcheroo together. Use both at the right moment.', mode: 'DIAGONAL', bots: 4, walk: 2, par: 6, near: 4, bonuses: { step: 1, swap: 1 }, needBonus: true,
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
    id: 115, title: 'Collapse', hint: 'The arena shrinks at the end of round 2. Stay on the orange ring and you\'re out.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 6, shrink: { start: 2, every: 2 }, trap: true,
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
    id: 116, title: 'Butterfly', hint: 'Two wings, a narrow waist. The Switcheroo can carry you to the other wing.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 5, near: 4, bonuses: { swap: 1 }, needBonus: true,
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
    id: 117, title: 'Courtyard', hint: 'A courtyard closed in the middle. Work out which side of the wall to go around.', mode: 'STRAIGHT', bots: 3, walk: 2, par: 7, trap: true, near: 4,
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
    id: 118, title: 'Zigzag', hint: 'The diagonal wall blocks you in straight rounds. Choose when to cross.', mode: 'STRAIGHT', bots: 3, walk: 2, par: 7, trap: true, near: 4,
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
    id: 119, title: 'Hourglass', hint: 'The waist is a single square. Spend the double move at the pass.', mode: 'DIAGONAL', bots: 4, walk: 2, par: 6, bonuses: { double: 1 }, needBonus: true,
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
    id: 120, title: 'Finale', hint: 'Four bots, two bonuses. Every move counts.', mode: 'STRAIGHT', bots: 4, walk: 2, par: 7, near: 3, bonuses: { step: 1, double: 1 }, trap: true,
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
  {
    id: 121, title: 'Two for one', hint: 'Take two bots with one Double move: you earn Armor, and the points bring a Double step.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 5, near: 4, bonuses: { double: 1 }, needBonus: true, trap: true,
    map: [
      '.......',
      '.......',
      '..#.#..',
      '.......',
      '..#.#..',
      '.......',
      '.......',
    ],
  },
  {
    id: 122, title: 'Crowd', hint: 'Five bots close together. Every take changes who can reach you.', mode: 'STRAIGHT', bots: 5, walk: 2, par: 7, near: 3,
    map: [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ],
  },
  {
    id: 123, title: 'Toolbox', hint: 'Double step, Double move and Switcheroo, all at once. Find the combination that works.', mode: 'DIAGONAL', bots: 3, walk: 1, par: 5, near: 4, bonuses: { step: 1, double: 1, swap: 1 }, needBonus: true, trap: true,
    map: [
      '........',
      '.#....#.',
      '........',
      '........',
      '........',
      '........',
      '.#....#.',
      '........',
    ],
  },
  {
    id: 124, title: 'Falling walls', hint: 'Walls inside, a collapsing ring outside. Take the bots before the floor goes.', mode: 'STRAIGHT', bots: 3, walk: 1, par: 6, near: 4, shrink: { start: 2, every: 3 }, trap: true,
    map: [
      '.........',
      '.........',
      '..##.##..',
      '.........',
      '....#....',
      '.........',
      '..##.##..',
      '.........',
      '.........',
    ],
  },
  {
    id: 125, title: 'Two rings', hint: 'The arena shrinks twice. Be on the inside before each collapse.', mode: 'DIAGONAL', bots: 4, walk: 2, par: 7, near: 5, shrink: { start: 2, every: 2 }, trap: true,
    map: [
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
    ],
  },
];
