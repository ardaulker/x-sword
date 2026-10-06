> **Not (6 Ekim 2026):** Bu brief'in ilk hâliyle yapılan tasarım geldi ve `design/` klasöründe. Artık kaynak o. Renk kodları tasarımdaki gibi oldu: yollar oyuncunun kendi renginde, turuncu çökecek halka, kırmızı tehlike. Ad (X Sword), "almak" ve maç saati bu brief'teki gibi kalır.

# Görev

Telefon için çok oyunculu, sıra tabanlı bir strateji oyununun tasarım dosyasını hazırla. Tasarım sistemi, tüm ekranlar ve tıklanabilir bir prototip istiyorum.

Oyunun adı **X Sword**. Logoda iki kılıç çaprazlanıp bir "X" oluştursun. Bu "×" oyunda çapraz alma yönünün de işareti.

Ekte oyunun şu anki demosu var: `index.html`. Tek kişilik bir prototip. Kuralları, görsel dili ve renk kodlarını oradan oku. Görünüşü birebir kopyalama. Ruhunu koru ve olgunlaştır.

Aşağıdaki kuralların çalışan hâli burada: https://ardaulker.github.io/x-sword/arena/ — 2–4 koltuk, botlar, daralan arena ve hamle önizlemesi orada denenebilir. Oradaki ekran bir test sahası; tasarım yerine geçmez.

# Oyun

## Taşlar
- **Yıldız (oyuncu):** Her oyuncunun tek taşı. Turun moduna göre ya düz ya çapraz gider. Gittiği yönde alır.
- **Kırmızı bot:** Düz yürür, çapraz alır.
- **Mavi bot:** Çapraz yürür, düz alır.
- Her taş tek kare gider. Almak, hedefin karesine geçmektir. Alınan taş oyundan çıkar.
- Herkes herkesi alabilir: oyuncu oyuncuyu, bot oyuncuyu, bot botu.

## Kelime: "almak"
- Taşlar satrançtaki gibi alınır: "Vezir piyonu alır."
- Oyunda "yemek", "öldürmek" ve "vurmak" kelimeleri hiç geçmez.
- Örnekler: "5 numarayı aldın!", "3 numara seni aldı!", "Alma sayısı: 4".

## Tur modu: DÜZ / ÇAPRAZ
- Her tur ya DÜZ ya ÇAPRAZ'dır. Mod her tur sonunda değişir. Bütün yıldızlar için aynıdır.
- Mod, oyunun en önemli bilgisidir. Bir bakışta okunmalı.

## Görsel dil (bunu koru)
- **Şekil yürüme yönünü gösterir:** kare düz, elmas çapraz gider. Mod değişince yıldızın şekli de değişir.
- **Kılıçlar alma yönünü gösterir:** "+" düz alır, "×" çapraz alır.
- Bu iki ipucu renk olmadan da okunmalı, 26 pt'lik karede bile.

## Renk kodları (sabit)
- **Yeşil:** Senin gidebileceğin kareler. Sıran gelince kendiliğinden yanar.
- **Turuncu:** Bir bota ya da rakibe dokununca, onun gidebileceği kareler.
- **Kırmızı:** Alma noktaları. Bunlar alınabilecek taşlardır: senin alabileceklerin de, rakibin alabilecekleri de.
- Bu üç renk yalnızca bu anlamlarda kullanılır.
- Taş renkleri bu üç renkle karışmamalı. Demoda oyuncu taşı yeşil, bir bot tipi kırmızı. Taş renklerini buna göre yeniden kur.

## Tur akışı
1. Hamle sırası maç başında bir kez karılır ve bütün maç aynı kalır. Yıldızlar ve botlar bu tek sırada, araya karışık oynar. Taşın numarası, o turda ayakta kalanlar arasındaki yeridir ve her tur baştan verilir (sıra değişmez). Kolay zorlukta ilk oyuncu oynar; normal ve zorda oyuncunun yeri de rastgeledir. Tek oyunculu modda İkiz hep oyuncudan hemen sonra gelir.
2. Sıra önemlidir, çünkü bir bot diğerini alabilir. Art arda gelen botlar hızlı oynar; oyuncu ekrana dokunarak hızlandırabilir. Alınmış taşın sırası atlanır.
3. Herkes oynayınca mod değişir ve yeni tur başlar.
- Her oyuncunun hamle süresi 20 saniyedir. Bu süre lobide değiştirilebilir. Süre biterse oyun, oyuncunun yerine güvenli bir hamle yapar.

