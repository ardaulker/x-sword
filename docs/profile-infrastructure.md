# Profile infrastructure

Goal: players never lose their progress, and in multiplayer everyone shows up under their own name.
On iPhone the **Game Center** account is used, on Android **Google Play Games**. Both are password-free and automatic:
the player is already signed in on the phone, so opening the game signs in silently.

## Why there is no server

- Arda said "serverless for now" on 6 October 2026.
- The identity comes from the platform (Game Center / Play Games). We don't need to keep passwords, emails or accounts.
- Progress is written to the platform's cloud save (Game Center saved games → iCloud on iOS, Play Games saved games on
  Android). On a new phone, signing in with the same account picks up where the player left off.
- If an X Sword server is needed later (online matchmaking, leaderboards), the same `Progress` snapshot and
  `providerId` move there; the screen code doesn't change.

## Working today (web side)

| File | What it does |
|---|---|
| `app/src/game/profile.ts` | Profile: display name, color, device id, linked account (`guest` / `gamecenter` / `playgames`). On first launch it gets a name like "Sword 631". |
| `app/src/game/progress.ts` | Progress snapshot (stats, puzzle stars, daily, announced rewards), **merging** (`mergeProgress`: the larger counter, the best stars, the union of days; nothing is deleted, and merging the same snapshot twice changes nothing) and the backup code (`XS1.…`). |
| `app/src/game/platform.ts` | Phone bridge. Does nothing on the web. In the phone app it signs in through the `XSwordGames` plugin, merges with the cloud progress and writes to the cloud at the end of a match. |
| `app/src/screens/ProfileScreen.tsx` | Profile screen (`#/profile`, the badge at the top right of the main menu): name, color, account status, progress summary, copy / load the backup code. |
| `app/src/net/*` | Multiplayer: a guest sends its name and color in the `hello` message; everyone shows up by name in the lobby and in the match (`LobbySeat.name`, `MatchStart.names`). AI stays "Player N". |

The only thing sent to an opponent is the name and color. The id, the account and the progress never leave the device
(in the phone app they only go to the player's own platform cloud save).

## The native plugin contract (`XSwordGames`)

`platform.ts` expects these three functions; the web code is written against them, so that file won't change once the
native side exists:

```ts
signIn(): Promise<{ provider: 'gamecenter' | 'playgames'; playerId: string; displayName: string }>
loadSnapshot(): Promise<{ data: string | null }>   // progressCode format ("XS1.…")
saveSnapshot({ data }: { data: string }): Promise<void>
haptic({ pattern }: { pattern: number[] }): Promise<void>   // optional: vibrate/pause durations in ms
```

- **Haptics:** iPhone browsers cannot vibrate, so `game/haptics.ts` hands every rhythm to `haptic()` when the plugin has it.
  iOS: Core Haptics transient events at the given offsets (`CHHapticEngine`); Android: `VibrationEffect.createWaveform`.
- **iOS (Swift, GameKit):** sign in with `GKLocalPlayer.local.authenticateHandler`; the id is `gamePlayerID`.
  Saves: `fetchSavedGames` / `saveGameData(_:withName:)` (one save named `xsword-progress`).
- **Android (Kotlin, Play Games Services v2):** `PlayGamesSdk.initialize`, sign in with `GamesSignInClient`, player id
  and name from `PlayersClient`, saves through `SnapshotsClient`.
- On a conflict both saves are merged with `mergeProgress`, so the question "which one is right" never comes up.

## Roadmap

1. **Capacitor shell** (Claude): `app/` goes inside as it is; iOS and Android projects are generated.
   See the memory note "X Sword TestFlight".
2. **`XSwordGames` plugin** (Claude): the three functions above, for iOS and Android.
3. **Store and account setup** (Arda's clicks; money and accounts are Arda's):
   - Apple Developer Program membership (yearly fee), the signing team in Xcode.
   - The app record in App Store Connect, Game Center turned on; Game Center and iCloud capabilities in Xcode.
   - A Google Play Console account (one-time fee), the app record, Play Games Services configuration (an Android
     credential with the app's signing fingerprint).
   - A privacy policy page (both stores require one). Contents: name and color are shown to opponents; progress stays
     in the player's own platform save; nothing else is collected.
   - The account and team belong only to Arda or to X Sword; no other project's account is used.
4. **Testing:** TestFlight (iOS) and the Play Console internal testing track (Android).
