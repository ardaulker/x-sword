# Taktiksel Satranç Arenası — Geliştirici aktarımı (Claude Code için)

Bu klasör, tasarım tuvalindeki her şeyi kodlanabilir hale getirir. Claude Code'a önce bu dosyayı okut, sonra `tokens/` ve `reference/` klasörlerini kullan.

- **Tasarım tuvali:** https://claude.ai/artifact/M3HUrLN5y4CpEwXtVrFQdn (özel; erişim için paylaşman gerekir)
- **Arayüz dili:** Türkçe. Tüm metinler `reference/*.dc.html` dosyalarındaki gibi.
- **Oyuncu adları:** Şimdilik "Oyuncu 1 … Oyuncu 4". Takma ad sistemi gelince bu alan kullanıcının takma adıyla dolar. Bakan kişi kendini metinlerde "Sen" olarak görür ("Senin sıran", savaş kaydında "Sen").

---

## 0. Claude Code'a önerilen ilk mesaj

> `satranc-arenasi-tasarim/CLAUDE_CODE_HANDOFF.md` dosyasını baştan sona oku. `tokens/tokens.css` ve `reference/` klasöründeki `.dc.html` dosyaları tasarımın kaynağıdır (çalıştırılabilir uygulama değil, referans). Önce bölüm 9'daki kural motorunu saf TypeScript olarak, birim testleriyle yaz. Sonra bölüm 3'teki bileşenleri ve bölüm 4'teki ekranları kur. Mobil (390×844) ve masaüstü (1440×900) düzenleri aynı bileşenleri kullanmalı. Her adımda bana ne yaptığını özetle.

---

## 1. Klasör içeriği

| Yol | Ne |
|---|---|
| `CLAUDE_CODE_HANDOFF.md` | Bu belge: yapı, bileşenler, durumlar, etkileşim, hareket |
| `tokens/tokens.css` | Renk, yazı, boşluk, köşe, hareket token'ları (CSS değişkenleri) |
| `tokens/tokens.json` | Aynı token'lar, JSON (Tailwind / tema dosyası üretmek için) |
| `reference/*.dc.html` | Tuvaldeki her artboard'un kaynağı. İşaretleme + stil + mantık burada. `OyunEkrani.dc.html` en önemlisi: tahta çizimi, kurallar, prototip durum makinesi, mobil ve masaüstü düzen |
| `reference/DC_FORMAT.md` | `.dc.html` dosyalarını nasıl okuyacağın |

## 2. Önerilen teknik yapı (öneri, zorunlu değil)

- **Tek web uygulaması**, mobil öncelikli ve duyarlı. Telefonda tarayıcıdan ya da PWA olarak; masaüstünde tarayıcıda.
- React + TypeScript + Vite. Stil için CSS değişkenleri (`tokens.css`) + CSS Modules ya da Tailwind (token'lar `tokens.json`'dan).
- **Kural motoru** (`/src/game/`) arayüzden bağımsız, saf fonksiyonlar. Aynı kod sunucuda da çalışmalı.
- **Çok oyunculu:** sunucu otoriter oda durumu + WebSocket. Supabase Realtime, PartyKit ya da kendi Node sunucun olabilir. İstemci yalnız niyet gönderir (`hamle {r,c}`), durumu sunucu yayar. Bot hamleleri sunucuda hesaplanır, istemciye sıralı olay listesi olarak gelir; istemci bunları art arda oynatır.
- **Düzen eşikleri:**
  - `< 900px` genişlik: mobil düzen (dikey, tek sütun). 390 tasarım genişliği; 375'te (iPhone SE) sıkışık başlık.
  - `900–1199px`: mobil düzen ortalanmış (en fazla 480px) + yanlarda boşluk.
  - `≥ 1200px`: masaüstü 3 sütun düzeni (300 | tahta | 340), 24px dış boşluk. Tasarım 1440×900; 1280×720'de tahta yüksekliğe göre küçülür (bkz. 5.2).
- Güvenli alanlar: `env(safe-area-inset-top/bottom)`. Tasarımdaki 47/34 px bu değerlerin yer tutucusu.

## 3. Bileşenler

