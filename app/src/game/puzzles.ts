// Bu dosya tools/make-puzzles.mjs ile üretildi. Her bulmaca en çok par+1 hamlede çözülür; par'da çözmek 3 yıldız.
import type { Mode } from '../../../engine/rules.js';

export interface PuzzleDef {
  id: number;
  me: [number, number];
  bots: { kind: 'red' | 'blue'; r: number; c: number }[];
  par: number;
  mode: Mode;
}

export const PUZZLES: PuzzleDef[] = [
  {
    "id": 1,
    "me": [
      5,
      1
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 8,
        "c": 2
      },
      {
        "kind": "blue",
        "r": 7,
        "c": 2
      }
    ],
    "par": 2,
    "mode": "CAPRAZ"
  },
  {
    "id": 2,
    "me": [
      1,
      5
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 0,
        "c": 8
      },
      {
        "kind": "blue",
        "r": 0,
        "c": 7
      }
    ],
    "par": 2,
    "mode": "CAPRAZ"
  },
  {
    "id": 3,
    "me": [
      7,
      2
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 7,
        "c": 4
      },
      {
        "kind": "red",
        "r": 8,
        "c": 4
      }
    ],
    "par": 3,
    "mode": "CAPRAZ"
  },
  {
    "id": 4,
    "me": [
      3,
      3
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 1,
        "c": 1
      },
      {
        "kind": "red",
        "r": 1,
        "c": 0
      }
    ],
    "par": 3,
    "mode": "CAPRAZ"
  },
  {
    "id": 5,
    "me": [
      4,
      5
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 7,
        "c": 8
      },
      {
        "kind": "red",
        "r": 6,
        "c": 8
      }
    ],
    "par": 3,
    "mode": "CAPRAZ"
  },
  {
    "id": 6,
    "me": [
      4,
      7
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 2,
        "c": 7
      },
      {
        "kind": "blue",
        "r": 2,
        "c": 8
      }
    ],
    "par": 3,
    "mode": "CAPRAZ"
  },
  {
    "id": 7,
    "me": [
      2,
      2
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 0,
        "c": 4
      },
      {
        "kind": "red",
        "r": 1,
        "c": 5
      }
    ],
    "par": 3,
    "mode": "CAPRAZ"
  },
  {
    "id": 8,
    "me": [
      5,
      6
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 7,
        "c": 3
      },
      {
        "kind": "blue",
        "r": 7,
        "c": 4
      }
    ],
    "par": 4,
    "mode": "DUZ"
  },
  {
    "id": 9,
    "me": [
      5,
      7
    ],
    "bots": [
      {
        "kind": "red",
        "r": 2,
        "c": 6
      },
      {
        "kind": "blue",
        "r": 3,
        "c": 7
      }
    ],
    "par": 4,
    "mode": "DUZ"
  },
  {
    "id": 10,
    "me": [
      7,
      1
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 4,
        "c": 1
      },
      {
        "kind": "blue",
        "r": 5,
        "c": 1
      }
    ],
    "par": 4,
    "mode": "DUZ"
  },
  {
    "id": 11,
    "me": [
      6,
      4
    ],
    "bots": [
      {
        "kind": "blue",
        "r": 5,
        "c": 8
      },
      {
        "kind": "blue",
        "r": 5,
        "c": 7
      }
    ],
    "par": 4,
    "mode": "DUZ"
  }
];
