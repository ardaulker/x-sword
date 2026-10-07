# Tactical Chess Arena — Developer handoff (for Claude Code)

> **Note (8 October 2026):** This handoff came with the first design and was written in Turkish; it was translated to
> English when the repository moved to English. The game is now called **X Sword**, "hit" became "take", the
> "Twin" in the lobby became an AI player, and the colors were settled later. Where this file and the root `CLAUDE.md`
> disagree, `CLAUDE.md` wins.

This folder makes everything on the design canvas codeable. Have Claude Code read this file first, then use the
`tokens/` and `reference/` folders.

- **Design canvas:** https://claude.ai/artifact/M3HUrLN5y4CpEwXtVrFQdn (private; it must be shared to be opened)
- **Interface language:** Turkish at the time of the design. All texts as in the `reference/*.dc.html` files.
- **Player names:** "Player 1 … Player 4" for now. When a nickname system arrives, this field holds the user's
  nickname. The viewer sees themselves as "You" in texts ("Your turn", "You" in the battle log).

---

## 0. Suggested first message to Claude Code

> Read `CLAUDE_CODE_HANDOFF.md` from start to finish. `tokens/tokens.css` and the `.dc.html` files in `reference/` are
> the source of the design (a reference, not a runnable app). First write the rules engine in section 9 as pure
> TypeScript with unit tests. Then build the components in section 3 and the screens in section 4. The mobile
> (390×844) and desktop (1440×900) layouts should use the same components. Summarize what you did at every step.

---

## 1. Folder contents

| Path | What |
|---|---|
| `CLAUDE_CODE_HANDOFF.md` | This document: structure, components, states, interaction, motion |
| `tokens/tokens.css` | Color, type, spacing, radius and motion tokens (CSS variables) |
| `tokens/tokens.json` | The same tokens as JSON (to generate Tailwind / theme files) |
| `reference/*.dc.html` | The source of every artboard on the canvas. Markup + style + logic live here. `GameScreen.dc.html` is the most important: board drawing, rules, the prototype state machine, mobile and desktop layout |
| `reference/DC_FORMAT.md` | How to read the `.dc.html` files |

## 2. Suggested technical structure (a suggestion, not a requirement)

- **A single web app**, mobile first and responsive. In the phone browser or as a PWA; in the browser on desktop.
- React + TypeScript + Vite. CSS variables for style (`tokens.css`) + CSS Modules or Tailwind (tokens from
  `tokens.json`).
- **The rules engine** (`/src/game/`) is independent of the interface: pure functions. The same code should run on a
  server.
- **Multiplayer:** server-authoritative room state + WebSocket. Supabase Realtime, PartyKit or your own Node server.
  The client sends only intents (`move {r,c}`); the server broadcasts the state. Bot moves are computed on the server and
  reach the client as an ordered event list; the client plays them one after another.
- **Layout breakpoints:**
  - width `< 900px`: mobile layout (portrait, single column). 390 design width; at 375 (iPhone SE) a compact header.
  - `900–1199px`: the mobile layout centered (at most 480px) + space on the sides.
  - `≥ 1200px`: the desktop 3-column layout (300 | board | 340), 24px outer margin. Designed at 1440×900; at 1280×720
    the board shrinks with the height (see 5.2).
- Safe areas: `env(safe-area-inset-top/bottom)`. The 47/34 px in the design are placeholders for these values.

## 3. Components

### 3.1 Piece (`Piece`)
Props: `kind: 'star' | 'red' | 'blue'`, `player?: 0..3`, `mode: 'straight'|'diagonal'`, `size: number`,
`state?: 'normal'|'ghost'|'dead'`, `halo?: 'turn'|'threat'|'ring'|'current'|'pinned'`, `targetColor?`,
`targetDir?: 0..7`, `orderPip?: number`, `threatBadge?: number`.

Geometry (box = the square cell, viewBox 0 0 100 100):
- **Outer shape** = a div: `left/top 17%`, `width/height 66%`, `border-radius 10%`.
  - Square (walks straight): `rotate(0)`. Diamond (walks diagonally): `rotate(45deg) scale(.95)`.
  - Star: shape by mode (STRAIGHT → square, DIAGONAL → diamond). The red bot is always a square, the steel bot always a
    diamond.
  - Transition: `transform 320ms cubic-bezier(.34,1.56,.64,1)`.
