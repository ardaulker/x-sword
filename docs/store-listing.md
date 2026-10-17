# Store listing drafts (App Store and Google Play)

Draft texts for the store pages, written from what the game does on 17 October 2026. The game ships Turkish first, so Turkish is the
primary language of the listing and English the second. Check the limits when pasting (App Store: name 30, subtitle 30, promotional
text 170, keywords 100 characters in total, description 4000; Google Play: title 30, short description 80, full description 4000).
Do not mention features that are not shipped (leaderboards, purchases, public lobby) until they are.

## Turkish (primary)

**Name:** X Sword
**Subtitle (App Store):** Yön her tur el değiştirir
**Short description (Google Play, 80):** Sıra tabanlı arena oyunu: her tur yön değişir, taşları al, arena daralır.
**Promotional text (170):** Bu hafta: avcı botlar, 25 yeni zorlukta bulmaca, kılıç sesi ve üç iki bir geri sayım. Tek başına, yapay zekâya karşı ya da arkadaşlarınla oyna.
**Keywords (100, comma separated):** strateji,taktik,sıra tabanlı,bulmaca,arena,çok oyunculu,zeka,kılıç,günlük,satranç,bot

**Description:**
X Sword, sekizgen karelerden oluşan bir tahtada oynanan sıra tabanlı bir strateji oyunu. Kuralı tek cümleyle: **yön her tur el değiştirir.**

Bir tur düz, sonraki tur çapraz. Yıldızın o turun yönünde yürür ve alır. Kırmızı botlar düz yürür, çapraz alır; mavi botlar çapraz yürür, düz alır. Her taşı tek kare oynar, doğru kareyi seçmek her şey.

**Nasıl oynanır**
• Bir kareye dokun, önizle, onayla. Tehlikeli kareler kırmızı çizgilerle işaretli.
• Her 6 turda arenanın dış halkası çöker. İçeride kal.
• Her alışta kılıç darbesi, her bonusta ayrı bir ses.
• Bonuslarla oyunu çevir: Çift adım, Çift hamle, Yer Çalma ve Zırh. Puanla ve hayatta kalarak kazanılır.

**Oyun modları**
• **Tek kişilik:** Aynan Çift seninle birlikte oynar, bütün botları temizle.
• **2–4 oyuncu:** Yapay zekâ rakiplere karşı, isteğe bağlı kişilikler, engel kareleri ve takımlar.
• **Çok oyunculu:** Arkadaşlarınla kodla ya da davet bağlantısıyla odaya katıl. Yavaş oyuncuya çan çal.
• **Bulmacalar:** Elle çizilmiş haritalar, sınırlı hamle. Bazı botlar avcıdır ve sana doğru yürür.
• **Günlük meydan okuma:** Herkes bugün aynı tahtada oynar. Seri tut.
• **Eğitim:** Bir dakikada üç mini bulmacayla kuralları öğren.

**Seni oynatan şeyler**
• 15 başarım, istatistikler, tahta temaları ve yıldızına özel efektler (alev, şimşek, kristal, altın). Hepsi oynayarak açılır.
• Zorluk basamakları: Kolay, Normal ve Zor.
• Yedi dil: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce.

**Gizlilik:** Hesap yok, reklam yok, takip yok. İlerlemen cihazında kalır.

## English (second language)

**Name:** X Sword
**Subtitle (App Store):** Direction changes hands
**Short description (Google Play, 80):** A turn-based arena game: the direction flips every round. Take pieces, outlast the ring.
**Promotional text (170):** New: hunter bots, 25 tougher puzzles, a sword-draw sound and a 3-2-1 countdown. Play solo, against AI or with friends.
**Keywords (100):** strategy,tactics,turn based,puzzle,arena,multiplayer,brain,sword,daily,chess,bots

**Description:**
X Sword is a turn-based strategy game on a board of octagonal squares. The rule in one line: **direction changes hands every round.**

