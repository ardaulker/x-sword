// make-puzzles.mjs'in son çıktısı (tek harita yeniden üretilirken diğerleri buradan alınır).
export const PUZZLES = [
  {
    "tutorial": true,
    "id": 201,
    "title": "Düz al",
    "hint": "DÜZ turdasın: yıldız düz gider ve düz alır. Üstündeki taşa dokun, sonra Onayla.",
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
    "title": "Mod değişir",
    "hint": "Mod her tur değişir. Önce düz yürü, sonraki turda çapraz al.",
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
    "id": 203,
    "title": "Tehlike",
    "hint": "Kırmızı çizgili kare tehlikelidir: orada bir taş seni alır. Önce güvenli kareden git.",
    "tutorial": true,
    "mode": "DUZ",
    "bonuses": null,
    "par": 3,
    "map": [
      ".....",
      ".C...",
      ".K.S.",
      ".....",
      "....."
    ]
  },
  {
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
    "tutorial": false,
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