- **Player fill:** the player color + `box-shadow: 0 0 0 max(1.5px, 6% size) #FFF, 0 0 35% color/AA` (white ring +
  glow).
- **Bot fill:** `--bot-red` / `--bot-blue` + `inset 0 0 0 Xpx rgba(11,16,38,.30)`.
- **Inner mark** (SVG path, ink `#0B1026`):
  - Red bot `×`: `M33 33 L67 67 M67 33 L33 67`, stroke 10, round
  - Steel bot `+`: `M50 27 V73 M27 50 H73`, stroke 10, round
  - Emblems: P1 dot `M50 36 A14 14 0 1 1 49.99 36 Z` (filled) · P2 triangle `M50 33 L66 62 L34 62 Z` (filled + 3
    stroke) · P3 double bar `M33 42 H67 M33 58 H67` (stroke 9) · P4 ring `M50 37 A13 13 0 1 1 49.99 37 Z` (no fill,
    stroke 8)
- **Target marker** (bot → the star it chases): the angle snaps to 45° (8 directions). Tip R=64, base R=44, half width
  13; fill in the target player's color, ink edge 4. Code: `GameScreen.dc.html` → `notch()`. Can be turned off in the
  settings.
- **Halo:** `inset -6%`, a circle. Your turn: 2px solid player color · Threat: 2px dashed `--danger` · On the ring
  about to collapse: 2px dashed `--hazard` · Bot playing: 2px solid white · Selected/info: 2.5px white + 4px 20% white.
- **Turn badge** (only during the bot turn; the moving bot + the next 3): 15px (desktop 18), top left −5px, `--ice`
  background, Oxanium 700.
- **Threat badge** (on your own piece, on your turn): a 16px (desktop 20) red circle, top right, with a number.
- **Ghost** (preview): fill color/33, 2px dashed edge. Opacity .55 in the hover preview, .85 once selected.

### 3.2 Square (`Cell`)
- Octagon `clip-path`. The corner cut depends on the board size: **9×9 26% · 11×11 22% · 13×13 18%**.
- Two-tone checkerboard: `--square` / `--square-2`.
- States (stacked in order of priority):

| State | Background | Frame (SVG, inner 6 units) | Center mark |
|---|---|---|---|
| normal | checker tone | — | — |
| reachable, safe | player color 18% | player color, 7 | STRAIGHT: small square · DIAGONAL: small diamond |
| reachable, dangerous | `-45°` red stripe pattern | player color, 7 | same |
| can be hit | checker tone | player color, 7 | 4 crosshair lines `M50 2 V18 M50 82 V98 M2 50 H18 M82 50 H98`, white 8 |
| hover (desktop) | — | `--ice`, 9 | — |
| selected | — | white, 11 | — |
| ring about to collapse | `45°` thick orange stripes | — | — |
| collapsed | `#070B1E` | dashed `#2B3670` 4, `6 7` | — |

The pattern values are in `tokens.css` (`--pat-danger`, `--pat-hazard`).

### 3.3 Board (`Board`)
- Layers: grid (squares) → lines (trail, threat line) → effects → pieces → overlays (mode card, toast) →
  touch/click layer.
- **Pieces sit on their own layer and are placed with `transform: translate()`.** That way the slide animation comes
  for free. A dead piece stays in the DOM: `scale(.4)`, `opacity 0`, 180ms.
- **The frame texture follows the mode:** STRAIGHT a `0°/90°` grid, DIAGONAL a `45°/-45°` grid (`--tex-straight`,
  `--tex-diagonal`). In a ring-collapse round the frame edge is `--hazard`.
