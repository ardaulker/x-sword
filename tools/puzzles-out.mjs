// make-puzzles.mjs'in son çıktısı (tek harita yeniden üretilirken diğerleri buradan alınır).
export const PUZZLES = [
  {
    "id": 101,
    "title": "Koridor",
    "hint": "Mod her tur değişir: bu tur düz, sonraki tur çapraz.",
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
    "id": 102,
    "title": "Haç",
    "hint": "Kollar dar. Hangi botu önce alacağını iyi seç.",
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
    "id": 103,
    "title": "Halka",
    "hint": "Ortası boş. Kısa yol hep kenardan.",
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
    "id": 104,
    "title": "Sütunlar",
    "hint": "Engel karesine kimse giremez. Sütunun arkası güvenli olabilir.",
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
    "id": 105,
    "title": "Merdiven",
    "hint": "Çapraz şerit: düz turda yolun daralır.",
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
    "id": 106,
    "title": "Çift adım",
    "hint": "Çift adım iki kare götürür. Doğru anı bekle.",
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
    "id": 107,
    "title": "Ayna",
    "hint": "Ayna ile bir botun yerine geç. Bazen yön değiştirmenin tek yolu budur.",
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
    "id": 108,
    "title": "Elmas",
    "hint": "Çift hamle: iki hamle art arda, botlar arada oynamaz.",
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
    "id": 109,
    "title": "Kale",
    "hint": "Duvarların kapısı dar. Hangi kapıdan gireceğini hesapla.",
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
    "id": 110,
    "title": "Labirent",
    "hint": "Dar yollar ve bir çift adım. Sırayı iyi kur.",
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
  }
];
