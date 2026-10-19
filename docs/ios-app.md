# The iPhone app (Capacitor shell)

`app/ios/` is an Xcode project that wraps the web game (`app/dist`) in a native shell (Capacitor 8, Swift Package Manager, iOS 15+,
iPhone only). It builds and runs in the simulator today. Built on 17 October 2026 with Xcode 26.1.1.

## Build and run (no account needed for the simulator)

```
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer   # only if `xcode-select -p` still points at the command line tools
npm --prefix app run ios:sync        # builds the web game and copies it into app/ios/App/App/public
npm --prefix app run ios:open        # opens the project in Xcode; press Run with an iPhone simulator selected
# or from the terminal:
cd app/ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

The first build downloads Capacitor's Swift package from GitHub (about 5 minutes); later builds take seconds. The web assets are
generated (`app/ios/App/App/public` is git-ignored): run `ios:sync` after every web change.

## What is in the shell

| Piece | Where | Notes |
|---|---|---|
| App id, name | `app/capacitor.config.ts`, Xcode target | `com.ardaulker.xsword` (Arda, 19 October 2026). It must match the App ID in Arda's Apple Developer account and can never change once the app exists on App Store Connect. The paused Android shell still says `com.xsword.game`; pick its Google Play id when Android resumes. |
| Native plugin `XSwordGames` | `app/ios/App/App/XSwordGamesPlugin.swift`, registered in `XSwordViewController.swift` | Game Center sign-in (`signIn`), progress in a Game Center saved game (`loadSnapshot`/`saveSnapshot`), vibration rhythms through Core Haptics (`haptic`). The web side is `app/src/game/platform.ts`. |
| Haptics | `haptic` | The web game's `BUZZ` patterns play on iPhone (Safari has no `navigator.vibrate`). Simulators have no haptic hardware: the plugin falls back to one tap per step. **Feel it on a real iPhone.** |
| Sign-in | `signIn` | In a simulator without a Game Center account it rejects ("local player has not been authenticated") and the game keeps the guest profile; verified in the simulator log. |
| Entitlements | `App/App.entitlements` | Game Center. The cloud save also needs the **iCloud** capability (Xcode → Signing & Capabilities → + Capability → iCloud, tick "iCloud Documents"); until then `saveSnapshot` fails quietly and progress stays on the device. |
| Privacy manifest | `App/PrivacyInfo.xcprivacy` | Declares no tracking and no collected data (matches `app/src/legal/en.json`). Re-check it whenever an SDK is added. |
| Info.plist | `App/Info.plist` | Dark interface style, `arm64`, `ITSAppUsesNonExemptEncryption = false` (only HTTPS and system crypto). |
| Icon and splash | `Assets.xcassets`, drawn by `tools/make-ios-assets.py` | Rerun the script if the logo changes. The icon has no transparency, as the App Store requires. |

## Testing on your own iPhone for free (no paid account)

A free Apple ID is enough to run the app on your own phone from Xcode; only TestFlight, other people's phones and the store need the
paid Apple Developer Program.

1. iPhone: Settings → Privacy & Security → **Developer Mode** on (the phone restarts). Connect it with a cable and tap "Trust".
2. Xcode → Settings → Accounts → add your Apple ID. Open `app/ios/App/App.xcodeproj` → target **App** → Signing & Capabilities → tick
   "Automatically manage signing" → Team: your name (Personal Team).
3. Change the **Bundle Identifier** to something unique (for example `com.<yourname>.xsword`); free accounts cannot reuse an id that
   someone else registered. Tell Claude which one you used so `capacitor.config.ts` can match.
4. Pick your iPhone as the run destination and press Run. On the phone: Settings → General → VPN & Device Management → trust your
   developer app.
5. Limits of a free account: the app stops opening after **7 days** (run it again from Xcode), at most 3 apps at a time, no Game Center
   or iCloud capability. Debug builds carry no entitlements for exactly this reason, so they run; Game Center sign-in simply fails and the
   game keeps the guest profile. Vibration, sound, touch feel and multiplayer can all be tested this way.

The no-install alternative is the web version: Safari → Share → "Add to Home Screen" (works fully, but iPhone web has no vibration).

## Arda's steps (accounts, money, signing)

1. Join the **Apple Developer Program** (yearly fee) with an Apple ID that belongs to Arda or to X Sword (never another project's).
2. Run once in Terminal: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` (needs the password; it also lets Claude's
   live simulator panel work) and open Xcode once to accept the license and install the extra components.
3. Xcode → open `app/ios/App/App.xcodeproj` → target **App** → Signing & Capabilities: pick the Team; fix the Bundle Identifier (then
   tell Claude so `capacitor.config.ts` matches). Add the **iCloud** capability.
4. App Store Connect: create the app record with the same bundle id; turn on **Game Center**; fill the privacy policy URL
   (`https://ardaulker.github.io/x-sword/play/legal/privacy.html`), support URL and contact, the age rating and the "App Privacy" answers
   (see `docs/store-compliance.md`); set `contactEmail` in `app/src/legal/config.json` first.
5. Xcode → Product → Archive → Distribute App → App Store Connect → upload; then TestFlight (internal testers need no review).
6. Screenshots (6.9" and 6.5" iPhone) and the store text in each language.

## Uploading (first build 1.0 (1) uploaded on 19 October 2026)

- Xcode: device selector → **Any iOS Device (arm64)** → Product → **Archive** → Organizer → **Distribute App → App Store Connect**.
  Raise `CURRENT_PROJECT_VERSION` (build number) for every new upload; `MARKETING_VERSION` is the version players see.
- From the terminal (what Claude does after a fix): raise `CURRENT_PROJECT_VERSION`, `npm --prefix app run ios:sync`, then
  `xcodebuild -project app/ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath <archive> -allowProvisioningUpdates archive`
  and `xcodebuild -exportArchive -archivePath <archive> -exportOptionsPlist <plist> -exportPath <dir> -allowProvisioningUpdates` with a plist of
  `method app-store-connect`, `destination upload`, `signingStyle automatic`, `teamID 7KYB5QW7U5`.
- Signing needs a **local Apple Distribution certificate** (Xcode → Settings → Accounts → Manage Certificates → + Apple Distribution).
  Xcode's cloud-managed certificate writes the "Ü" of "Arda ÜLKER" decomposed into the signature's requirement, and App Store
  Connect rejects the upload with "Invalid Signature. Code failed to satisfy specified code requirement(s)".
- Nothing is public until a version is submitted for App Review and released. TestFlight: internal testers must be App Store
  Connect users; friends go into an **external** group (email invites or a public link) after Beta App Review of the first build.

## Before the first TestFlight build

- Apple's guideline 4.2 (minimum functionality): the native pieces above (Game Center, haptics, offline play) are what make this more
  than a web wrapper. Offline play already works because the web build is bundled in the app; multiplayer needs the network.
- Settle the sword-draw sound's license (see `docs/third-party-licenses.md`).
- Decide whether the public lobby ships; it needs the report/block flow answered (see `docs/store-compliance.md`).
- Real-device checks: vibration patterns, Game Center sign-in, audio with the silent switch, rotating the phone, a PeerJS match between
  the phone and a browser.