## Oyuncu sayısı ve tahta
- Tek oyunculu modda tahtada bir de **İkiz** olur: oyuncunun aynası. Oyuncudan hemen sonra, onun yaptığı yönün aynısını oynar; o kare boşsa yürür, doluysa oradaki taşı alır, kapalıysa yerinde kalır. Oyuncuyu hiç alamaz. Bütün botlar gidince oyuncu kazanır; İkiz'i almak gerekmez. İkiz bir taş alırsa oyuncuya çift puan ve ayna bonusu verir.
- Bir maçta 2–4 yıldız olur. Boş koltuğa yapay zekâ oyuncu oturabilir. Onun adı da "Oyuncu N"dir ve bir oyuncu gibi sırasını oynar.
- 2 yıldızda tahta 9×9 olur ve yaklaşık 14 bot vardır.
- 3 yıldızda tahta 11×11 olur ve yaklaşık 21 bot vardır.
- 4 yıldızda tahta 13×13 olur ve yaklaşık 28 bot vardır.
- Bu sayılar test edilip ayarlanacak.
- Yıldızlar köşelerden bir kare içeride, birbirinden eşit uzaklıkta başlar. Hangi yıldızın hangi köşeden başlayacağı her maçta rastgeledir. Arena botları rastgele dizilir ama hiçbir yıldızın iki kare yakınına konmaz.

## Botlar
- Botlar oyuncuları kovalar. Bir oyuncuyu alamayan bot başka bir oyuncuya yönelir.
- Bot gitmeden önce şunu düşünür: "Bu karede bir sonraki hamlede alınır mıyım?" Alınacaksa oraya gitmez.
- Üç zorluk var. Kolay: alabiliyorsa alır, yoksa en yakın yıldıza yürür. Normal: alınacağı kareye gitmez, çöken halkada kalmaz, en çabuk ulaşacağı yıldıza yönelir. Zor: buna ek olarak hedef yıldızın kaçış karelerini kapatır.
- Bot zekâsı kodda çözülecek. Senden istenen iki şey var: zorluk seçimi, bir de botun kimi hedeflediğini okunur gösteren bir işaret. Bu işaret ayarlardan kapatılabilsin.