### 3.1 Taş (`Piece`)
Props: `kind: 'star' | 'red' | 'blue'`, `player?: 0..3`, `mode: 'duz'|'capraz'`, `size: number`, `state?: 'normal'|'ghost'|'dead'`, `halo?: 'turn'|'threat'|'ring'|'current'|'pinned'`, `targetColor?`, `targetDir?: 0..7`, `orderPip?: number`, `threatBadge?: number`.

Geometri (kutu = kare hücre, viewBox 0 0 100 100):
- **Dış şekil** = bir div: `left/top 17%`, `width/height 66%`, `border-radius 10%`.
  - Kare (düz yürür): `rotate(0)`. Elmas (çapraz yürür): `rotate(45deg) scale(.95)`.
  - Yıldız: şekil moda göre (DÜZ → kare, ÇAPRAZ → elmas). Kızıl bot hep kare, Çelik bot hep elmas.
  - Geçiş: `transform 320ms cubic-bezier(.34,1.56,.64,1)`.
- **Oyuncu dolgusu:** oyuncu rengi + `box-shadow: 0 0 0 max(1.5px, 6% boyut) #FFF, 0 0 35% renk/AA` (beyaz halka + parıltı).
- **Bot dolgusu:** `--bot-kizil` / `--bot-celik` + `inset 0 0 0 Xpx rgba(11,16,38,.30)`.
- **İç işaret** (SVG path, mürekkep `#0B1026`):
  - Kızıl bot `×`: `M33 33 L67 67 M67 33 L33 67`, stroke 10, round
  - Çelik bot `+`: `M50 27 V73 M27 50 H73`, stroke 10, round
  - Amblemler: O1 daire `M50 36 A14 14 0 1 1 49.99 36 Z` (dolu) · O2 üçgen `M50 33 L66 62 L34 62 Z` (dolu + 3 stroke) · O3 çift çizgi `M33 42 H67 M33 58 H67` (stroke 9) · O4 halka `M50 37 A13 13 0 1 1 49.99 37 Z` (dolgusuz, stroke 8)
- **Hedef işareti** (bot → kovaladığı yıldız): açı 45°'ye yuvarlanır (8 yön). Uç R=64, taban R=44, yarı genişlik 13; dolgu hedef oyuncunun rengi, kenar mürekkep 4. Kod: `OyunEkrani.dc.html` → `notch()`. Ayarlardan kapatılabilir.
- **Halo:** `inset -6%`, daire. Sıra sende: 2px düz oyuncu rengi · Tehdit: 2px kesik `--danger` · Çökecek halkada: 2px kesik `--hazard` · Oynayan bot: 2px düz beyaz · Seçili/bilgi: 2.5px beyaz + 4px %20 beyaz.
- **Sıra rozeti** (yalnız bot turunda; oynayan + sonraki 3): 15px (masaüstü 18), sol üst −5px, `--ice` zemin, Oxanium 700.
- **Tehdit rozeti** (kendi taşında, sırandayken): 16px (masaüstü 20) kırmızı daire, sağ üst, sayı.
- **Hayalet** (önizleme): dolgu renk/33, 2px kesik kenar. Fare üstü önizlemede opaklık .55, seçilince .85.

### 3.2 Kare (`Cell`)
- Sekizgen `clip-path`. Köşe kesiği tahta boyuna göre: **9×9 %26 · 11×11 %22 · 13×13 %18**.
- İki ton dama: `--kare` / `--kare-2`.
- Durumlar (öncelik sırasıyla üst üste biner):

| Durum | Zemin | Çerçeve (SVG, iç 6 birim) | Orta işaret |
|---|---|---|---|
| normal | dama tonu | — | — |
| gidilebilir, güvenli | oyuncu rengi %18 | oyuncu rengi, 7 | DÜZ: küçük kare · ÇAPRAZ: küçük elmas |
| gidilebilir, tehlikeli | `-45°` kırmızı çizgi deseni | oyuncu rengi, 7 | aynı |
| vurulabilir | dama tonu | oyuncu rengi, 7 | 4 nişan çizgisi `M50 2 V18 M50 82 V98 M2 50 H18 M82 50 H98`, beyaz 8 |
| fare üstü (masaüstü) | — | `--ice`, 9 | — |
| seçili | — | beyaz, 11 | — |
| çökecek halka | `45°` turuncu kalın şerit | — | — |
| çöktü | `#070B1E` | kesik `#2B3670` 4, `6 7` | — |

