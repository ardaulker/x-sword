# .dc.html dosyalarını okuma

Bu dosyalar tasarım tuvalinin kaynağıdır; doğrudan tarayıcıda çalışmazlar (tuvalin çalışma zamanı gerekir). Referans olarak okunur.

- `<x-dc>` içindeki HTML = işaretleme ve satır içi stiller (ölçüler, renkler birebir buradan alınır).
- `{{ad}}` = `renderVals()` fonksiyonunun döndürdüğü değer. `{{p.st}}` gibi stil boşlukları JS'te hesaplanan CSS metnidir.
- `<sc-for list="{{x}}" as="y">` = döngü (React'te `x.map`). `<sc-if value="{{k}}">` = koşullu gösterim.
- `<dc-import name="OyunEkrani" durum="bot" …>` = başka dosyayı bileşen olarak, prop'larla çağırır.
- `<script type="text/x-dc">` içindeki `class Component extends DCLogic` = mantık (React sınıf bileşeni gibi; `state`, `setState`, `componentDidMount`).
- `<a href="X.dc.html">` = prototipte ekranlar arası geçiş → uygulamada route.

En önemli dosya `OyunEkrani.dc.html`:
- `scene9()`, `sceneGen()` örnek sahneler
- `wd/hd/moves/hitters/targetOf` kurallar
- `staticUi()` her ekran durumunun tanımı
- `startGame/next/runBots/botStep/flipMode` canlı tur akışı
- `boardTap/boardHover/boardKey` etkileşim (geniş dokunma, fare üstü, klavye)
- `look/oct/notch/seg` çizim geometrisi
- `build()` mobil ve masaüstü düzen ölçüleri
