// Bulmaca adları ve ipuçları çevrilsin diye burada düz tr() çağrısı olarak durur (çıkarıcı yalnız düz yazıyı görür).
// tools/puzzle-maps.mjs'e yeni bulmaca eklenince buraya da ekle.
import { tr } from '../i18n';

const titles = (): Record<string, string> => ({
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
});

const hints = (): Record<string, string> => ({
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
});

export const puzzleTitle = (t: string) => titles()[t] ?? t;
export const puzzleHint = (h: string) => hints()[h] ?? h;