Desen değerleri `tokens.css` içinde (`--pat-danger`, `--pat-hazard`).

### 3.3 Tahta (`Board`)
- Katmanlar: ızgara (kareler) → çizgiler (iz, tehdit çizgisi) → efektler → taşlar → üst katmanlar (mod kartı, bildirim) → dokunma/tıklama katmanı.
- **Taşlar ayrı katmanda, `transform: translate()` ile konumlanır.** Böylece kayma animasyonu kendiliğinden olur. Ölü taş DOM'da kalır: `scale(.4)`, `opacity 0`, 180ms.
- **Çerçeve dokusu moda göre:** DÜZ `0°/90°` ızgara, ÇAPRAZ `45°/-45°` ızgara (`--tex-duz`, `--tex-capraz`). Çökecek halka turunda çerçeve kenarı `--hazard`.
- **Hücre boyu:**
  - Mobil: `floor((W − 12 − 2·6 − gap·(n−1)) / n)`; gap 9×9'da 3, diğerlerinde 2. 390'da 9×9 → 38, 11×11 → 29, 13×13 → 26. 375'te 13×13 → 25.
  - Masaüstü: `min(72, floor((704 − 16 − gap·(n−1)) / n))`; gap 9×9'da 4, diğerlerinde 3. Yükseklik 900'den azsa 704 yerine `min(merkezGenişliği, yükseklik − 48)` kullan.
- **Çizgiler:**
  - iz: degrade, kalınlık `max(3, 16% hücre)`, %70 opak
  - tehdit: 2.5px kesik kırmızı `6/4`
  - kendinden seçime: 2.5px noktalı oyuncu rengi `3/4`

### 3.4 Mod göstergesi (`ModeIndicator`) — oyunun en önemli bilgisi
- DÜZ: `--ice` zemin, mürekkep yazı, kare ikonu + `+`.
- ÇAPRAZ: gece zemin, `--ice` 2px iç kenar, `±45°` çizgi deseni, elmas + `×`.
- Mobil: başlık altında, 56px yükseklik, etiket Oxanium 800 28px; sağda "SONRAKİ TUR ◇ ÇAPRAZ". SE'de başlık çubuğuyla birleşir (44px).
- Masaüstü: sol sütunda büyük kart, etiket 48px, altında "TUR n · SONRAKİ …".
- Mod değişim kartı tahtanın ortasında belirir (bölüm 7).

### 3.5 Diğer bileşenler
- **Oyuncu şeridi (mobil) / oyuncu listesi (masaüstü):** amblemli küçük taş, ad, alt satırda "n vuruş", "Oynuyor · 14 sn", "Koptu · 23 sn" ya da "3. · elendi". Sırası olan oyuncunun kenarı rengiyle yanar, `0 0 0 3px renk/33`. 4 oyuncuda ad 11px.
- **Eylem paneli** (mobil altta, masaüstü sağ üstte). Varyantlar:
  - `gen`: kim, başlık, alt başlık, sayaç, süre çubuğu, ipucu
  - `onz`: önizleme; risk satırı, tehdit çipleri, Vazgeç / Onayla. Riskliyse Onayla `--danger` ve "Riskli · Onayla"
  - `threat`: seni vurabilecekler
  - `bot`: "Botlar oynuyor n/N", parça çubuğu, Hızlandır
  - `spect`: izleyici; Maçtan çık / İzlemeye devam
  - `win`: kazandın