One round is straight, the next is diagonal. Your star moves and takes in that round's direction. Red bots walk straight and take diagonally; blue bots walk diagonally and take straight. Everyone moves one square, so choosing the right square is everything.

**How it plays**
• Tap a square, preview, confirm. Dangerous squares are striped red.
• Every 6 rounds the outer ring of the arena collapses. Stay inside.
• Every take lands with a sword stroke; every bonus has its own sound.
• Turn the game with bonuses: Double step, Double move, Switcheroo and Armor, earned by points and by surviving.

**Game modes**
• **Solo:** your mirror, the Twin, plays along with you. Clear out every bot.
• **2–4 players:** against AI rivals, with optional personalities, obstacle squares and teams.
• **Multiplayer:** join friends with a room code or an invite link. Ring a bell for a slow player.
• **Puzzles:** hand-drawn maps and a limited number of moves. Some bots are hunters and walk toward you.
• **Daily challenge:** everyone plays the same board today. Keep your streak.
• **Tutorial:** learn the rules in a minute with three mini puzzles.

**What keeps you playing**
• 15 achievements, statistics, board themes and effects for your star (flame, lightning, crystal, gold), all unlocked by playing.
• Three difficulty levels: Easy, Normal and Hard.
• Seven languages: Turkish, English, German, French, Spanish, Italian, Portuguese.

**Privacy:** no account, no ads, no tracking. Your progress stays on your device.

## App Store Connect fields

- **Primary language:** Turkish. **Category:** Games → Strategy (secondary: Puzzle). **Price:** free.
- **Privacy policy URL:** `https://ardaulker.github.io/x-sword/play/legal/privacy.html` (Turkish: `privacy-tr.html`). **Support URL:** needs a page or the
  contact mail (set `contactEmail` in `app/src/legal/config.json` first). **Marketing URL:** optional.
- **App Privacy ("nutrition label"):** Data Not Collected (see `docs/store-compliance.md` for the PeerJS caveat).
- **Age rating questionnaire:** abstract piece-taking with sword-stroke animation and no blood; no chat, no user-generated content besides
  display names, no gambling, no purchases, no ads. Expect 4+ (answer "infrequent/mild cartoon or fantasy violence" if Apple's form asks about
  the sword strokes, which gives 9+).
- **Export compliance:** the app uses only HTTPS and system encryption (`ITSAppUsesNonExemptEncryption = false` is already set).
- **Review notes (English):** "X Sword needs no login. Online play is peer to peer: create a room on one device (Multiplayer → Create room)
  and join with the 5-character code on a second device. A match can also be played alone (Quick match) or against AI players (New game →
  2 players). There are no in-app purchases and no ads. Game Center is used only to sign in silently when available."
- **Screenshots (6.9-inch, 1320×2868, 5–8 images):** 1 the main menu, 2 a match mid-game with the sword stroke on a take, 3 the bonus bar and
  the Double move strip, 4 a puzzle with a hunter (dashed ring), 5 the lobby with seats, 6 the bonus guide, 7 achievements, 8 the result card.
  Capture them from the simulator (`xcrun simctl io booted screenshot`) in Turkish and English. Add 6.5-inch only if Connect asks for it.
- **Version text "What's New" (1.0):** "İlk sürüm." / "First release."

## Google Play Console fields

- **App category:** Game → Strategy. **Contact email** and **privacy policy URL** as above. **Data safety:** no data collected or shared (note the
  connection helpers in `docs/store-compliance.md`). **Content rating:** answer the IARC form like the Apple one. **Target audience:** 13+ is the
  safe choice (the game is not aimed at children; choosing "children" triggers extra rules).
- **Graphics:** 512×512 icon, a 1024×500 feature graphic (draw it from `tools/make-share-image.py`), phone screenshots (at least 2, 16:9 or 9:16).
- New personal accounts must run a closed test with the minimum number of testers for the minimum number of days before production: check the
  current numbers when the account is created.
