# The Android app (Capacitor shell)

`app/android/` is an Android Studio / Gradle project that wraps the web game (`app/dist`) like the iPhone shell does
(`docs/ios-app.md`): Capacitor 8, minSdk 24 (Android 7), compile and target SDK 36. **Written on 17 October 2026 but not yet
built or run:** this Mac had no Java or Android SDK, so the first build still has to happen (see "Toolchain").

## Toolchain (one time)

Needed: JDK 21, the Android SDK (platform 36, build-tools, platform-tools) and, to try the app without a phone, the emulator with a system
image. Either install Android Studio (it brings all of it) or the command-line tools:

```
brew install --cask temurin@21 android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "emulator" "system-images;android-36;google_apis;arm64-v8a"
```

## Build and run

```
npm --prefix app run android:sync      # builds the web game and copies it into the Android project
cd app/android && ./gradlew assembleDebug          # app/android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk     # emulator or a phone with USB debugging on
npm --prefix app run android:open      # or open the project in Android Studio and press Run
```

Run `android:sync` after every web change.

## What is in the shell

| Piece | Where | Notes |
|---|---|---|
| App id, name | `app/capacitor.config.ts`, `app/android/app/build.gradle` (`applicationId`, `namespace`), `strings.xml`, `MainActivity.java` package | `com.xsword.game` is a **placeholder**; it must be the id Arda wants on Google Play (it can never change after the first upload). Rename the Java package folder too when changing it. |
| Native plugin `XSwordGames` | `app/android/app/src/main/java/com/xsword/game/XSwordGamesPlugin.java`, registered in `MainActivity.java` | Play Games sign-in (`signIn`), progress in a Play Games saved game (`loadSnapshot` / `saveSnapshot`), vibration rhythms (`haptic`, `VibrationEffect.createWaveform`). The web side is `app/src/game/platform.ts`. |
| Play Games | `play-services-games-v2` in `app/android/app/build.gradle` | Needs the game created in the Play Console with Play Games Services configured (an OAuth credential bound to the app's signing fingerprint) and the manifest meta-data described in the comment in `AndroidManifest.xml`. Until then `signIn` rejects ("not configured") and the guest profile is used. |
| Permissions | `AndroidManifest.xml` | `INTERNET` (multiplayer) and `VIBRATE`. Nothing else. `allowBackup` is off so the local progress is not copied to Google Drive behind the player's back (the privacy text says it stays on the device). |
| Icons and splash | `res/mipmap-*`, `res/drawable*/splash.png`, `ic_launcher_background.xml`, drawn by `tools/make-android-assets.py` | Adaptive icon (dark background plus the logo in the safe zone), legacy square and round icons. Rerun the script if the logo changes. |
| Theme | `res/values/styles.xml`, `colors.xml` | Dark status and navigation bars. Android 15+ draws the page edge to edge: check the safe-area padding on a real phone and the emulator. |

## Arda's steps (accounts, money, signing)

1. **Google Play Console** account (one-time fee; a personal account also needs identity verification). Decide the final **application id**.
2. Create the app in the Play Console (free, Turkish primary language). Fill the store listing (`docs/store-listing.md`), privacy policy URL, data
   safety form, content rating and target audience (`docs/store-compliance.md`).
3. **Play Games Services**: in the Console → Grow → Play Games Services → set up, create the game, add the Android credential with the app
   signing SHA-1 (Play App Signing shows it under Setup → App signing). Send Claude the numeric project id so the manifest meta-data can be added.
4. **Signing key**: let Google manage it (Play App Signing, recommended) and keep only an *upload key*. Create it once with
   `keytool -genkeypair -v -keystore xsword-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000` and store the file and its
   passwords **outside the repository** (a password manager, a backup). Losing the upload key is recoverable by Google support; leaking it is not.
5. Build the release bundle: `cd app/android && ./gradlew bundleRelease`, sign it with the upload key (a `signingConfigs` block reading the
   passwords from `~/.gradle/gradle.properties`; Claude can add the block, never the secrets), and upload `app-release.aab` to an
   **internal testing** track. Internal testers (up to 100 by e-mail) get it within minutes, without a review.
6. A new personal account must run a **closed test** with the required number of testers for the required number of days before it may release
   to production: check the current numbers in the Console.

## Before the first test build

- Real-phone checks: vibration patterns, Play Games sign-in (after step 3), sound, edge-to-edge layout, rotating the phone, a PeerJS match between
  the phone and a browser.
- The sword-draw sound's license (see `docs/third-party-licenses.md`) and the contact e-mail in `app/src/legal/config.json`.
