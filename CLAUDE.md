# X Sword

- `engine/rules.js` kural motoru, `engine/bots.js` botlar. İkisi de ekrana dokunmaz; tarayıcıda, testlerde ve ileride çevrimiçi sunucuda aynı kod çalışır. Ekran kodu kurala ancak motorun fonksiyonlarıyla erişir.
- `arena/` motoru deneyen test sahası (https://ardaulker.github.io/x-sword/arena/). `index.html` kuzenden gelen ilk demo; motoru kullanmaz.
- Testler: `node tests/engine.test.mjs` (kurallar + bot gücü), `node tests/tests.js` ve `node tests/tests2.js` (eski demo). Kurala ya da bota dokunduysan önce bunları çalıştır.
- Derleme adımı yok. `main`'e push GitHub Pages'te yayına girer; sonra canlı sayfayı aç ve console'u oku.
- Oyun metinlerinde "yemek" geçmez. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".
- Tasarım kaynağı `design/`: önce `design/CLAUDE_CODE_HANDOFF.md`, sonra `design/tokens/tokens.css` ve `design/reference/*.dc.html` (okunacak referans, çalışan uygulama değil; nasıl okunacağı `design/reference/DC_FORMAT.md`'de).
- Tasarım ilk brief'le yapıldı; şu üç karar onda yok, kodda tasarımın önüne geçer:
  - Oyunun adı **X Sword** ("Taktiksel Satranç Arenası" ve ad önerileri geçersiz).
  - Tasarımdaki "vurmak / vuruş / vurdu" metinleri **"almak / alma / aldı"** olur.
  - Üst çubukta **maç saati** vardır: maç başlar başlamaz 00:00'dan sayar, bitince durur; oyun sonunda maç süresi yazar.
- Renkler tasarıma göre (Arda 6 Ekim 2026'da seçti): gidilebilir kareler oyuncunun **kendi renginde**, gidilebilir ama tehlikeli kare kırmızı çizgili, kırmızı (`--danger`) yalnız tehlike ve tehdit, turuncu (`--hazard`) yalnız çökecek halka. Önceki "yeşil = senin yolun, turuncu = botun yolu" kuralı geçersiz.
- Kural ya da bot zekâsı değişince oyundaki Kurallar penceresini aynı değişiklikte güncelle. `docs/tasarim-prompt.md` içindeki oyun bölümünü de güncelle. Oyuncu rehberi kodla birlikte değişir.
- `index.html` Windows satır sonları (CRLF) ve BOM ile geldi. Dosyayı baştan yazan bir araç kullanırsan satır sonlarını koru. Yoksa diff bütün dosyayı değişmiş gösterir.