- **Cell size:**
  - Mobile: `floor((W − 12 − 2·6 − gap·(n−1)) / n)`; gap 3 on 9×9, 2 otherwise. At 390: 9×9 → 38, 11×11 → 29,
    13×13 → 26. At 375: 13×13 → 25.
  - Desktop: `min(72, floor((704 − 16 − gap·(n−1)) / n))`; gap 4 on 9×9, 3 otherwise. If the height is under 900, use
    `min(centerWidth, height − 48)` instead of 704.
- **Lines:**
  - trail: gradient, thickness `max(3, 16% cell)`, 70% opacity
  - threat: 2.5px dashed red `6/4`
  - from yourself to the selection: 2.5px dotted player color `3/4`

### 3.4 Mode indicator (`ModeIndicator`) — the most important information in the game
- STRAIGHT: `--ice` background, ink text, a square icon + `+`.
- DIAGONAL: night background, a 2px `--ice` inner edge, a `±45°` line pattern, a diamond + `×`.
- Mobile: under the header, 56px tall, label Oxanium 800 28px; on the right "NEXT ROUND ◇ DIAGONAL". On SE it merges
  with the header bar (44px).
- Desktop: a big card in the left column, label 48px, below it "ROUND n · NEXT …".
- The mode change card appears in the middle of the board (section 7).

### 3.5 Other components
- **Player strip (mobile) / player list (desktop):** a small piece with an emblem, the name, and below it "n hits",
  "Playing · 14 s", "Disconnected · 23 s" or "3rd · out". The edge of the player whose turn it is glows in their color,
  `0 0 0 3px color/33`. With 4 players the name is 11px.
- **Action panel** (bottom on mobile, top right on desktop). Variants:
  - `gen`: who, title, subtitle, timer, time bar, hint
  - `onz`: preview; the risk line, threat chips, Cancel / Confirm. If risky, Confirm is `--danger` and says
    "Risky · Confirm"
  - `threat`: the pieces that can hit you
  - `bot`: "Bots playing n/N", a segmented bar, Speed up
  - `spect`: spectator; Leave match / Keep watching
  - `win`: you won
- **Piece info card:** on mobile a card that opens from the bottom (long press). On desktop an inline card in the
  right column (hover; a click pins it). Content: name + turn, a 3×3 WALKS / HITS diagram, the target, a "Can hit you
  this round" warning.
- **Battle log:** on mobile a card that opens from the bottom (the sword icon in the header, with a count badge). On
  desktop always open in the right column. A line: [attacker] Name ⚔ [gray victim] struck-through name. Grouped by
  round headings, newest on top.
- **Toast:** ice background, ink text, a 36–40px pill. A hit ("Steel #12 was hit · +1"), time's up.
- **Banner:** in the middle of the board, "Player 3 is out · 3rd place", "Outer ring collapsed".
- **Connection banner:** orange edge, "Connection lost · Reconnecting… [Try again]". The board at 45% opacity and gray.

## 4. Screen → reference file map

**Mobile (390×844):**
- `Main` (main menu)
- `JoinRoom` (code)
- `Invite` (invite by link)
- `Lobby` (host)
- `LobbyGuest`
- `Tutorial` (an interactive 5-step tutorial)
- `Settings`
- `GameOver`
- `Prototype` (a playable round)
- `Game-01…17` (game states)
- `Board-09/11/13`
- `SE-13`, `SE-09-Preview` (375×667)

**Desktop (1440×900):**
- `DesktopMenu`
- `DesktopLobby`
- `DesktopPrototype` (playable, mouse + keyboard)
- `DesktopGameOver`
- `DesktopSettings`, `DesktopTutorial`: the mobile component in the middle as a 390×844 window; "Back" closes the
  window
- `Desktop-Game-*` (game states)

**Shared:** `DesignSystem` (token and component catalog), `Notes` (decisions, assumptions, open questions).

Every game state comes from a single component: `GameScreen.dc.html`. Its props are `scene`, `size`, `device`
(`390|se|desktop`) and `live` (prototype). `staticUi()` builds each state's scene, `panel()` the panel texts.

## 5. Layout measurements

### 5.1 Mobile game screen (390×844)
Top to bottom, 6px gaps:

