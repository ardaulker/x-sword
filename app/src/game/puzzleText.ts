// Bulmaca adları ve ipuçları çevrilsin diye burada düz tr() çağrısı olarak durur (çıkarıcı yalnız düz yazıyı görür).
// tools/puzzle-maps.mjs'e yeni bulmaca eklenince buraya da ekle.
import { tr } from '../i18n';
import type { PuzzleDef } from './puzzles';

const titles = (): Record<string, string> => ({
  'Düz al': tr('Düz al'),
  'Mod değişir': tr('Mod değişir'),
  'Tehlike': tr('Tehlike'),
  'Koridor': tr('Koridor'),
  'Haç': tr('Haç'),
  'Halka': tr('Halka'),
  'Sütunlar': tr('Sütunlar'),
  'Merdiven': tr('Merdiven'),
  'Çift adım': tr('Çift adım'),
  'Ayna': tr('Ayna'),
  'Elmas': tr('Elmas'),
  'Kale': tr('Kale'),
  'Labirent': tr('Labirent'),
  'L': tr('L'),
  'U': tr('U'),
  'Zırh': tr('Zırh'),
  'İkili': tr('İkili'),
  'Çöküş': tr('Çöküş'),
  'Kelebek': tr('Kelebek'),
  'Avlu': tr('Avlu'),
  'Zikzak': tr('Zikzak'),
  'Kum saati': tr('Kum saati'),
  'Final': tr('Final'),
});

const hints = (): Record<string, string> => ({
  'DÜZ turdasın: yıldız düz gider ve düz alır. Üstündeki taşa dokun, sonra Onayla.': tr('DÜZ turdasın: yıldız düz gider ve düz alır. Üstündeki taşa dokun, sonra Onayla.'),
  'Mod her tur değişir. Önce düz yürü, sonraki turda çapraz al.': tr('Mod her tur değişir. Önce düz yürü, sonraki turda çapraz al.'),
  'Kırmızı çizgili kare tehlikelidir: orada bir taş seni alır. İki taşı da al; önce çizgisiz kareyi seç.': tr('Kırmızı çizgili kare tehlikelidir: orada bir taş seni alır. İki taşı da al; önce çizgisiz kareyi seç.'),
  'Mod her tur değişir: bu tur düz, sonraki tur çapraz.': tr('Mod her tur değişir: bu tur düz, sonraki tur çapraz.'),
  'Kollar dar. Hangi botu önce alacağını iyi seç.': tr('Kollar dar. Hangi botu önce alacağını iyi seç.'),
  'Ortası boş. Kısa yol hep kenardan.': tr('Ortası boş. Kısa yol hep kenardan.'),
  'Engel karesine kimse giremez. Sütunun arkası güvenli olabilir.': tr('Engel karesine kimse giremez. Sütunun arkası güvenli olabilir.'),
  'Çapraz şerit: düz turda yolun daralır.': tr('Çapraz şerit: düz turda yolun daralır.'),
  'Çift adım iki kare götürür. Doğru anı bekle.': tr('Çift adım iki kare götürür. Doğru anı bekle.'),
  'Ayna ile bir botun yerine geç. Bazen yön değiştirmenin tek yolu budur.': tr('Ayna ile bir botun yerine geç. Bazen yön değiştirmenin tek yolu budur.'),
  'Çift hamle: iki hamle art arda, botlar arada oynamaz.': tr('Çift hamle: iki hamle art arda, botlar arada oynamaz.'),
  'Duvarların kapısı dar. Hangi kapıdan gireceğini hesapla.': tr('Duvarların kapısı dar. Hangi kapıdan gireceğini hesapla.'),
  'Dar yollar ve bir çift adım. Sırayı iyi kur.': tr('Dar yollar ve bir çift adım. Sırayı iyi kur.'),
  'Dört bot, dar bir köşe. Açgözlü alma seni tuzağa çeker.': tr('Dört bot, dar bir köşe. Açgözlü alma seni tuzağa çeker.'),
  'İki kol, tek dip. Hangi koldan başladığın her şeyi değiştirir.': tr('İki kol, tek dip. Hangi koldan başladığın her şeyi değiştirir.'),
  'Zırh seni bir kez korur. Bazen bilerek tehlikeye girmek gerekir.': tr('Zırh seni bir kez korur. Bazen bilerek tehlikeye girmek gerekir.'),
  'Çift adım ve ayna birlikte. İkisini de doğru anda kullan.': tr('Çift adım ve ayna birlikte. İkisini de doğru anda kullan.'),
  'Arena 2. turun sonunda daralır. Turuncu halkada kalırsan elenirsin.': tr('Arena 2. turun sonunda daralır. Turuncu halkada kalırsan elenirsin.'),
  'İki kanat, dar bir bel. Ayna seni öbür kanada taşıyabilir.': tr('İki kanat, dar bir bel. Ayna seni öbür kanada taşıyabilir.'),
  'Ortası kapalı bir avlu. Duvarın hangi yanından dolaşacağını hesapla.': tr('Ortası kapalı bir avlu. Duvarın hangi yanından dolaşacağını hesapla.'),
  'Çapraz duvar düz turda yolunu keser. Karşıya ne zaman geçeceğini seç.': tr('Çapraz duvar düz turda yolunu keser. Karşıya ne zaman geçeceğini seç.'),
  'Bel tek kare. Çift hamleyi geçitte harca.': tr('Bel tek kare. Çift hamleyi geçitte harca.'),
  'Dört bot, iki bonus. Her hamle sayılır.': tr('Dört bot, iki bonus. Her hamle sayılır.'),
});

export const puzzleTitle = (t: string) => titles()[t] ?? t;
export const puzzleHint = (h: string) => hints()[h] ?? h;

// Listede ve sonuç kartında görünen sıra: eğitim ve bulmacalar ayrı sayılır.
export function puzzleNo(list: PuzzleDef[], def: PuzzleDef) {
  return list.filter(p => p.tutorial === def.tutorial).findIndex(p => p.id === def.id) + 1;
}
