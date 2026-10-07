// Last output of make-puzzles.mjs (when one map is regenerated, the others are taken from here).
export const PUZZLES = [
  {
    "id": 201,
    "title": "Take straight",
    "hint": "It's a STRAIGHT round: your star moves and takes straight. Tap the piece above you, then Confirm.",
    "tutorial": true,
    "mode": "STRAIGHT",
    "bonuses": null,
    "par": 1,
    "map": [
      ".....",
      "..R..",
      "..S..",
      "....."
    ]
  },
  {
    "tutorial": true,
    "id": 202,
    "title": "The mode changes",
    "hint": "The mode changes every round. Walk straight first, then take diagonally next round.",
    "mode": "STRAIGHT",
    "bonuses": null,
    "par": 2,
    "map": [
      ".B...",
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
    "mode": "STRAIGHT",
    "bonuses": null,
    "par": 2,
    "map": [
      ".....",
      ".SB..",
      ".R...",
      ".....",
      "....."
    ]
  },
  {
    "tutorial": false,
    "id": 101,
    "title": "Corridor",
    "hint": "The mode changes every round: straight this round, diagonal the next.",
    "mode": "STRAIGHT",
    "par": 3,
    "bonuses": null,
    "map": [
      "#.....#",
      ".......",
      ".RB....",
      ".......",
      "#..S..#"
    ]
  },
  {
    "tutorial": false,
    "id": 102,
    "title": "Cross",
    "hint": "The arms are narrow. Choose well which bot to take first.",
    "mode": "DIAGONAL",
    "par": 4,
    "bonuses": null,
    "map": [
      "--...--",
      "--...--",
      ".......",
      ".......",
      "....BR.",
      "--...--",
      "--.S.--"
    ]
  },
  {
    "tutorial": false,
    "id": 103,
    "title": "Ring",
    "hint": "The middle is empty. The short way is always along the edge.",
    "mode": "STRAIGHT",
    "par": 5,
    "bonuses": null,
    "map": [
      "-.BR..-",
      ".......",
      ".B---..",
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
    "mode": "DIAGONAL",
    "par": 5,
    "bonuses": null,
    "map": [
      ".......",
      ".#...#.",
      "...#B..",
      ".......",
      ".#RB.#.",
      "...#.S.",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 105,
    "title": "Staircase",
    "hint": "A diagonal strip: in a straight round your path gets narrow.",
    "mode": "STRAIGHT",
    "par": 5,
    "bonuses": null,
    "map": [
      "...-----",
      "R.B.----",
      "-...B---",
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
    "mode": "STRAIGHT",
    "par": 3,
    "bonuses": {
      "step": 1
    },
    "map": [
      "....---",
      "...S---",
      "..#..R.",
      "..#R...",
      "......."
    ]
  },
  {
    "tutorial": false,
    "id": 107,
    "title": "Mirror",
    "hint": "Use the Mirror to take a bot's place. Sometimes it's the only way to change direction.",
    "mode": "DIAGONAL",
    "par": 4,
    "bonuses": {
      "swap": 1
    },
    "map": [
      ".........",
      "..RR.....",
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
    "mode": "DIAGONAL",
    "par": 4,
    "bonuses": {
      "double": 1
    },
    "map": [
      "---.---",
      "--...--",
      "-...B.-",
      "....RB.",
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
    "mode": "STRAIGHT",
    "par": 6,
    "bonuses": null,
    "map": [
      ".........",
      ".###.###.",
      ".#.....#.",
      ".#.....#.",
      "S...B....",
      ".#..R..#.",
      ".#.B...#.",
      ".###.###.",
      "........."
    ]
  },
  {
    "tutorial": false,
    "id": 110,
    "title": "Maze",
    "hint": "Narrow paths and one double step. Plan the order well.",
    "mode": "DIAGONAL",
    "par": 6,
    "bonuses": {
      "step": 1
    },
    "map": [
      "-...#...-",
      ".#.....#.",
      "...##....",
      ".#.....#S",
      "....#R...",
      ".#..B..#.",
      "....##...",
      ".#R....#.",
      "-...#...-"
    ]
  },
  {
    "tutorial": false,
    "id": 111,
    "title": "L",
    "hint": "Four bots, a tight corner. A greedy take leads you into a trap.",
    "mode": "STRAIGHT",
    "bonuses": null,
    "par": 6,
    "map": [
      "....-----",
      "....-----",
      ".R..-----",
      "B...B....",
      "..S.R...."
    ]
  },
  {
    "tutorial": false,
    "id": 112,
    "title": "U",
    "hint": "Two arms, one bottom. Which arm you start with changes everything.",
    "mode": "DIAGONAL",
    "bonuses": null,
    "par": 6,
    "map": [
      "...---...",
      "RR.---...",
      "...---...",
      "B..S.....",
      ".R......."
    ]
  },
  {
    "tutorial": false,
    "id": 113,
    "title": "Armor",
    "hint": "Armor protects you once. Sometimes you must step into danger on purpose.",
    "mode": "STRAIGHT",
    "bonuses": {
      "armor": 1
    },
    "par": 4,
    "map": [
      ".......",
      "R#..S#.",
      "..R....",
      "..R....",
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
    "mode": "DIAGONAL",
    "bonuses": {
      "step": 1,
      "swap": 1
    },
    "par": 5,
    "map": [
      "...R....",
      ".##R.##.",
      "........",
      ".....S..",
      ".##..##.",
      "...R...."
    ]
  },
  {
    "tutorial": false,
    "id": 115,
    "title": "Collapse",
    "hint": "The arena shrinks at the end of round 2. Stay on the orange ring and you're out.",
    "mode": "STRAIGHT",
    "bonuses": null,
    "shrink": {
      "start": 2,
      "every": 2
    },
    "par": 5,
    "map": [
      ".......",
      ".......",
      "...R...",
      ".......",
      "...B...",
      ".B.....",
      "...S..."
    ]
  },
  {
    "tutorial": false,
    "id": 116,
    "title": "Butterfly",
    "hint": "Two wings, a narrow waist. The mirror can carry you to the other wing.",
    "mode": "DIAGONAL",
    "bonuses": {
      "swap": 1
    },
    "par": 4,
    "map": [
      "..-----..",
      "...---...",
      "....-....",
      "......RR.",
      "....-...B",
      "...---...",
      "..-----.S"
    ]
  },
  {
    "tutorial": false,
    "id": 117,
    "title": "Courtyard",
    "hint": "A courtyard closed in the middle. Work out which side of the wall to go around.",
    "mode": "STRAIGHT",
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
      "......B..",
      "......R.B"
    ]
  },
  {
    "tutorial": false,
    "id": 118,
    "title": "Zigzag",
    "hint": "The diagonal wall blocks you in straight rounds. Choose when to cross.",
    "mode": "STRAIGHT",
    "bonuses": null,
    "par": 6,
    "map": [
      "#.......",
      ".#......",
      "..#.....",
      "...#....",
      "....#...",
      "..B..#..",
      "....B.#.",
      ".S.B...#"
    ]
  },
  {
    "tutorial": false,
    "id": 119,
    "title": "Hourglass",
    "hint": "The waist is a single square. Spend the double move at the pass.",
    "mode": "DIAGONAL",
    "bonuses": {
      "double": 1
    },
    "par": 5,
    "map": [
      ".......",
      "-..B.B-",
      "--..B--",
      "---R---",
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
    "mode": "STRAIGHT",
    "bonuses": {
      "step": 1,
      "double": 1
    },
    "par": 6,
    "map": [
      "...#...",
      ".#...#.",
      "..B#...",
      "#B....#",
      "...#.B.",
      ".#S.R#.",
      "...#..."
    ]
  }
];
