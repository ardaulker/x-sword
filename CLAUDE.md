# X Sword

- `engine/rules.js` kural motoru, `engine/bots.js` botlar. İkisi de ekrana dokunmaz; tarayıcıda, testlerde ve ileride çevrimiçi sunucuda aynı kod çalışır. Ekran kodu kurala ancak motorun fonksiyonlarıyla erişir.
- `engine/*.d.ts` motorun TypeScript tipleri. Motorun dışa açtığı bir şey değişirse bunları da güncelle.
- `app/` tasarıma göre kurulan oyun: React + TypeScript + Vite. Şimdilik yalnız mobil oyun ekranı var. Maçın akışı `app/src/game/controller.ts`'te; kuralı yalnız motorun fonksiyonlarıyla sorar. Kurulum `npm --prefix app install`, geliştirme `npm --prefix app run dev` (5173), tip denetimi ve derleme `npm --prefix app run build`.
- `arena/` motoru deneyen test sahası (https://ardaulker.github.io/x-sword/arena/). `index.html` kuzenden gelen ilk demo; motoru kullanmaz.
- Testler: `node tests/engine.test.mjs` (kurallar + bot gücü), `node tests/tests.js` ve `node tests/tests2.js` (eski demo). Kurala ya da bota dokunduysan önce bunları çalıştır.
- Yayın: `main`'e push `.github/workflows/pages.yml`'ı çalıştırır. İş akışı motor testlerini koşar, `app/`'i derler, siteyi GitHub Pages'e yayınlar. Kökteki sayfalar (`index.html`, `arena/`, `engine/`) olduğu gibi gider; oyun https://ardaulker.github.io/x-sword/oyun/ adresine gider. Push'tan sonra Actions'ta işin bittiğini gör, canlı sayfayı aç ve console'u oku.
- **İkiz** yalnız tek oyunculu moddadır ve oyuncunun aynasıdır: oyuncudan hemen sonra, onun yaptığı yönün aynısını oynar. O kare boşsa yürür, doluysa oradaki taşı alır, kapalıysa yerinde kalır. Bu yüzden oyuncuyu hiç alamaz. Tek oyunculu modda İkiz ve bütün botlar gidince kazanırsın. Arda 6 Ekim 2026'da böyle seçti. Kuzenin ilk dosyasında İkiz başkaydı: oyuncunun kurallarıyla oynuyordu ama hamlesini kendi seçen bir avcıydı.
- Oyun metinlerinde "yemek" geçmez. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".
- Tasarım kaynağı `design/`: önce `design/CLAUDE_CODE_HANDOFF.md`, sonra `design/tokens/tokens.css` ve `design/reference/*.dc.html` (okunacak referans, çalışan uygulama değil; nasıl okunacağı `design/reference/DC_FORMAT.md`'de).
- Tasarım ilk brief'le yapıldı; şu üç karar onda yok, kodda tasarımın önüne geçer:
  - Oyunun adı **X Sword** ("Taktiksel Satranç Arenası" ve ad önerileri geçersiz).
  - Tasarımdaki "vurmak / vuruş / vurdu" metinleri **"almak / alma / aldı"** olur.
  - Üst çubukta **maç saati** vardır: maç başlar başlamaz 00:00'dan sayar, bitince durur; oyun sonunda maç süresi yazar.
- Renkler tasarıma göre (Arda 6 Ekim 2026'da seçti): gidilebilir kareler oyuncunun **kendi renginde**, gidilebilir ama tehlikeli kare kırmızı çizgili, kırmızı (`--danger`) yalnız tehlike ve tehdit, turuncu (`--hazard`) yalnız çökecek halka. Önceki "yeşil = senin yolun, turuncu = botun yolu" kuralı geçersiz.
- Kural ya da bot zekâsı değişince oyundaki Kurallar penceresini aynı değişiklikte güncelle. `docs/tasarim-prompt.md` içindeki oyun bölümünü de güncelle. Oyuncu rehberi kodla birlikte değişir.
- `index.html` Windows satır sonları (CRLF) ve BOM ile geldi. Dosyayı baştan yazan bir araç kullanırsan satır sonlarını koru. Yoksa diff bütün dosyayı değişmiş gösterir.
