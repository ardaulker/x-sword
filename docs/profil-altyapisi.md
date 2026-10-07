# Profil altyapısı

Amaç: oyuncunun gelişimi kaybolmasın, çok oyunculu maçta herkes kendi adıyla görünsün.
iPhone'da **Game Center**, Android'de **Google Play Games** hesabı kullanılır. İkisi de şifresiz ve
otomatik: oyuncu telefona zaten bağlıdır, oyunu açınca sessizce giriş yapılır.

## Neden sunucu yok

- Arda 6 Ekim 2026'da "şimdilik sunucusuz" dedi.
- Kimlik platformdan gelir (Game Center / Play Games). Bizim şifre, e-posta ya da hesap tutmamız gerekmez.
- İlerleme platformun bulut kaydına yazılır (iOS'ta Game Center kayıtlı oyun → iCloud, Android'de Play Games
  kayıtlı oyun). Telefon değişince aynı hesapla açılır, kaldığı yerden sürer.
- İleride bir X Sword sunucusu gerekirse (çevrimiçi eşleşme, liderlik tablosu), aynı `Progress` görüntüsü
  ve `providerId` oraya taşınır; ekran kodu değişmez.

## Bugün çalışan (web tarafı)

| Dosya | Ne yapar |
|---|---|
| `app/src/game/profile.ts` | Profil: görünen ad, renk, cihaz kimliği, bağlı hesap (`guest` / `gamecenter` / `playgames`). İlk açılışta "Kılıç 631" gibi bir ad verilir. |
| `app/src/game/progress.ts` | İlerleme görüntüsü (istatistik, bulmaca yıldızı, günlük, görülen ödüller), **birleştirme** (`mergeProgress`: sayaçta büyük olan, yıldızda en iyisi, günlerde birleşim; hiçbir şey silinmez, aynı görüntüyü iki kez birleştirmek sonucu değiştirmez) ve yedek kodu (`XS1.…`). |
| `app/src/game/platform.ts` | Telefon köprüsü. Web'de hiçbir şey yapmaz. Telefon uygulamasında `XSwordGames` eklentisiyle giriş yapar, buluttaki ilerlemeyle birleştirir, maç sonunda buluta yazar. |
| `app/src/screens/ProfileScreen.tsx` | Profil ekranı (`#/profil`, ana menüde sağ üstteki rozet): ad, renk, hesap durumu, ilerleme özeti, yedek kodu kopyala / yükle. |
| `app/src/net/*` | Çok oyunculu: misafir `hello` mesajında adını ve rengini yollar, lobide ve maçta herkes adıyla görünür (`LobbySeat.name`, `MatchStart.names`). Yapay zekâ "Oyuncu N" kalır. |

Rakibe giden tek şey ad ve renktir. Kimlik, hesap ve ilerleme cihazdan çıkmaz (telefon uygulamasında yalnız
oyuncunun kendi platform bulut kaydına gider).

## Yerel eklentinin sözleşmesi (`XSwordGames`)

`platform.ts` şu üç fonksiyonu bekler; web kodu buna göre yazıldı, yerel taraf yazılınca o dosya değişmez:

```ts
signIn(): Promise<{ provider: 'gamecenter' | 'playgames'; playerId: string; displayName: string }>
loadSnapshot(): Promise<{ data: string | null }>   // progressCode biçimi ("XS1.…")
saveSnapshot({ data }: { data: string }): Promise<void>
```

- **iOS (Swift, GameKit):** `GKLocalPlayer.local.authenticateHandler` ile giriş; kimlik `gamePlayerID`.
  Kayıt: `fetchSavedGames` / `saveGameData(_:withName:)` (tek kayıt adı: `xsword-progress`).
- **Android (Kotlin, Play Games Services v2):** `PlayGamesSdk.initialize`, `GamesSignInClient` ile giriş,
  `PlayersClient` ile oyuncu kimliği ve adı, `SnapshotsClient` ile kayıt.
- Çakışma olursa iki kayıt `mergeProgress` ile birleştirilir; bu yüzden "hangisi doğru" sorusu çıkmaz.

## Yol haritası

1. **Capacitor kabuğu** (Claude): `app/` aynen içine konur, iOS ve Android projeleri üretilir.
   Bkz. hafıza notu "X Sword TestFlight".
2. **`XSwordGames` eklentisi** (Claude): yukarıdaki üç fonksiyon, iOS ve Android için.
3. **Mağaza ve hesap kurulumu** (Arda'nın tıklamaları; para ve hesap Arda'nın):
   - Apple Developer Program üyeliği (yıllık ücretli), Xcode'da imza ekibi.
   - App Store Connect'te uygulama kaydı, Game Center'ın açılması; Xcode'da Game Center ve iCloud yetenekleri.
   - Google Play Console hesabı (tek seferlik ücret), uygulama kaydı, Play Games Services yapılandırması
     (uygulamanın imza parmak izi ile Android kimlik bilgisi).
   - Gizlilik politikası sayfası (iki mağaza da ister). İçerik: ad ve renk rakibe gösterilir; ilerleme oyuncunun
     kendi platform kaydında durur; başka veri toplanmaz.
   - Hesap ve ekip yalnız Arda'nın ya da X Sword'ün olur, başka bir projenin hesabı kullanılmaz.
4. **Deneme:** TestFlight (iOS) ve Play Console iç test kanalı (Android).