- **Taş bilgi kartı:** mobilde alttan açılan kart (uzun basma). Masaüstünde sağ sütunda satır içi kart (fare üstü; tıklayınca sabitlenir). İçerik: ad + sıra, YÜRÜR / VURUR 3×3 diyagram, hedef, "Bu tur seni vurabilir" uyarısı.
- **Savaş kaydı:** mobilde alttan açılan kart (başlıktaki kılıç ikonu, rozetle sayı). Masaüstünde sağ sütunda hep açık. Satır: [saldıran] Ad ⚔ [gri kurban] üstü çizili ad. Tur başlıklarıyla gruplu, en yeni üstte.
- **Bildirim** (toast): buz zemin, mürekkep yazı, 36–40px hap. Vuruş ("Çelik #12 vuruldu · +1"), süre doldu.
- **Bant (banner):** tahta ortasında "Oyuncu 3 elendi · 3. sıra", "Dış halka çöktü".
- **Bağlantı bandı:** turuncu kenarlı, "Bağlantı koptu · Yeniden bağlanıyor… [Tekrar dene]". Tahta %45 opak ve gri.

## 4. Ekran → referans dosyası eşlemesi

**Mobil (390×844):**
- `Main` (ana menü)
- `OdaKatil` (kod)
- `Davet` (linkle gelen davet)
- `Lobi` (kurucu)
- `LobiMisafir`
- `Egitim` (5 adımlık etkileşimli eğitim)
- `Ayarlar`
- `OyunSonu`
- `Prototip` (oynanabilir tur)
- `Oyun-01…17` (oyun durumları)
- `Tahta-09/11/13`
- `SE-13`, `SE-09-Onizleme` (375×667)

**Masaüstü (1440×900):**
- `MasaustuMenu`
- `MasaustuLobi`
- `MasaustuPrototip` (oynanabilir, fare + klavye)
- `MasaustuSonu`
- `MasaustuAyarlar`, `MasaustuEgitim`: mobil bileşen ortada 390×844 pencere olarak; "Geri" pencereyi kapatır
- `M-Oyun-*` (oyun durumları)

**Ortak:** `TasarimSistemi` (token ve bileşen kataloğu), `Notlar` (kararlar, varsayımlar, açık sorular).

Oyun durumlarının hepsi tek bileşenden gelir: `OyunEkrani.dc.html`. Prop'ları `durum`, `boyut`, `cihaz` (`390|se|masaustu`) ve `canli` (prototip). `staticUi()` her durumun sahnesini, `panel()` panel metinlerini üretir.

## 5. Düzen ölçüleri

### 5.1 Mobil oyun ekranı (390×844)
Yukarıdan aşağı, aralar 6px:

| Bölüm | Ölçü |
|---|---|
| güvenli alan | 47 |
| başlık | 44: menü · TUR n + halka çipi · kayıt |
| mod göstergesi | 56 |
| oyuncu şeridi | 48 |
| tahta | esnek alan, ortalanmış |
| eylem paneli | doğal yükseklik |
| alt güvenli alan | 34 |

- Önemli butonlar panelde, başparmak bölgesinde. Onayla sağda ve iki kat geniş.
- SE (375×667): başlık ve mod tek satır (48), şerit 40, alt güvenli alan 6.

### 5.2 Masaüstü oyun ekranı (1440×900)
3 sütun, dış boşluk 24, aralar 24:

- **Sol (300px):**
  - logo
  - mod kartı
  - halka çipi (44)
  - oyuncu listesi (60px satırlar)
  - en altta klavye kısayolları kartı
- **Orta:** tahta, ortalanmış. Bildirim ve bağlantı bandı tahtanın üstünde.
- **Sağ (340px):**
  - eylem paneli
  - (varsa) taş bilgi kartı
  - savaş kaydı (kalan yüksekliği doldurur, taşanı kesilir/kayar)

## 6. Etkileşim

### 6.1 Mobil (dokunma)
- Sıra gelince gidilebilir kareler kendiliğinden yanar. Sayaç 20 sn'den akar (lobide 10/20/30).
- **Geniş dokunma:** dokunulan nokta, merkezi **1,6 adım** içinde kalan en yakın gidilebilir kareye çekilir. Böylece 26 pt karede bile her hedef ≥ 44 pt davranır.
- Kendi taşına dokun → seni şu an vurabilecekler (tehdit çizgileri + `threat` paneli). Tekrar dokun → kapanır.
- Bir bota/yıldıza dokun ya da uzun bas (450 ms) → bilgi kartı.
- İki adımlı hamle: kareye dokun → önizleme (hayalet + tehdit çizgileri + risk paneli) → **Onayla**. Aynı kareye ikinci dokunuş da onaylar. Vazgeç önizlemeyi kapatır.
- Bot turunda tahtaya dokunmak ya da "Hızlandır": kalan bot hamleleri anında uygulanır.
- Yakınlaştırma (öneri): 13×13'te iki parmak / çift dokunuşla oyuncu taşı merkezli 1,6×.