## Bonuslar
- Herkes maça bir çift adımla başlar. Bonuslar şartla kazanılır: 20 puan çift adım, 40 puan çift hamle, 60 puan ikisinden biri; 50 puan ayna (tahtadaki herhangi bir taşla yer değiştir); ilk daralmayı atlatınca zırh; ikinci daralmayı atlatınca çift hamle; tek oyunculuda İkiz bir taş alınca ayrıca ayna bonusu ve çift puan. Kurulumda isteğe bağlı: takımlı (2'ye 2, 4 oyuncu), engel kareleri, rakip kişilikleri (avcı, temkinli, fırsatçı). Bulmaca modunda sınırlı hamlede bütün botlar alınır. Tek oyunculuda bütün botlar gidince kazanılır; 2–4 oyunculuda kazanan belli olunca botlarla savaşa devam edilebilir.
- Zırh: bir kez alınmaktan korur, kendiliğinden çalışır. Çift adım: iki kare git. Çift hamle: hemen bir hamle daha. Ayna: 3 kare içindeki bir taşla yer değiştir.

## Bitiş
- Maç, tek yıldız kalınca biter. Kazananı skor belirler: oyuncu almak 50, İkiz'i almak 30, bot almak 10 puan; ayakta kalan yıldız +30 bonus alır. Sıralama: skor, sonra alma sayısı, sonra hayatta kalma süresi. Saklanmak tek başına kazandırmaz.
- Maç sonsuza kadar sürmesin diye arena daralır. Her 6 turda bir (6., 12., 18. … tur), tur sonunda en dıştaki halka çöker. O halkada kalan taş oyundan çıkar. Bir tur önce halka uyarılır; çökecek tur boyunca halka işaretli görünür.
- Bir maç 5–10 dakika sürmeli.
- Alınan oyuncu maçı izlemeye devam edebilir ya da çıkabilir.

## Çok oyunculu akış
- Hesap açmak yok. Oyuncu takma ad ve renk seçer.
- Akış şöyle: Oda kur → linki, kodu ya da QR'ı paylaş (öncelik WhatsApp) → lobi → başlat.
- Tek başına oynamak isteyen botlara karşı hızlı oyun açar.
- Bağlantısı kopan oyuncu için 30 saniye beklenir. Sonra onun yerine yapay zekâ geçer. Oyuncu geri dönerse yerini geri alır.
- Yabancılarla eşleşme bu sürümde yok.

# Telefon kuralları
- Ekran dikey kullanılır. Oyun tek elle oynanır. Önemli butonlar başparmağın kolayca eriştiği bölgede durur.
- Fareyle üzerine gelme (hover) yok. Bilgi dokunarak ya da uzun basarak açılır.
- Oyuncunun tek taşı var. Sırası gelince gidebileceği kareler kendiliğinden yeşil yanar.
- Hamle iki adımda yapılır: kareye dokun → önizlemeyi gör → onayla. Önizlemede, o karede bu tur seni kimlerin alabileceği kırmızıyla görünür.
- 13×13 tahta 375 pt genişliğe sığmalı. Bu boyda bir kare yaklaşık 26 pt olur. Kareler bu boyda da okunur ve dokunulur kalmalı. Gerekirse yakınlaştırma öner.
- Telefonun çentiğine ve alttaki ana ekran çubuğuna yer bırak.

# Ekranlar
1. Açılış ve ana menü: Hızlı oyun, Oda kur, Odaya katıl, Nasıl oynanır, Ayarlar.
2. Oda kur / katıl: kod girme alanı ve linkle gelen davet.
3. Lobi: 4 koltuk. Her koltukta ad, renk ve "hazır" durumu görünür. Boş koltuk için üç seçenek var: davet et, yapay zekâ ekle, kapat. Lobide ayrıca şunlar bulunur: bot zorluğu, hamle süresi, tahta boyu önizlemesi, Paylaş ve Başlat. Başlat butonunu sadece odayı kuran görür.
4. **OYUN EKRANI.** Emeğin çoğunu bu ekrana ver.
   Üst çubukta şunlar bulunur:
   - **Maç saati.** Başlat'a basıldığı an 00:00'dan saymaya başlar. Oyun bitince durur. Hamle süresiyle karışmamalı.
   - Tur numarası.
   - Büyük ve net bir DÜZ/ÇAPRAZ göstergesi.
   - Sıranın kimde olduğu ve kalan hamle süresi.

   Ekranın geri kalanında şunlar bulunur:
   - tahta
   - oyuncu şeridi: renk, oyunda ya da alındı, alma sayısı
   - açılır savaş kaydı

   Ekranın tasarlanacak durumları:
   - Senin sıran (yeşil yollar yanık, süre akıyor, son 5 saniyede uyarı)
   - Bir bota ya da rakibe dokunma (turuncu yollar, kırmızı alma noktaları)
   - Hamle önizlemesi ve onay
   - Seni şu an alabilecek taşlar
   - Başkasının sırası
   - Bot turu (hızlı, atlanabilir)
   - Mod değişimi anı
   - Alma ve alınma
   - Arena daralma uyarısı ve halkanın çökmesi
   - Alındın → izleyici modu
   - Süre bitti → otomatik hamle
   - Bağlantı koptu / yeniden bağlanıyor
5. Taş bilgi kartı (uzun basınca açılır): taşın nasıl yürüdüğü ve nasıl aldığı (küçük bir diyagramla), sıra numarası, taş botsa hedefi.
6. Savaş kaydı: kim kimi aldı, renk ve ikonla. Satırlar kısa ve okunur olsun.
7. Oyun sonu: sıralama, maç süresi, istatistikler, Rövanş ve Paylaş butonları.
8. Nasıl oynanır: etkileşimli bir eğitim. Kullanıcı her kuralı tahtada kendisi dener.
   **Rehber metni sonra yazılacak.** Bot zekâsı ve kurallar kesinleşince yeni metin gelecek. Şimdilik yer tutucu metin kullan. Ekranlar metin uzayıp kısalsa da bozulmasın.
9. Ayarlar: ses, titreşim, tehlike göstergesi, bot hedef işareti, animasyon hızı, renk körü modu.

# Stil
- Demonun havası şöyle: koyu lacivert zemin, neon vurgular, sekizgen kareler. Bu havayı koru ve olgunlaştır.
- Sekizgen kare oyunun kimliğinin parçası. Küçük boyda okunmayı bozuyorsa alternatif öner.
- Renk sistemi şunları birbirinden ayırmalı: 4 oyuncu rengi, 2 bot tipi ve sabit renk kodları (yeşil yol, turuncu yol, kırmızı alma noktası). Bir de çökecek halkanın rengi olmalı. Bot tipini zaten şekil ve kılıç anlatıyor.
- Oyuncular renkten başka bir işaretle de ayrılsın: desen, harf ya da amblem.
- Kontrast gün ışığında da okunur olsun. Metinler WCAG AA'yı karşılasın.
- Botların oynama sırası okunur olsun ama tahtayı kalabalık yapmasın. Bunun için bir öneri getir.

# Hareket ve his
- Taşlar kayarak gider (150–250 ms). Bir kareden ötekine anında atlamazlar.
- Almada kısa bir efekt olur. Titreşimin nasıl olacağını da not et.
- Mod değişince tahtanın tamamında okunur bir geçiş görünür. Yıldızlar şekil değiştirir.
- Bot turunda botlar hızlıca art arda oynar.
- Her animasyonun süresini ve hız eğrisini yaz.

# Teslim edilecekler
1. Tasarım sistemi sayfası: renk token'ları, yazı ölçeği, taş seti (her taşın her şekli ve rengi), kare durumları, ikonlar, animasyon süreleri.
2. Tüm ekranlar 390×844 dikey boyutta. Oyun ekranını ayrıca 375×667'de (iPhone SE) kontrol et.
3. Oyun ekranının üç tahta boyu: 9×9, 11×11, 13×13.
4. Tıklanabilir prototip. Akışı şöyle olsun: ana menü → lobi → bir tam tur (yeşil yollar, önizleme, onay, bot turu, mod değişimi) → oyun sonu.
5. Kısa bir not: önemli kararların, nedenleri ve açık kalan sorular.

# Çalışma kuralları
- Oyun kurallarını değiştirme. Bir kural tasarımı zorluyorsa bunu not et ve öneri getir.
- Belirsiz bir nokta varsa makul bir varsayım yap, nota yaz ve devam et.
- Arayüz dili Türkçe olacak.
