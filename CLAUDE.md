# X Sword

- `engine/rules.js` kural motoru, `engine/bots.js` botlar. İkisi de ekrana dokunmaz; tarayıcıda, testlerde ve ileride çevrimiçi sunucuda aynı kod çalışır. Ekran kodu kurala ancak motorun fonksiyonlarıyla erişir.
- `engine/*.d.ts` motorun TypeScript tipleri. Motorun dışa açtığı bir şey değişirse bunları da güncelle.
- `app/` tasarıma göre kurulan oyun: React + TypeScript + Vite. Şimdilik yalnız mobil oyun ekranı var. Maçın akışı `app/src/game/controller.ts`'te; kuralı yalnız motorun fonksiyonlarıyla sorar. Kurulum `npm --prefix app install`, geliştirme `npm --prefix app run dev` (5173), tip denetimi ve derleme `npm --prefix app run build`.
- Çok oyunculu (`app/src/net/`): odayı kuran telefon maçı yürütür (otorite), misafirler yalnız kendi hamlesini gönderir. Herkes aynı tohumla `createGame` çağırır, sonra kurucunun yayınladığı hamleleri sırayla oynar; motor tohumlu olduğu için tahtalar aynı kalır. Bağlantı bugün PeerJS ile telefondan telefona (sunucusuz, hesapsız). Bağlantıyı yalnız `transport.ts` bilir; X Sword'e ait bir sunucuya geçerken yalnız o dosya değişir. Arda 6 Ekim 2026'da "şimdilik sunucusuz, sonra belki ürüne dönüşür" dedi.
- `arena/` motoru deneyen test sahası (https://ardaulker.github.io/x-sword/arena/). `index.html` kuzenden gelen ilk demo; motoru kullanmaz.
- Testler: `node tests/engine.test.mjs` (kurallar + bot gücü), `node tests/tests.js` ve `node tests/tests2.js` (eski demo). Kurala ya da bota dokunduysan önce bunları çalıştır.
- Yayın: `main`'e push `.github/workflows/pages.yml`'ı çalıştırır. İş akışı motor testlerini koşar, `app/`'i derler, siteyi GitHub Pages'e yayınlar. Kökteki sayfalar (`index.html`, `arena/`, `engine/`) olduğu gibi gider; oyun https://ardaulker.github.io/x-sword/oyun/ adresine gider. Push'tan sonra Actions'ta işin bittiğini gör, canlı sayfayı aç ve console'u oku.
- Çeviri (`app/src/i18n/`): `tr('Türkçe cümle', {değişken})` çağrısında anahtar Türkçe metnin kendisidir; Türkçede sözlük gerekmez. Dilleri `en de fr es it pt` dosyalarındaki sözlükler çevirir. Çoğul: `{n:tek|çoğul}`; kalın: `rich('**kalın** metin')`. Dil Ayarlar ekranından seçilir ve `xsword-lang` anahtarıyla saklanır. Yeni bir yazı eklersen altı sözlüğe de ekle; `npm run build` içindeki `app/check-i18n.mjs` eksik ya da uyuşmayan değişkeni yakalar. `tr()` çağrısının ilk argümanı düz tırnaklı yazı olmalı (çıkarıcı yalnız onu görür). Motorun `log` metinleri çevrilmez, ekranda görünmezler.
- Oyuna eklenenler: günlük meydan okuma (`app/src/game/daily.ts`: tarihten tohum, 11×11, 20 bot, en iyi skor cihazda), ilk üç maçta ipucu kartı (`coach.ts`, Ayarlar'dan kapanır), maç sonu paylaşım kartı (`share.ts`, tuvale PNG çizer), çok oyunculuda kopan misafire 15 sn geri dönme hakkı (`net/room.ts`: misafirin gizli `token`'ı, kurucu kopan koltuğa güvenli hamle oynar, dönene `sync` yollar), geniş ekranda tahta solda sağda bilgi (`GameScreen.css` sonundaki medya sorgusu), müzik ve ses seviyesi ayarı, yapay zekâ oyuncuların bonus kullanması (`engine/bots.js` → `bonusMoves`).
- Yeni maçta tahta (9/11/13/15; en az oyuncu sayısının varsayılanı) ve arena botu sayısı her oyuncu sayısında seçilir (`BOARD_SIZES`, `defaultNeutrals`). Zekâ iki ayrı ayardır: `Setup.aiLevel` yapay zekâ rakipler, `Setup.level` arena botları. Yapay zekâ rakipte Normal ara sıra ikinci en iyi hamleyi seçer (`SLIP`), Zor hiç hata yapmaz ve rakip yıldızı avlar (`HUNT_PULL`); ölçüm: Zor, Normal'e %75 kazanır, dikkatli oyuncu Normal'e %37, Zor'a %15 kazanır (`tests/engine.test.mjs`). Tehlike haritası (`threats.ts` → `heatMap`) ayardan ya da ilk iki maçta kendiliğinden açılır.
- Duraklatma: yerel maçta menü düğmesi maçı durdurur (`GameController.pause/unpause`, zamanlayıcılar `deferred` listesine düşer). Ana menüye dönünce maç silinmez, `park` edilir; ana menüde "Devam et" çıkar. Yarım maç `xsword-save` anahtarıyla cihaza yazılır (seçenekler + hamle listesi, `game/record.ts`) ve uygulama yeniden açılınca aynen sürer. Çok oyunculu başlayınca saklı maç silinir. Maç tekrarı bağlantısı `#/izle/KOD` (tohum + hamleler, ekran `ReplayScreen`). İstatistikler `game/stats.ts`, bulmacalar `game/puzzles.ts` (aşağıda "Bulmaca haritaları"). Kurulum seçenekleri (varsayılan kapalı): `personas`, `obstacles`, `teams` (yalnız 4 oyuncu); motor: `state.blocked`, `state.teams`, `friendly()`, `isWinner()`.
- **İkiz** yalnız tek oyunculu moddadır ve oyuncunun aynasıdır: oyuncudan hemen sonra, onun yaptığı yönün aynısını oynar. O kare boşsa yürür, doluysa oradaki taşı alır, kapalıysa yerinde kalır. Bu yüzden oyuncuyu hiç alamaz. Tek oyunculu modda bütün botlar gidince kazanırsın (İkiz'i almana gerek yok). İkiz bir taş alırsa sana çift puan ve ayna bonusu gelir. Arda 6 Ekim 2026'da böyle seçti. Bonuslar şartla gelir: 20 puan çift adım, 40 çift hamle, 60 ikisinden biri, 50 ayna (tahtadaki herhangi bir taşla yer değiştir), ilk daralma zırh, ikinci daralma çift hamle, tek oyunculuda İkiz'in aldığı taş ayna. 2–4 oyunculu yerel maçta kazanan belli olunca "Devam et / Bitir" sorulur (`keepGoing`, çevrimiçide kapalı). Daralacak turda gerilim müziği çalar (`startTension` / `stopTension`). `npm run build` sonunda `app/check-css.mjs` CSS parantezlerini denetler. Kuzenin ilk dosyasında İkiz başkaydı: oyuncunun kurallarıyla oynuyordu ama hamlesini kendi seçen bir avcıydı.
- Oyun metinlerinde "yemek" geçmez. Taş satrançtaki gibi alınır: "5 numarayı aldın!", "3 numara seni aldı!".
- Tasarım kaynağı `design/`: önce `design/CLAUDE_CODE_HANDOFF.md`, sonra `design/tokens/tokens.css` ve `design/reference/*.dc.html` (okunacak referans, çalışan uygulama değil; nasıl okunacağı `design/reference/DC_FORMAT.md`'de).
- Tasarım ilk brief'le yapıldı; şu kararlar onda yok, kodda tasarımın önüne geçer:
  - Oyunun adı **X Sword** ("Taktiksel Satranç Arenası" ve ad önerileri geçersiz).
  - Tasarımdaki "vurmak / vuruş / vurdu" metinleri **"almak / alma / aldı"** olur.
  - Tasarımdaki "İkiz" (boş koltuktaki bot oyuncu) artık **yapay zekâ oyuncu**dur ve insan gibi **"Oyuncu N"** diye anılır. "İkiz" adı yalnız tek oyunculu moddaki aynaya aittir.
  - Üst çubukta **maç saati** vardır: maç başlar başlamaz 00:00'dan sayar, bitince durur; oyun sonunda maç süresi yazar.
- Renkler tasarıma göre (Arda 6 Ekim 2026'da seçti): gidilebilir kareler oyuncunun **kendi renginde**, gidilebilir ama tehlikeli kare kırmızı çizgili, kırmızı (`--danger`) yalnız tehlike ve tehdit, turuncu (`--hazard`) yalnız çökecek halka. Önceki "yeşil = senin yolun, turuncu = botun yolu" kuralı geçersiz.
- Kural ya da bot zekâsı değişince kural metinlerini aynı değişiklikte güncelle: oyundaki "Nasıl oynanır?" ekranı (`app/src/screens/RulesScreen.tsx`) ve arenadaki Kurallar penceresi (`arena/index.html`). `docs/tasarim-prompt.md` içindeki oyun bölümünü de güncelle. Oyuncu rehberi kodla birlikte değişir.
- `index.html` Windows satır sonları (CRLF) ve BOM ile geldi. Dosyayı baştan yazan bir araç kullanırsan satır sonlarını koru. Yoksa diff bütün dosyayı değişmiş gösterir.

---

# Geçmiş ve çalışma notları (modeli değiştirirsen sohbeti baştan okumana gerek yok; bunu oku)

## Arda ile çalışma biçimi
- Arda Türkçe yazar. Cevaplar "kanka" ile başlar, kısa cümle, her cümlede tek fikir; gerekince şema. İş yapmadan önce uzun soru sorma: makul varsayılanı seç, cevapta söyle.
- Kural ya da bot değişince testi koş, metinleri güncelle (aşağıda "Kural değişince" listesi), commit + push et. Push'tan sonra Actions'ın bittiğini ve canlı sayfanın console'unun temiz olduğunu kontrol et. (Son iki turda bu bakılmadı; yine de yap.)
- Commit sonuna `Co-Authored-By` satırı eklenir (sistem hatırlatması söyler).
- X Sword başka hiçbir projeyle hesap, dosya, hafıza paylaşmaz.
- macOS notları: `sed -i ''` ister; `*.tsx` gibi glob'ları tırnakla (`--include='*.tsx'`), zsh yoksa hata verir. Çok satırlı düzenlemede Python betiği kullan.

## Oyun kuralları (güncel özet; ayrıntı `RulesScreen.tsx`)
- Tahta 9/11/13/15 kare (en az: 1 oyuncu 9, 2 oyuncu 11, 3–4 oyuncu 13 gibi `BOARD_SIZES`/`defaultNeutrals`). Her turda mod DÜZ ↔ ÇAPRAZ değişir. Yıldız moda göre düz ya da çapraz gider ve alır. Kızıl bot düz yürür çapraz alır; Çelik bot çapraz yürür düz alır. Herkes tek kare gider. Kızıl/Çelik botlar eşit ve yıldız çevresinde dengeli dağılır (`balancedKinds`).
- Hamle sırası maç başında bir kez karılır (`matchOrder`), bütün maç aynı kalır. **Taş numarası her tur ayakta kalanlar arasında baştan verilir** (`roundOrder` botun `label`'ını da günceller; `app/src/game/order.ts → orderNo`). Tur içinde biri alınsa numaralar o tur değişmez. Sıra şeridi gelecek turları o turun yeni numaralarıyla gösterir.
- Hamle: kareye dokun, önizle, onayla. Süre 20 sn; dolarsa güvenli hamle oynanır.
- Her 6 turda (6., 12., 18. ...) en dış halka çöker; bir tur önce ince turuncu, çökeceği tur çizgili işaretlenir. Gerilim müziği çalar.
- Puan: yıldız / İkiz / Kızıl-Çelik (`POINTS`), son ayakta kalan yıldıza `SURVIVOR_BONUS`. Sıralama: skor, alma sayısı, hayatta kalma. Rakip yıldızlar gidince kazanan belli olur; yerel 2–4 oyunculu maçta "Devam et / Bitir" sorulur (`keepGoing`, çevrimiçide kapalı).
- Tek oyunculu: **İkiz** oyuncunun aynasıdır (oyuncudan hemen sonra aynı yönü oynar, oyuncuyu alamaz). Bütün botlar gidince kazanırsın. İkiz bir taş alırsa çift puan + ayna bonusu.
- Bonuslar: maça bir çift adımla başlanır. 20 puan çift adım, 40 çift hamle, 60 ikisinden biri rastgele, 50 ayna (tahtada herhangi bir taşla yer değiştir). İlk daralmayı atlatan zırh (1 can), ikinci daralmayı atlatan çift hamle. Yapay zekâ da bonus kullanır (`bonusMoves`, `BONUS_COST`).
- Zorluk: Kolay (sen ilk oynarsın), Normal (yer rastgele), Zor (yer rastgele, bot hedef üçgeni gizli). Rakip yapay zekâ (`Setup.aiLevel`) ile arena botları (`Setup.level`) ayrı ayarlanır. Normal rakip %30 ikinci en iyi hamleyi seçer, Zor avlar.
- Seçenekler (varsayılan kapalı): kişilikler (avcı/temkinli/fırsatçı), engel kareleri, takım (2'ye 2, yalnız 4 oyuncu). Bulmacalar (10 haritalı bulmaca, botlar yürümez), günlük meydan okuma, istatistikler, maç tekrarı bağlantısı, çok oyunculu lobi (tahta + bot sayısı).
- Duraklatma: menü düğmesi durdurur; ana menüde "Devam et"; yarım maç `xsword-save` ile cihaza yazılır. Duraklatma menüsü: Devam et, Yeniden başlat, Yeni oyun, Ayarlar (maç içinde yalnız ses, titreşim, dil), Ana menü.

## Ölçümler (`tests/engine.test.mjs` yazdırır)
- Dikkatli oyuncu: Kolay rakibe %92, Normal %37, Zor %15 kazanır. Zor, Normal'e 149–51.
- Kişilik galibiyetleri (90 maç, 4 Zor): avcı 42, temkinli 32, fırsatçı 16.
- Takım dengesi (100 maç, 4 yapay zekâ): Normal A47/B53, Zor A42/B58; gürültü içinde, dokunulmadı. "Hep B kazanıyor" gelirse 300 maçla bak.
- Kızıl/Çelik farkı yıldız çevresinde ortalama 0.53.

## Kararlar ve nedenleri (kronolojik özet)
- Ad X Sword; "vurmak" yerine "almak"; "yemek" hiç geçmez.
- Eski "yeşil/turuncu yol" renk kuralı iptal; renkler tasarıma göre (üstte "Renkler").
- Tek oyunculuda İkiz'i almak şart değil, botlar bitince kazanılır. Bonus şartlı kazanılır (puan, daralmayı atlatma), rastgele dağıtılmaz.
- Çeviri 7 dilde (tr + en de fr es it pt), bayraklı seçici, Ayarlar'dan.
- 7 öneri yapıldı: günlük meydan okuma, ipucu kartı, bonus dengesi + yapay zekâ bonusu, paylaşım kartı, kopan misafire 15 sn, geniş ekran düzeni, ses ayarları. Arda önerilerden birini (3.) istemedi.
- Zor yapay zekâ ilk başta Normal ile eşitti (99–101); Normal'e hata payı, Zor'a avlama eklenince ayrıştı.
- İlk 11 bulmaca rastgele 9×9 pozisyonlardı; Arda "yetersiz ve mantıksız" buldu (7 Ekim 2026). Sebep: botlar kaçıyordu, hamleleri öngörülemiyordu. Yerine 10 elle çizilmiş harita geldi; bulmacada botlar yürümez, yalnız menzile gireni alır (`bots.js → chooseMove`, `state.puzzle`). Kişilikler (3. öneri) ve engel kareleri (6. öneri) zaten Yeni oyun → Seçenekler'deydi; Arda görmemişti.
- Slogan: "Yön her tur el değiştirir." (Arda 1. seçeneği seçti). Renk körü modu adı "Renk desteği" (nazik dil).
- Duraklatma ana menüye dönünce de korunur ve uygulama yeniden açılınca sürer.
- Yapılmadı ama konuşuldu: TestFlight/Capacitor yolu (hafıza notu var), çok oyunculu lobiye kişilik/takım seçeneği, temalar.

## Kural değişince (kontrol listesi)
1. `engine/rules.js` / `bots.js` + `engine/rules.d.ts` tipleri.
2. `node tests/engine.test.mjs`; gerekirse test ekle.
3. `app/src/screens/RulesScreen.tsx`, `arena/index.html` Kurallar, `docs/tasarim-prompt.md` oyun bölümü, bu dosya.
4. Yeni yazı varsa `tr()` ile ekle ve **altı sözlüğe de** (`app/src/i18n/*.ts`) elle ekle. Sözlükler artık elle düzenlenir (eskiden betikle üretiliyordu, betik repoda yok). Anahtar = Türkçe cümlenin kendisi; anahtarı değiştirirsen altı dosyada da değiştir.
5. `npm --prefix app run build` (tsc + vite + `check-css.mjs` + `check-i18n.mjs`).
6. Commit, push, Actions ve canlı console.

## Kod haritası (hızlı)
- Motor: `engine/rules.js` (`createGame`, `play`, `roundOrder`, `matchOrder`, `createPuzzle`, `isWinner`, `friendly`, `ranking`, `attackersOf`), `engine/bots.js` (`chooseMove`, `SLIP`, `HUNT_*`, persona ağırlıkları). Tohumlu (`mulberry32`), tekrar = seçenekler + tohum + hamle listesi.
- Uygulama: `app/src/App.tsx` (hash yönlendirme: `#/ #/oyun #/kurallar #/ayarlar #/cok #/oda #/mac #/katil/KOD #/istatistik #/bulmaca #/izle/KOD`), `game/controller.ts` (maç akışı, pause/park/save/restart/replay), `game/{settings,order,names,record,stats,daily,share,coach,haptics,threats,puzzles}.ts`, `components/{Board,Sheets,InfoChip,PlayerStrip,ActionPanel,TurnQueue,Header,Flag}.tsx`, `screens/*`, `net/{room,protocol,transport}.ts`, `i18n/`.
- Araçlar: `tools/puzzle-maps.mjs` (elle çizilen haritalar) → `node tools/make-puzzles.mjs [id]` → `app/src/game/puzzles.ts` + `tools/puzzles-out.mjs`.

## Dikkat
- `tr()` ilk argümanı düz tırnaklı yazı olmalı. Motorun `log` metinleri çevrilmez ama bot adı (`label`) oyun metinlerinde görünür.
- `index.html` CRLF + BOM; `arena/index.html` düzenlerken satır sonlarını koru (`newline=''` ile oku/yaz).
- Test kurulumları (`position()` gibi) `roundOrder` çağırınca bot `label`'ı yeniden hesaplanır; testte sabit numara varsayma, `pieceById(...).label` kullan.

## Bulmaca haritaları
- Kurallar: hedef, en çok par+1 hamlede bütün botları almak; par'da çözmek 3 yıldız, par+1 2 yıldız. Botlar yürümez, menzile giren yıldızı alır. Mod her tur değişir. Sayaç yok, ipucu kartı yok, hedef üçgeni yok.
- Harita dili: `.` zemin, `#` engel, `-` harita dışı (tahta şekli kare olmak zorunda değil; motor kısa kenarı boşlukla doldurur, `state.holes`), `S` sen, `K` Kızıl, `C` Çelik.
- Akış: haritayı `tools/puzzle-maps.mjs`'e çiz (ad, ipucu, mod, bot sayısı, hedef par, bonus, `needBonus`, `botCols`), `node tools/make-puzzles.mjs <id>` taşları yerleştirir ve çözücüyle doğrular (tam par, ilk hamlede en çok 2 doğru seçenek, botları oyuncu alır, `needBonus` ise bonussuz çözülmez). Ad ve ipucu `app/src/game/puzzleText.ts`'e ve altı sözlüğe eklenir. Bulmaca kimliği 101'den başlar (eski yıldız kayıtları karışmasın); ekranda sıra numarası görünür.
- Tasarım dersleri: tek-tek (tek satır, tek sütun) karelerde engel dizisi çapraz turda taşı dört yandan kapatır, kaçın. Ayna seninle botun yerini değiştirir; bot senin eski karene gider, bu yüzden "ayrı adalar" bulmacası çözülemez.
- **Yeni bulmaca eklerken aşağıdaki fikirleri ve şekilleri tekrar etme.** Henüz kullanılmayan fikirler: zırh, dört bot, çökme halkası, 2 bonus birlikte, simetrik ayna haritası, L/U şekli.

### 101 · Koridor — DUZ, par 3, bonus - — fikir: mod değişimi (düz/çapraz) öğretir
```
#.....#
.......
.KC....
.......
#..S..#
```
### 102 · Haç — CAPRAZ, par 4, bonus - — fikir: dar kollar, alma sırası
```
--...--
--...--
.......
.......
....CK.
--...--
--.S.--
```
### 103 · Halka — DUZ, par 5, bonus - — fikir: ortası boş halka; kenardan dolaşma
```
-.CK..-
.......
.C---..
..---..
S.---..
.......
-.....-
```
### 104 · Sütunlar — CAPRAZ, par 5, bonus - — fikir: tek engel sütunları; engelin arkası
```
.......
.#...#.
...#C..
.......
.#KC.#.
...#.S.
.......
```
### 105 · Merdiven — DUZ, par 5, bonus - — fikir: çapraz şerit; düz turda yol daralır
```
...-----
K.C.----
-...C---
--....--
---..S.-
----....
-----...
```
### 106 · Çift adım — DUZ, par 3, bonus step:1 — fikir: Çift adım bonusu şart
```
....---
...S---
..#..K.
..#K...
.......
```
### 107 · Ayna — CAPRAZ, par 4, bonus swap:1 — fikir: Ayna bonusu şart (yön/kare rengi değiştirmek için)
```
.........
..KK.....
---...---
---.S.---
---...---
---...---
```
### 108 · Elmas — CAPRAZ, par 4, bonus double:1 — fikir: Çift hamle bonusu şart
```
---.---
--...--
-...C.-
....KC.
-.S...-
--...--
---.---
```
### 109 · Kale — DUZ, par 6, bonus - — fikir: kapılı kale duvarları
```
.........
.###.###.
.#.....#.
.#.....#.
S...C....
.#..K..#.
.#.C...#.
.###.###.
.........
```
### 110 · Labirent — CAPRAZ, par 6, bonus step:1 — fikir: labirent + çift adım, 3 bot
```
-...#...-
.#.....#.
...##....
.#.....#S
....#K...
.#..C..#.
....##...
.#K....#.
-...#...-
```

## Arayüz notları (UI/UX turu, 7 Ekim 2026)
- Üst çubukta "TUR n" çevrilir; menü ve savaş kaydı düğmelerinin altında küçük yazı var (kısa ekranda gizli). Mod kutusunun alt yazısı yalnız ilk iki maçta (`ctl.autoMap`) ve bulmacada görünür; sonra kutu 44 px.
- Bonus düğmelerinde kısa ad: Zırh, Adım ×2, Hamle ×2, Ayna (`shortBonus`). Halka çipi "Daralma: n tur".
- Tehlike haritası kareyi boyamaz, ortaya soluk kırmızı nokta koyar.
- Tek oyunculuda önizlemede İkiz'in gideceği kare soluk İkiz taşıyla gösterilir (`Board.tsx → twinGhost`, durumu kopyalayıp hamleyi oynatır).
- Başkaları oynarken panel "N hamle sonra sıra sende" der (`ActionPanel.tsx → untilMe`). Bu turda oynayan son 6 taşın geldiği yer soluk kesik çizgide kalır (`View.lastMoves`). Kendi taşın hep yumuşak nabızlı halkayla seçilir (`halo-me`).
- Senin aldığın taş büyük patlama + büyük puan + 750 ms bekleyiş ile vurgulanır.
- **Geri al** (`GameController.undo`): yalnız Kolay zorlukta (maçta 3 kez) ve bulmacada (sınırsız); günlük ve çok oyunculuda yok. Maçı kayıtlı hamlelerden bir önceki sıranın başına yeniden kurar (`undoPoints`). Ayarlar'da "Önizlemesiz oyna" (`settings.quick`) ve "Botları hızlı oynat" (`settings.fastBots`) seçenekleri var; ikisi de varsayılan kapalı.

## Arayüz notları 2 (8 Ekim 2026)
- **Eğitim**: üç mini bulmaca (201 Düz al, 202 Mod değişir, 203 Tehlike). `tools/puzzle-maps.mjs`'te `tutorial: true` ve üçü de `fixed` (elle çizilmiş, üretici yalnız doğrular). 203: "açgözlü alma tuzağı": Çelik'i almak seni Kızıl'ın çaprazına koyar; önce Kızıl'ı alıp sonra çaprazdan Çelik'i almak gerekir. Bulmacada bulmacanın kendi ipucu tehdit uyarısından önce gösterilir. Bulmaca ekranında ayrı "Eğitim" bölümü; yeni oyuncuya (3 maçtan az, eğitimi bitirmemiş) ana menüde yeşil "Eğitim · 1 dakika" düğmesi çıkar. Tek harita üretirken `node tools/make-puzzles.mjs <id>` (hepsini yeniden üretme: tohum sırası kayar). `app/src/game/puzzleText.ts` haritalardan elle üretildi; yeni harita/ipucu eklenince oraya ve sözlüklere de ekle.
- **Tahta temaları** (`game/themes.ts`): Gece (açık), Zümrüt (6 bulmaca yıldızı), Kor (5 galibiyet), Buz (3 günlük), Mor (25 maç). Yalnız kare, boşluk ve çerçeve rengi değişir (`--kare`, `--kare-2`, `--bosluk`, `--tahta-cerceve`); oyuncu/tehlike/halka renkleri sabit. Ayarlar'da seçilir; açılınca sonuç kartında haber verilir (`freshThemes`).
- **Günlük seri** (`daily.ts → dailyStreak`): oynanan günler `xsword-daily-days`'te; ana menüde "N gün seri".
- **Maç sonu "neden"**: kaybedince kartta "9 numara seni düz aldı · tur 3" ya da "Halkada kaldın"; `TakeEvent.at` ile "Son hamleleri izle" tekrarı o ana açar (`#/izle/KOD~N`).
- **Büyüteç**: 13×13 ve üstünde sağ üstte yakınlaştır düğmesi; kareler ≥34 px, tahta kayar ve taşına ortalanır (`board-scroll`).
- **Yan çevrilmiş telefon** (`GameScreen.tsx → landscape`: yükseklik <520 ve genişlik > 1,2×yükseklik): tahta solda tam yükseklikte, üst bilgiler ve panel sağ sütunda (`land-side`). Dik tablette sütun 680 px.
- Kurallar ekranında "Taşlar" ve "Almak" örnekleri hareket eder (`Mini` → `hop`, `prey`).
- Titreşim desenleri `BUZZ` içinde ayrı ritimlerle (alma, yıldız alma, alınma, daralma, zırh, bonus, galibiyet/yenilgi).
- **Bulmaca gezintisi**: bulmaca sırasında panelde "Geri al · Önceki · Sonraki", sonuç kartında "Önceki" ve "Sonraki" (kazanmadan da geçilir; kazanınca Sonraki vurgulu). Sıra `PUZZLES` dizisi sırasıdır (eğitimler önce, sonra bulmacalar).

## Ödüller ve lobi seçenekleri (8 Ekim 2026)
- **Taş efektleri** (`components/SkinFx.tsx`, CSS `Board.css` sonu): yalnız senin yıldızında görünen animasyonlu süs. Alev (12 bulmaca yıldızı), Şimşek (10 galibiyet), Kristal (7 günlük meydan okuma), Altın (36 bulmaca yıldızı). Seçim Ayarlar → Taş efekti (`settings.skin`, geçerlisi `activeSkin`). Açılış şartları `game/themes.ts` içinde (`SKINS`, `THEMES`, ortak `Need`).
- **Sonuç ödülleri**: kazanılan maç kartında altın efektli yıldız, günlükte şimşekli; bulmacada 3 yıldız alevli ("Kusursuz!"), 2 yıldız kristalli ("İyi iş!"); kazanılan yıldızlar sırayla patlayarak çıkar. Yeni tema ya da efekt açılınca kartta önizlemesiyle haber verilir (`freshRewards`).
- **Demo anahtarı kaldırıldı** (8 Ekim 2026, Arda). Kilitli stile dokununca büyük animasyonlu önizleme kartı açılır (`SettingsScreen.tsx → PeekCard`): ne olduğunu, nasıl açıldığını ve ilerlemeyi gösterir. Arda bu ödülleri ileride satmayı düşünüyor: satış eklenirse `need` yanına bir "satın alındı" kaynağı eklenir ve `isUnlocked` ikisine de bakar; ödeme ve hesap Arda'nın tıklaması.
- **Çok oyunculu lobi seçenekleri**: kurucu rakip kişilikleri, engel kareleri ve (4 dolu koltukta) takım seçebilir (`RoomView.opts`, `MatchStart.personas/obstacles/teams`). Motor tohumlu olduğu için herkes aynı tahtayı kurar.

- **Logo**: ortadaki X, 2 sn'lik döngüde saniyede bir sağa dönüp artı olur, sonra sola dönüp x olur (`.logo-x`, `MainMenu.css`).