### 6.2 Masaüstü (fare + klavye)
- **Fare üstü** (sırandayken): en yakın gidilebilir kare (0,75 adım içinde) hayaletle önizlenir; tehdit çizgileri çizilir, panel ipucu risk yazar. Bu adım hiçbir şey kilitlemez.
- **Tıkla:** seç (önizleme kilitlenir, panel `onz`). **Aynı kareye tekrar tıkla ya da Enter:** onayla.
- Fare bir taşın üstünde → sağ sütunda bilgi kartı. Tıkla → sabitle, boş yere tıkla → kapat.
- **Klavye** (tahta odaktayken; global dinleyici değil, tahta bileşeninde `onKeyDown`):

| Tuş | İş |
|---|---|
| `↑ ↓ ← →` / `W A S D` | DÜZ turda yön seç |
| `Q E Z C` / Numpad `7 9 1 3` | ÇAPRAZ turda yön seç |
| `Enter` | onayla |
| `Esc` | vazgeç / kartı kapat |
| `Boşluk` | bot turunu hızlandır |
| `Tab` | tahtaya odaklan (görünür odak halkası: 2px `--ice`) |

- İmleç: gidilebilir karede `pointer`, diğer yerde `default`.

## 7. Hareket ve titreşim

| An | Süre | Eğri | Not |
|---|---|---|---|
| Yıldız kayması | 220 ms | `cubic-bezier(.2,.8,.2,1)` | iz 300 ms'de söner |
| Bot kayması | 130 ms | aynı | botlar arası 60–110 ms (`1200 / botSayısı`), tüm tur ≤ 1,2 sn |
| Kare seçimi / hayalet | 120 ms | ease-out | |
| Vuruş | 80 ms parlama + 160 ms patlama | ease-out | tahta 2px × 3 sarsılır (120 ms) |
| Ölen taş | 180 ms | ease-in | scale .4, opacity 0 |
| Mod değişimi | 700 ms toplam | `cubic-bezier(.6,0,.2,1)` | desenli bant tahtayı 360 ms'de süpürür, kart 280 ms döner, doku + ↔ × |
| Yıldız şekil değişimi | 320 ms | `cubic-bezier(.34,1.56,.64,1)` | 45° dönüş, yaylanma |
| Son 5 sn | 1 sn döngü | ease-in-out | sayaç kırmızı, 1→1,08 nabız, panel kenarı kırmızı |
| Halka uyarısı | 1,2 sn döngü | linear | şerit dışa akar |
| Halka çökmesi | ≤ 700 ms | ease-in | kareler 12 ms kademeyle 220 ms'de çöker |
| Panel / kart | 240 açılış / 180 kapanış | açılış `(.2,.8,.2,1)` · kapanış ease-in | arka plan %64 kararır |

- Animasyon hızı ayarı tüm süreleri çarpar: Yavaş ×1,45 · Normal ×1 · Hızlı ×0,65.
- `prefers-reduced-motion`: kaymalar 120 ms solmaya döner, sarsıntı yok.

**Titreşim** (`navigator.vibrate`; iOS Safari desteklemez, sessizce atla):

| An | Desen |
|---|---|
| Seçim | 10 ms |
| Onay | 20 ms |
| Vuruş | `[30, 40, 20]` |
| Seni vurdular / elendin | `[60, 50, 60]` |
| Son 5 sn | her saniye 8 ms |
| Halka çökmesi | 60 ms |

Masaüstünde titreşim yok; yerine ses.

