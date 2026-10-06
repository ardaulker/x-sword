# X Sword

Sıra tabanlı bir arena oyunu. 9×9 sekizgen karelik bir tahtada 17 bota karşı hayatta kalırsın.

İlk sürümü Arda'nın kuzeni yaptı; reponun ilk commit'i o sürümün kendisi. Oyunu artık Arda geliştiriyor.

## Oynamak

Canlı: **https://ardaulker.github.io/x-sword/** — `main`'e her push GitHub Pages'te yayına girer (`.github/workflows/pages.yml`).

Bilgisayarda: `index.html` dosyasını tarayıcıda aç. Kurulum yok, sunucu yok.

## Arena (yeni kural motoru)

**https://ardaulker.github.io/x-sword/arena/** — 2–4 koltuk (insan ya da bot), oyuncu sayısıyla büyüyen tahta,
daralan arena, hamle önizlemesi ve üç zorlukta bot. İnsanlar şimdilik aynı telefonda sırayla oynar.

- `engine/rules.js`: kurallar. Ekrana dokunmaz; ileride çevrimiçi sunucu da bunu kullanacak.
- `engine/bots.js`: Kolay / Normal / Zor botlar.

## Oyun (yeni arayüz, yapım aşamasında)

**https://ardaulker.github.io/x-sword/oyun/** — `app/` klasörü, `design/` klasöründeki tasarıma göre kurulan oyun: React + TypeScript + Vite.
Kural motoru olarak `engine/` kullanılır. Şimdilik mobil oyun ekranı var: tek oyunculu mod (sen + aynan İkiz + arena botları) ya da 2–4 yıldızla yapay zekâya karşı.
`main`'e her push'ta GitHub Actions motor testlerini koşar, oyunu derler ve bütün siteyi Pages'e yayınlar.

```
npm --prefix app install
npm --prefix app run dev     # http://localhost:5173
npm --prefix app run build   # tip denetimi + app/dist
```

## Test

`tests/` oyunu Node'da sahte bir DOM ile binlerce kez otomatik oynatır:

```
node tests/engine.test.mjs  # yeni motor: kurallar, botların risk almaması, bot gücü
node tests/tests.js         # eski demo: 2.000 rastgele + 2.000 dikkatli oyun
node tests/tests2.js        # eski demo: renkli yollar, ölen botların atlanması, kayıt metinleri
```

## Kurallar

- Sen yeşil yıldızsın. Her tur mod değişir: DÜZ ya da ÇAPRAZ. O yöne gidersin, o yönde alırsın.
- Kırmızı bot düz yürür, çapraz alır. Mavi bot çapraz yürür, düz alır.
- Tek oyunculu modda İkiz senin aynandır: senden hemen sonra, senin yönünde oynar. İkiz ve bütün botlar gidince kazanırsın.
- Her maçta rastgele bir köşeden, rastgele bir bot dizilişiyle başlarsın.
- Hamle sırası maç başında bir kez karılır, bütün maç aynı kalır; botun numarası sıradaki yeridir. Kolayda ilk sen oynarsın.
- Herkes herkesi alabilir. Son kalan sen olursan kazanırsın.
- Yeşil kareler senin yolların. Bir bota dokununca turuncu kareler onun yollarını gösterir. Kırmızı kareler alınabilecek taşlardır.

## Sırada ne var

- Çok oyunculu: 2–4 kişi, tahta oyuncu sayısıyla büyür.
- Boş koltuklara bir sonraki hamleyi hesaplayan zeki botlar.
- Tasarım: [docs/tasarim-prompt.md](docs/tasarim-prompt.md)
