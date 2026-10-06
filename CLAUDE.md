# X Sword

- `engine/rules.js` kural motoru, `engine/bots.js` botlar. İkisi de ekrana dokunmaz; tarayıcıda, testlerde ve ileride çevrimiçi sunucuda aynı kod çalışır. Ekran kodu kurala ancak motorun fonksiyonlarıyla erişir.
- `arena/` motoru deneyen test sahası (https://ardaulker.github.io/x-sword/arena/). `index.html` kuzenden gelen ilk demo; motoru kullanmaz.
- Testler: `node tests/engine.test.mjs` (kurallar + bot gücü), `node tests/tests.js` ve `node tests/tests2.js` (eski demo). Kurala ya da bota dokunduysan önce bunları çalıştır.
- Derleme adımı yok. `main`'e push GitHub Pages'te yayına girer; sonra canlı sayfayı aç ve console'u oku.
- Oyun metinlerinde "yemek" geçmez. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".
- Renk kodları sabit: yeşil = oyuncunun yolları, turuncu = botun yolları, kırmızı = alma noktaları. Başka bir anlam için kullanma.
- Kural ya da bot zekâsı değişince oyundaki Kurallar penceresini aynı değişiklikte güncelle. `docs/tasarim-prompt.md` içindeki oyun bölümünü de güncelle. Oyuncu rehberi kodla birlikte değişir.
- `index.html` Windows satır sonları (CRLF) ve BOM ile geldi. Dosyayı baştan yazan bir araç kullanırsan satır sonlarını koru. Yoksa diff bütün dosyayı değişmiş gösterir.
