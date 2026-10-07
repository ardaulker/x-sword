// Bu dosya tools/make-puzzles.mjs ile üretildi (haritalar tools/puzzle-maps.mjs). Her bulmaca en çok par+1 hamlede çözülür; par'da çözmek 3 yıldız.
// map: '.' zemin, '#' engel, '-' harita dışı, 'S' sen, 'K' Kızıl bot, 'C' Çelik bot.
import type { BonusKind, Mode } from '../../../engine/rules.js';

export interface PuzzleDef {
  id: number;
  title: string;
  hint: string;
  tutorial: boolean;
  mode: Mode;
  par: number;
  bonuses: Partial<Record<BonusKind, number>> | null;
  shrink?: { start: number; every: number };
  map: string[];
}

export const PUZZLES: PuzzleDef[] = [
  {
    "tutorial": true,
    "id": 201,
    "title": "Take straight",
    "hint": "It's a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 1,
    "map": [
      ".....",
      "..K..",
      "..S..",
      "....."
    ]
  },
  {
    "tutorial": true,
    "id": 202,
    "title": "The mode changes",
    "hint": "The mode changes every round. Walk straight first, then take diagonally next round.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 2,
    "map": [
      ".C...",
      ".....",
      "..S..",
      ".....",
      "....."
    ]
  },
  {
    "tutorial": true,
    "id": 203,
    "title": "Danger",
    "hint": "A red-striped square is dangerous: a piece will take you there. Take both pieces; pick the unstriped square first.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 2,
    "map": [
      ".....",
      ".SC..",
      ".K...",
      ".....",
      "....."
    ]
  },
  {
    "tutorial": false,
    "id": 101,
    "title": "Corridor",
    "hint": "The mode changes every round: straight this round, diagonal the next.",
    "mode": "DUZ",
    "par": 3,
    "bonuses": null,
    "map": [
      "#.....#",
      ".......",
      ".KC....",
      ".......",
      "#..S..#"
    ]
  },
  {
    "tutorial": false,
    "id": 102,
    "title": "Cross",
    "hint": "The arms are narrow. Choose well which bot to take first.",
    "mode": "CAPRAZ",
    "par": 4,
    "bonuses": null,
    "map": [
      "--...--",
      "--...--",
      ".......",
      ".......",
      "....CK.",
      "--...--",
      "--.S.--"
    ]
  },
  {
    "tutorial": false,
    "id": 103,
    "title": "Ring",
    "hint": "The middle is empty. The short way is always along the edge.",
    "mode": "DUZ",
    "par": 5,
    "bonuses": null,
    "map": [
      "-.CK..-",
      ".......",
      ".C---..",
      "..---..",
      "S.---..",
      ".......",
      "-.....-"
    ]
  },
  {
    "tutorial": false,
    "id": 104,
    "title": "Pillars",
    "hint": "No one can enter a blocked square. Behind a pillar can be safe.",
    "mode": "CAPRAZ",
    "par": 5,
    "bonuses": null,
    "map": [
      ".......",
      ".#...#.",
      "...#C..",
      ".......",
      ".#KC.#.",
      "...#.S.",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 105,
    "title": "Staircase",
    "hint": "A diagonal strip: in a straight round your path gets narrow.",
    "mode": "DUZ",
    "par": 5,
    "bonuses": null,
    "map": [
      "...-----",
      "K.C.----",
      "-...C---",
      "--....--",
      "---..S.-",
      "----....",
      "-----..."
    ]
  },
  {
    "tutorial": false,
    "id": 106,
    "title": "Double step",
    "hint": "Double step takes you two squares. Wait for the right moment.",
    "mode": "DUZ",
    "par": 3,
    "bonuses": {
      "step": 1
    },
    "map": [
      "....---",
      "...S---",
      "..#..K.",
      "..#K...",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 107,
    "title": "Mirror",
    "hint": "Use the Mirror to take a bot's place. Sometimes it's the only way to change direction.",
    "mode": "CAPRAZ",
    "par": 4,
    "bonuses": {
      "swap": 1
    },
    "map": [
      ".........",
      "..KK.....",
      "---...---",
      "---.S.---",
      "---...---",
      "---...---"
    ]
  },
  {
    "tutorial": false,
    "id": 108,
    "title": "Diamond",
    "hint": "Double move: two moves in a row, the bots don't play in between.",
    "mode": "CAPRAZ",
    "par": 4,
    "bonuses": {
      "double": 1
    },
    "map": [
      "---.---",
      "--...--",
      "-...C.-",
      "....KC.",
      "-.S...-",
      "--...--",
      "---.---"
    ]
  },
  {
    "tutorial": false,
    "id": 109,
    "title": "Fortress",
    "hint": "The gates in the walls are narrow. Work out which gate to enter through.",
    "mode": "DUZ",
    "par": 6,
    "bonuses": null,
    "map": [
      ".........",
      ".###.###.",
      ".#.....#.",
      ".#.....#.",
      "S...C....",
      ".#..K..#.",
      ".#.C...#.",
      ".###.###.",
      "........."
    ]
  },
  {
    "tutorial": false,
    "id": 110,
    "title": "Maze",
    "hint": "Narrow paths and one double step. Plan the order well.",
    "mode": "CAPRAZ",
    "par": 6,
    "bonuses": {
      "step": 1
    },
    "map": [
      "-...#...-",
      ".#.....#.",
      "...##....",
      ".#.....#S",
      "....#K...",
      ".#..C..#.",
      "....##...",
      ".#K....#.",
      "-...#...-"
    ]
  },
  {
    "tutorial": false,
    "id": 111,
    "title": "L",
    "hint": "Four bots, a tight corner. A greedy take leads you into a trap.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 6,
    "map": [
      "....-----",
      "....-----",
      ".K..-----",
      "C...C....",
      "..S.K...."
    ]
  },
  {
    "tutorial": false,
    "id": 112,
    "title": "U",
    "hint": "Two arms, one bottom. Which arm you start with changes everything.",
    "mode": "CAPRAZ",
    "bonuses": null,
    "par": 6,
    "map": [
      "...---...",
      "KK.---...",
      "...---...",
      "C..S.....",
      ".K......."
    ]
  },
  {
    "tutorial": false,
    "id": 113,
    "title": "Armor",
    "hint": "Armor protects you once. Sometimes you must step into danger on purpose.",
    "mode": "DUZ",
    "bonuses": {
      "armor": 1
    },
    "par": 4,
    "map": [
      ".......",
      "K#..S#.",
      "..K....",
      "..K....",
      ".......",
      ".#...#.",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 114,
    "title": "Pair",
    "hint": "Double step and mirror together. Use both at the right moment.",
    "mode": "CAPRAZ",
    "bonuses": {
      "step": 1,
      "swap": 1
    },
    "par": 5,
    "map": [
      "...K....",
      ".##K.##.",
      "........",
      ".....S..",
      ".##..##.",
      "...K...."
    ]
  },
  {
    "tutorial": false,
    "id": 115,
    "title": "Collapse",
    "hint": "The arena shrinks at the end of round 2. Stay on the orange ring and you're out.",
    "mode": "DUZ",
    "bonuses": null,
    "shrink": {
      "start": 2,
      "every": 2
    },
    "par": 5,
    "map": [
      ".......",
      ".......",
      "...K...",
      ".......",
      "...C...",
      ".C.....",
      "...S..."
    ]
  },
  {
    "id": 116,
    "title": "Butterfly",
    "hint": "Two wings, a narrow waist. The mirror can carry you to the other wing.",
    "tutorial": false,
    "mode": "CAPRAZ",
    "bonuses": {
      "swap": 1
    },
    "par": 4,
    "map": [
      "..-----..",
      "...---...",
      "....-....",
      "......KK.",
      "....-...C",
      "...---...",
      "..-----.S"
    ]
  },
  {
    "tutorial": false,
    "id": 117,
    "title": "Courtyard",
    "hint": "A courtyard closed in the middle. Work out which side of the wall to go around.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 6,
    "map": [
      ".........",
      ".........",
      "..##.##..",
      "..#...#..",
      ".........",
      "..#...#..",
      "..##.##.S",
      "......C..",
      "......K.C"
    ]
  },
  {
    "tutorial": false,
    "id": 118,
    "title": "Zigzag",
    "hint": "The diagonal wall blocks you in straight rounds. Choose when to cross.",
    "mode": "DUZ",
    "bonuses": null,
    "par": 6,
    "map": [
      "#.......",
      ".#......",
      "..#.....",
      "...#....",
      "....#...",
      "..C..#..",
      "....C.#.",
      ".S.C...#"
    ]
  },
  {
    "tutorial": false,
    "id": 119,
    "title": "Hourglass",
    "hint": "The waist is a single square. Spend the double move at the pass.",
    "mode": "CAPRAZ",
    "bonuses": {
      "double": 1
    },
    "par": 5,
    "map": [
      ".......",
      "-..C.C-",
      "--..C--",
      "---K---",
      "--...--",
      "-.S...-",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 120,
    "title": "Finale",
    "hint": "Four bots, two bonuses. Every move counts.",
    "mode": "DUZ",
    "bonuses": {
      "step": 1,
      "double": 1
    },
    "par": 6,
    "map": [
      "...#...",
      ".#...#.",
      "..C#...",
      "#C....#",
      "...#.C.",
      ".#S.K#.",
      "...#..."
    ]
  }
];