## 8. Erişilebilirlik
- Metin kontrastları `TasarimSistemi`'nde hesaplı. Tümü #0B1026 üstünde AA. `--metin-3` yalnız 12px ve üstü.
- Renkten bağımsız işaretler: şekil (yürüme), kılıç (vurma), amblem (oyuncu), desen (tehlike/halka).
- **Renk körü modu:** oyuncu paleti `#56E0A6 #F5D43B #FF8A5C #8FB8FF`, amblem ve kılıç çizgileri +2 kalın.
- Tüm kontroller gerçek `<button>` / `<a>`. İkon butonlarda `aria-label`.
- Tahta için `role="grid"` + her hücreye `aria-label`. Örnek: "Satır 6, sütun 5, gidilebilir, 2 taş vurabilir".
- Sıra değişimleri `aria-live="polite"` ile duyurulur.
- Dokunma hedefleri ≥ 44px.

## 9. Kural motoru (oyun kurallarını değiştirme)

Referans uygulama: `OyunEkrani.dc.html` → `wd()`, `hd()`, `moves()`, `hitters()`, `targetOf()`, `botMove()`.

- `ORTH = [[-1,0],[1,0],[0,-1],[0,1]]`, `DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]]`
- **Yıldız:** yürüme = vurma = mod yönleri (DÜZ → ORTH, ÇAPRAZ → DIAG).
- **Kızıl bot:** yürür ORTH, vurur DIAG. **Çelik bot:** yürür DIAG, vurur ORTH.
- Tek kare. Yürüme yalnız boş kareye. Vurma = dolu kareye geçmek; hedef oyundan çıkar. Herkes herkesi vurabilir.
- Çöken halkalar geçersiz kare. `ring = min(r, c, n−1−r, n−1−c)`, `ring < collapsed` ise geçersiz.
- **Tur akışı:**
  1. Oyuncular sırayla oynar; her tur başlayan değişir.
  2. Botlar `num` sırasıyla oynar; ölen atlanır.
  3. Halka çökmesi (varsa).
  4. Mod değişir.
- **Süre biterse:** en az riskli hamle (risk = hitters sayısı); eşitlikte vurmasız, sonra merkeze yakın.
- **Önizleme riski:** seçilen karede, bu turun kalanında oynayacak taşlardan seni vurabilenler.
- **Bot ilkesi** (brief): en yakın yıldızı kovalar; "bir sonraki hamlede yenir miyim?" kontrolüyle yenecekse gitmez. Zor: bir sonraki tura vuruş hazırlar. Prototipteki bot basit bir yer tutucudur. Zekâ kodda çözülecek.
- **Tahta / bot sayısı / başlangıç:**
  - 2 yıldız: 9×9, ~14 bot
  - 3 yıldız: 11×11, ~21 bot
  - 4 yıldız: 13×13, ~28 bot
  - Başlangıç noktaları `Lobi` mantığında (`starts`).
- **Halka takvimi (varsayım):** ilk çöküş 9×9'da tur 11 sonunda, sonra her 4 turda. Uyarı çökecek turun başında.
- **Bağlantı:** kopan oyuncu için 30 sn. Sırası gelmişse oyun bekler, sonra İkiz oynar. Dönerse yerini alır.

## 10. Çok oyunculu akış
- Hesap yok. Takma ad (≤ 12 karakter) + renk/amblem; cihazda saklanır.
- **Oda kodu:** 5 karakter, A–Z ve 0–9. Karışan karakterleri (0/O, 1/I) çıkarmak önerilir.
- **Davet linki:** `https://<alan>/o/K7Q2M`. WhatsApp paylaşımı: `https://wa.me/?text=…`. Masaüstünde QR + link kopyala öne çıkar.
- **Lobi:** 4 koltuk. Boş koltuk: Davet et / İkiz ekle / Kapat. Bot zorluğu, hamle süresi, tahta önizlemesi. Başlat yalnız kurucuda; misafirde "Hazırım".
- **Hızlı oyun:** tek oyuncu + botlar (ve istenirse İkiz).

## 11. Açık sorular
`reference/Notlar.dc.html` içinde. Özet:

- Bot sayısı ve halka aralığı testle ayarlanacak.
- Sol el modu gerekli mi?
- Paylaş: görsel sonuç kartı mı, yalnız link mi?
- Ses karakteri seçilmeli.
- Oyun adı seçilmeli (öneriler: Sekiz · Düz Çapraz · Yıldız Meydanı).
