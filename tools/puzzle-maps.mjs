// Bulmaca haritaları: her biri bir fikri öğretir. Haritayı elle çiziyoruz, taşların yerini üretici arar.
// '.' zemin, '#' engel, '-' harita dışı, 'S' sen (yoksa üretici koyar), 'K' / 'C' sabit bot.
// bots: üreticinin koyacağı bot sayısı. par: hedef en az hamle. bonuses: başta verilen bonuslar.
// needBonus: bonus olmadan par+1 hamlede çözülmemeli (bonus şart). botCols: en az bir bot bu sütunlarda olur.
// Yeni harita eklerken CLAUDE.md'deki "Bulmaca haritaları" listesine bak; aynı fikri tekrar etme.
// tutorial: true olanlar Eğitim bölümüne girer (1. ve 2. sabit haritadır: fixed). İlk açılışta menüde önerilir.
export const MAPS = [
  {
    id: 201, tutorial: true, fixed: true, title: 'Düz al', hint: 'DÜZ turdasın: yıldız düz gider ve düz alır. Üstündeki taşa dokun, sonra Onayla.', mode: 'DUZ', par: 1,
    map: [
      '.....',
      '..K..',
      '..S..',
      '.....',
    ],
  },
  {
    id: 202, tutorial: true, fixed: true, title: 'Mod değişir', hint: 'Mod her tur değişir. Önce düz yürü, sonraki turda çapraz al.', mode: 'DUZ', par: 2,
    map: [
      '.C...',
      '.....',
      '..S..',
      '.....',
      '.....',
    ],
  },
  {
    id: 203, tutorial: true, title: 'Tehlike', hint: 'Kırmızı çizgili kare tehlikelidir: orada bir taş seni alır. Önce güvenli kareden git.', mode: 'DUZ', bots: 2, par: 3,
    map: [
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
    ],
  },
  {
    id: 101, title: 'Koridor', hint: 'Mod her tur değişir: bu tur düz, sonraki tur çapraz.', mode: 'DUZ', bots: 2, par: 3,
    map: [
      '#.....#',
      '.......',
      '.......',
      '.......',
      '#.....#',
    ],
  },
  {
    id: 102, title: 'Haç', hint: 'Kollar dar. Hangi botu önce alacağını iyi seç.', mode: 'CAPRAZ', bots: 2, par: 4,
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
    id: 103, title: 'Halka', hint: 'Ortası boş. Kısa yol hep kenardan.', mode: 'DUZ', bots: 3, par: 5,
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
    id: 104, title: 'Sütunlar', hint: 'Engel karesine kimse giremez. Sütunun arkası güvenli olabilir.', mode: 'CAPRAZ', bots: 3, par: 5,
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
    id: 105, title: 'Merdiven', hint: 'Çapraz şerit: düz turda yolun daralır.', mode: 'DUZ', bots: 3, par: 5,
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
    id: 106, title: 'Çift adım', hint: 'Çift adım iki kare götürür. Doğru anı bekle.', mode: 'DUZ', bots: 2, par: 3, bonuses: { step: 1 }, needBonus: true,
    map: [
      '....---',
      '....---',
      '..#....',
      '..#....',
      '.......',
    ],
  },
  {
    id: 107, title: 'Ayna', hint: 'Ayna ile bir botun yerine geç. Bazen yön değiştirmenin tek yolu budur.', mode: 'CAPRAZ', bots: 2, par: 4, bonuses: { swap: 1 }, needBonus: true,
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
    id: 108, title: 'Elmas', hint: 'Çift hamle: iki hamle art arda, botlar arada oynamaz.', mode: 'CAPRAZ', bots: 3, par: 4, bonuses: { double: 1 }, needBonus: true,
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
    id: 109, title: 'Kale', hint: 'Duvarların kapısı dar. Hangi kapıdan gireceğini hesapla.', mode: 'DUZ', bots: 3, par: 6,
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
    id: 110, title: 'Labirent', hint: 'Dar yollar ve bir çift adım. Sırayı iyi kur.', mode: 'CAPRAZ', bots: 3, par: 6, bonuses: { step: 1 },
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
];
