# X Sword

Sıra tabanlı bir arena oyunu. 9×9 sekizgen karelik bir tahtada 17 bota karşı hayatta kalırsın.

İlk sürümü Arda'nın kuzeni yaptı; reponun ilk commit'i o sürümün kendisi. Oyunu artık Arda geliştiriyor.

## Oynamak

Canlı: **https://ardaulker.github.io/x-sword/** — `main`'e her push GitHub Pages'te yayına girer.

Bilgisayarda: `index.html` dosyasını tarayıcıda aç. Kurulum yok, sunucu yok.

## Test

`tests/` oyunu Node'da sahte bir DOM ile binlerce kez otomatik oynatır:

```
node tests/tests.js    # 2.000 rastgele + 2.000 dikkatli oyun, kazanma oranları
node tests/tests2.js   # renkli yollar, ölen botların atlanması, kayıt metinleri
```

## Kurallar

- Sen yeşil yıldızsın. Her tur mod değişir: DÜZ ya da ÇAPRAZ. O yöne gidersin, o yönde alırsın.
- Kırmızı bot düz yürür, çapraz alır. Mavi bot çapraz yürür, düz alır.
- İkiz (1 numara) seninle aynı kurallarla oynar.
- Herkes herkesi alabilir. Son kalan sen olursan kazanırsın.
- Yeşil kareler senin yolların. Bir bota dokununca turuncu kareler onun yollarını gösterir. Kırmızı kareler alınabilecek taşlardır.

## Sırada ne var

- Çok oyunculu: 2–4 kişi, tahta oyuncu sayısıyla büyür.
- Boş koltuklara bir sonraki hamleyi hesaplayan zeki botlar.
- Tasarım: [docs/tasarim-prompt.md](docs/tasarim-prompt.md)
