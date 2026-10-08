# Store compliance checklist (privacy, ads, purchases)

The in-app documents (Settings → Legal documents) and the static pages at
`https://ardaulker.github.io/x-sword/play/legal/index.html` (English) and `.../index-tr.html` (Turkish) are written from how the
game works on 9 October 2026. They are a careful draft, **not legal advice**: have them read by a lawyer before the first
store submission. Edit the text in `app/src/legal/{en,tr}.json`; `npm run build` keeps both languages in step and regenerates
the static pages (`tools/make-legal-pages.mjs`).

## What Arda has to supply (blocks store submission)

1. `app/src/legal/config.json`: `contactEmail` (shown on every document and required by both stores), `developer` (name of the
   publisher; the stores show it) and `updated` (change it whenever the text changes).
2. The **governing-law** sentence in the terms (it says "the country where the developer is based"): confirm or name the country.
3. Choices I made in the text that are promises on Arda's behalf; confirm or edit them: purchases will be cosmetic only; no
   personalized ads to children; consent before any ad where the law requires it.
4. The **age rating** answers (Apple questionnaire, Google IARC): no violence beyond abstract piece-taking, no user chat, no
   gambling, no purchases yet. Public lobby shows other players' display names; stores may ask about "user-generated content".

## Apple App Store

- **Privacy "nutrition label"**: today "Data not collected", provided no analytics or ad SDK is added. If the PeerJS service is
  counted as a collector (it sees IP addresses), declare "Other usage data / identifiers: not linked to the user, not used for
  tracking" and re-check when a server is added.
- **Privacy policy URL**: the static page above. **Support URL** and contact: required.
- **App Tracking Transparency**: needed only if ads or analytics track across apps (then a prompt plus `NSUserTrackingUsageDescription`).
- **User-generated content (guideline 1.2)**: display names and the public lobby count. Needed before the lobby ships: a way to
  report a player or room, a way to block, and the right to remove content. Keep the lobby off in the first build if these are not ready.
- **In-app purchases (3.1.1)**: use StoreKit; "Restore purchases" button; show the price from the store; no codes or external
  payment links for digital goods. Randomized paid items need published odds: we do not plan them.
- **Minimum functionality (4.2)**: the plan in `docs/profile-infrastructure.md` (Game Center, native haptics, offline play).
- **Sign in with Apple**: not needed (no third-party login; Game Center is the platform's own).

## Google Play

- **Data safety form**: the same facts as the nutrition label. Declare network use and, if counted, IP address handled in transit
  by third-party services for connections.
- **Families / children**: the game is not designed for children; choose the target age group carefully, because "children" brings
  extra rules for ads and data.
- **Payments**: Google Play Billing for digital goods; show "Restore" equivalents (query purchases on start).
- **Ads** (if added): use a certified SDK, show the ad disclosure, and in the EU/UK/EEA collect consent with Google's UMP before
  loading ads.
- **Closed test**: new personal accounts must run a closed test with a minimum number of testers for a minimum number of days
  before production (check the current numbers when the account is created).

## When ads are added

1. Pick a mediation or ad partner; add it to "Data and third parties" and the privacy policy *before* release.
2. Consent: UMP (Google) / ATT (Apple); store the choice; add a Settings item to change it.
3. No ads on the match screen; interstitials only between matches; rewarded ads only if they never give a gameplay advantage.
4. Children: no personalized ads, set the child-directed flags if the app is ever targeted at them.

## When purchases are added

1. Decide cosmetic-only (as the terms say) and keep `needText`/`isUnlocked` in `game/themes.ts` as the single place that
   decides what is unlocked; add a "purchased" source next to `need` (see CLAUDE.md).
2. Receipts must be validated and stored per store account (a small server or the stores' on-device validation); local storage
   alone is editable.
3. Add "Restore purchases" in Settings; show real prices from the store; link the terms and policy on the purchase screen.
4. Update `commerce` in the legal documents and the store labels in the same change.

## Third parties that see something today

PeerJS cloud (matchmaking), Google and PeerJS STUN servers, PeerJS TURN relays (they carry encrypted traffic when a direct
connection fails), GitHub Pages (hosting of the web version). The list lives in `app/src/legal/en.json → data`.
