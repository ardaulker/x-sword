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
    "tutorial": true,
    "id": 203,
    "title": "Tehlike",
    "hint": "Kırmızı çizgili kare tehlikelidir: orada bir taş seni alır. İki taşı da al; önce çizgisiz kareyi seç.",
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
  },
  {
    "tutorial": false,
    "id": 111,
    "title": "L",
    "hint": "Dört bot, dar bir köşe. Açgözlü alma seni tuzağa çeker.",
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
    "hint": "İki kol, tek dip. Hangi koldan başladığın her şeyi değiştirir.",
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
    "title": "Zırh",
    "hint": "Zırh seni bir kez korur. Bazen bilerek tehlikeye girmek gerekir.",
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
    "title": "İkili",
    "hint": "Çift adım ve ayna birlikte. İkisini de doğru anda kullan.",
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
    "title": "Çöküş",
    "hint": "Arena 2. turun sonunda daralır. Turuncu halkada kalırsan elenirsin.",
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
    "title": "Kelebek",
    "hint": "İki kanat, dar bir bel. Ayna seni öbür kanada taşıyabilir.",
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
    "title": "Avlu",
    "hint": "Ortası kapalı bir avlu. Duvarın hangi yanından dolaşacağını hesapla.",
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
    "title": "Zikzak",
    "hint": "Çapraz duvar düz turda yolunu keser. Karşıya ne zaman geçeceğini seç.",
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
    "title": "Kum saati",
    "hint": "Bel tek kare. Çift hamleyi geçitte harca.",
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
    "title": "Final",
    "hint": "Dört bot, iki bonus. Her hamle sayılır.",
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
