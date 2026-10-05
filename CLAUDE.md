# X Sword

- Oyunun tamamı `index.html`. Derleme adımı yok.
- Oyun metinlerinde "yemek" geçmez. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".
- Renk kodları sabit: yeşil = oyuncunun yolları, turuncu = botun yolları, kırmızı = alma noktaları. Başka bir anlam için kullanma.
- Kural ya da bot zekâsı değişince oyundaki Kurallar penceresini aynı değişiklikte güncelle. `docs/tasarim-prompt.md` içindeki oyun bölümünü de güncelle. Oyuncu rehberi kodla birlikte değişir.
- `index.html` Windows satır sonları (CRLF) ve BOM ile geldi. Dosyayı baştan yazan bir araç kullanırsan satır sonlarını koru. Yoksa diff bütün dosyayı değişmiş gösterir.