| Section | Size |
|---|---|
| safe area | 47 |
| header | 44: menu · ROUND n + ring chip · log |
| mode indicator | 56 |
| player strip | 48 |
| board | flexible area, centered |
| action panel | natural height |
| bottom safe area | 34 |

- Important buttons are in the panel, in the thumb zone. Confirm is on the right and twice as wide.
- SE (375×667): header and mode on one line (48), strip 40, bottom safe area 6.

### 5.2 Desktop game screen (1440×900)
3 columns, outer margin 24, gaps 24:

- **Left (300px):**
  - logo
  - mode card
  - ring chip (44)
  - player list (60px rows)
  - a keyboard shortcuts card at the bottom
- **Center:** the board, centered. The toast and the connection banner sit above the board.
- **Right (340px):**
  - action panel
  - (if any) piece info card
  - battle log (fills the remaining height; overflow is clipped/scrolls)

## 6. Interaction

### 6.1 Mobile (touch)
- When your turn comes, the reachable squares light up by themselves. The timer runs down from 20 s (10/20/30 in the
  lobby).
- **Wide touch:** the touched point snaps to the nearest reachable square whose center is within **1.6 steps**. That
  way every target behaves as ≥ 44 pt even on a 26 pt square.
- Tap your own piece → who can hit you right now (threat lines + the `threat` panel). Tap again → closes.
- Tap a bot/star or long press it (450 ms) → info card.
- A two-step move: tap a square → preview (ghost + threat lines + risk panel) → **Confirm**. A second tap on the same
  square also confirms. Cancel closes the preview.
- Tapping the board during the bot turn, or "Speed up": the remaining bot moves are applied at once.
- Zoom (suggestion): on 13×13, 1.6× centered on the player's piece with two fingers / a double tap.

### 6.2 Desktop (mouse + keyboard)
- **Hover** (on your turn): the nearest reachable square (within 0.75 steps) is previewed with a ghost; threat lines
  are drawn, the panel hint shows the risk. This step locks nothing.
- **Click:** select (the preview locks, panel `onz`). **Click the same square again or Enter:** confirm.
- Mouse over a piece → info card in the right column. Click → pin, click empty space → close.
- **Keyboard** (when the board has focus; not a global listener, `onKeyDown` on the board component):

| Key | Action |
|---|---|
| `↑ ↓ ← →` / `W A S D` | pick a direction in a STRAIGHT round |
| `Q E Z C` / Numpad `7 9 1 3` | pick a direction in a DIAGONAL round |
| `Enter` | confirm |
| `Esc` | cancel / close the card |
| `Space` | speed up the bot turn |
| `Tab` | focus the board (visible focus ring: 2px `--ice`) |

- Cursor: `pointer` on a reachable square, `default` elsewhere.

## 7. Motion and vibration

| Moment | Duration | Curve | Note |
|---|---|---|---|
| Star slide | 220 ms | `cubic-bezier(.2,.8,.2,1)` | the trail fades in 300 ms |
| Bot slide | 130 ms | same | 60–110 ms between bots (`1200 / botCount`), the whole round ≤ 1.2 s |
| Square selection / ghost | 120 ms | ease-out | |
| Hit | 80 ms flash + 160 ms burst | ease-out | the board shakes 2px × 3 (120 ms) |
| Dying piece | 180 ms | ease-in | scale .4, opacity 0 |
| Mode change | 700 ms total | `cubic-bezier(.6,0,.2,1)` | a patterned band sweeps the board in 360 ms, the card flips in 280 ms, texture + ↔ × |
| Star shape change | 320 ms | `cubic-bezier(.34,1.56,.64,1)` | 45° turn, spring |
| Last 5 s | 1 s loop | ease-in-out | timer red, 1→1.08 pulse, panel edge red |
| Ring warning | 1.2 s loop | linear | the stripe flows outward |
| Ring collapse | ≤ 700 ms | ease-in | squares collapse in 220 ms with a 12 ms stagger |
| Panel / card | 240 open / 180 close | open `(.2,.8,.2,1)` · close ease-in | the background dims to 64% |

- The animation speed setting multiplies every duration: Slow ×1.45 · Normal ×1 · Fast ×0.65.
- `prefers-reduced-motion`: slides become a 120 ms fade, no shake.

