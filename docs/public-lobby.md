# Public lobby: how rooms are listed

## What is built

- **Lobby screen** (`app/src/screens/Lobby.tsx → MultiplayerEntry`): create a room (with a "Show in the public lobby" switch),
  join by code, and a list of open rooms with the host's name and color, seats filled (n/4), board, difficulty and options.
  Tapping Join connects through the normal room code, so a listing is only a phone book.
- **Room side** (`net/room.ts → HostRoom`): a public room publishes an ad while it waits in the lobby, repeats it every
  12 s and withdraws it when the match starts, the host turns "Public room" off or the room closes. Ads carry the rules
  version; the board drops ads from newer apps and a host refuses guests on older ones.
- **Board interface** (`net/directory.ts → Directory`): `publish`, `withdraw`, `watch`. Everything the network delivers goes
  through `readAd`, which cleans names and drops anything odd.

## What is missing: a place to keep the ads

A phone cannot see other phones' rooms by itself; something has to hold the list. Until one is chosen the shipped app has
`directory = null`: the lobby shows no room list and no "public" switches, and rooms are joined by code or invite link.
In development a same-browser board stands in so the flow can be tried with two tabs.

| Option | Cost / account | Notes |
|---|---|---|
| A. A public pub/sub topic (for example ntfy.sh) | free, no account | Fastest. A third party sees every ad and the player's IP; anyone can post fake ads (the app filters malformed ones, not fake ones); no uptime promise. |
| B. A tiny X Sword service (Cloudflare Worker + KV or Durable Object) | free tier, a Cloudflare account that belongs to X Sword | Our own endpoint: we can rate-limit, hide abuse, add a report button, and later grow it into matchmaking and leaderboards (which `transport.ts` also expects). Needs Arda's account. |
| C. A hosted database with realtime rules (Firebase / Supabase) | free tier, an account | Similar to B with less code to write, more vendor lock-in. |

Recommendation: **B**, because it is also the start of the server the profile and online plans will need, and it keeps
the privacy policy simple (one data processor we control). Whatever is picked, only `directory.ts` changes. The privacy
policy in Settings → Legal documents already says that public rooms show the host's display name, color and room
settings to everyone; update it when the service is chosen (who runs it, how long ads live).

## Abuse to plan for

- Offensive display names in the list: add a report action and server-side name checks with option B.
- Fake or spam ads: rate limit per IP (B), or a signed ad per room.
- Griefing in public rooms: the host can remove a guest (`clearSeat`); add a block list later.