**Vibration** (`navigator.vibrate`; iOS Safari doesn't support it, skip silently):

| Moment | Pattern |
|---|---|
| Selection | 10 ms |
| Confirm | 20 ms |
| Hit | `[30, 40, 20]` |
| You were hit / you're out | `[60, 50, 60]` |
| Last 5 s | 8 ms every second |
| Ring collapse | 60 ms |

No vibration on desktop; sound instead.

## 8. Accessibility
- Text contrasts are computed in `DesignSystem`. All are AA on #0B1026. `--text-3` only at 12px and up.
- Color-independent cues: shape (walking), sword (hitting), emblem (player), pattern (danger/ring).
- **Color-blind mode:** player palette `#56E0A6 #F5D43B #FF8A5C #8FB8FF`, emblem and sword strokes +2 thicker.
- All controls are real `<button>` / `<a>`. Icon buttons get an `aria-label`.
- `role="grid"` for the board + an `aria-label` on every cell. Example: "Row 6, column 5, reachable, 2 pieces can hit".
- Turn changes are announced with `aria-live="polite"`.
- Touch targets ≥ 44px.

## 9. Rules engine (don't change the game rules)

Reference implementation: `GameScreen.dc.html` → `wd()`, `hd()`, `moves()`, `hitters()`, `targetOf()`, `botMove()`.

- `ORTH = [[-1,0],[1,0],[0,-1],[0,1]]`, `DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]]`
- **Star:** walking = hitting = the mode directions (STRAIGHT → ORTH, DIAGONAL → DIAG).
- **Red bot:** walks ORTH, hits DIAG. **Steel bot:** walks DIAG, hits ORTH.
- One square. Walking only onto an empty square. Hitting = moving onto an occupied square; the target leaves the game.
  Anyone can hit anyone.
- Collapsed rings are invalid squares. `ring = min(r, c, n−1−r, n−1−c)`; invalid if `ring < collapsed`.
- **Round flow:**
  1. Players play in turn; the starting player changes every round.
  2. Bots play in `num` order; dead ones are skipped.
  3. Ring collapse (if any).
  4. The mode changes.
- **If time runs out:** the least risky move (risk = number of hitters); on a tie the one without a hit, then the one
  closest to the center.
- **Preview risk:** on the chosen square, the pieces still to play this round that can hit you.
- **Bot principle** (brief): chases the nearest star; with the check "will I be taken on the next move?" it doesn't go
  where it would be taken. Hard: sets up a hit for the next round. The bot in the prototype is a simple placeholder.
  The intelligence is solved in code.
- **Board / bot count / start:**
  - 2 stars: 9×9, ~14 bots
  - 3 stars: 11×11, ~21 bots
  - 4 stars: 13×13, ~28 bots
  - Starting points are in the `Lobby` logic (`starts`).
- **Ring schedule (assumption):** on 9×9 the first collapse is at the end of round 11, then every 4 rounds. The warning
  shows at the start of the collapse round.
- **Connection:** 30 s for a disconnected player. If it is their turn the game waits, then the Twin plays. If they come
  back they take their seat again.

## 10. Multiplayer flow
- No account. A nickname (≤ 12 characters) + color/emblem; stored on the device.
- **Room code:** 5 characters, A–Z and 0–9. Leaving out confusable characters (0/O, 1/I) is recommended.
- **Invite link:** `https://<domain>/o/K7Q2M`. WhatsApp sharing: `https://wa.me/?text=…`. On desktop the QR + copy
  link come first.
- **Lobby:** 4 seats. Empty seat: Invite / Add Twin / Close. Bot difficulty, move time, a board preview. Start only for
  the host; "I'm ready" for a guest.
- **Quick game:** one player + bots (and the Twin if wanted).

## 11. Open questions
In `reference/Notes.dc.html`. Summary:

- The bot count and ring interval will be tuned by testing.
- Is a left-hand mode needed?
- Share: a visual result card, or just a link?
- A sound character should be chosen.
- A game name should be chosen (ideas: Eight · Straight Diagonal · Star Square).
