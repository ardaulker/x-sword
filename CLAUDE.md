# X Sword

## Working with Arda
- **Everything in the repository is English:** file names, identifiers, comments, docs, this file, tests and their
  output, tool scripts, commit messages. Arda writes prompts in Turkish; that changes nothing about the files.
  Arda decided this on 8 October 2026 so that foreign developers can join later.
- **Chat replies to Arda are Turkish** and start with "kanka". Short sentences, one idea per sentence; draw a
  diagram when it helps. Don't ask long questions before working: pick a sensible default and say so in the reply.
- Player-facing text is authored in English (`tr('English text')`) and translated in `app/src/i18n/`. When Arda
  dictates Turkish wording for the UI, put it in the Turkish dictionary and write the English source yourself.
- After changing rules or bots: run the tests, update the rule texts (see the checklist below), commit and push. After
  the push, wait for the Actions run to finish, open the live page and check that the console is clean.
- The game ships in **Turkish first** (regional translations come later), so the Turkish terms in
  `app/src/i18n/tr.ts` must read well and feel native, not like translated English. When naming something, pick the
  Turkish name with care and keep the English source key a plain descriptive word.
- End every commit message with the `Co-Authored-By` line from the system reminder.
- X Sword shares no account, file or memory with any other project.
- macOS notes: `sed -i ''` needs the empty argument and BSD sed has no `\b` (use perl); quote globs
  (`--include='*.tsx'`) because zsh fails on unmatched ones. Use a Python script for multi-line edits.

## Layout
- `engine/rules.js` is the rules engine, `engine/bots.js` the bots. Neither touches the screen; the same code runs in
  the browser, in tests and, later, on an online server. Screen code reaches the rules only through engine functions.
- `engine/*.d.ts` are the engine's TypeScript types. Update them when anything the engine exports changes.
- `app/` is the game built from the design: React + TypeScript + Vite. The match flow lives in
  `app/src/game/controller.ts`; it asks the engine for every rule. Setup `npm --prefix app install`, dev server
  `npm --prefix app run dev` (5173), type check and build `npm --prefix app run build`.
- Multiplayer (`app/src/net/`): the phone that creates the room runs the match (authority); guests only send their own
  moves. Everyone calls `createGame` with the same seed and then plays the host's broadcast moves in order; because the
  engine is seeded, the boards stay identical. The connection is PeerJS phone to phone today (no server, no account).
  Only `transport.ts` knows the connection, so moving to an X Sword server later changes only that file. Arda said on
  6 October 2026: "serverless for now, maybe a product later".
- `arena/` is a test bench for the engine (https://ardaulker.github.io/x-sword/arena/). The root `index.html` only
  redirects to `/play/`. The first demo was retired on 8 October 2026 (Arda: "that version is finished"): it
  lives in `archive/first-demo/` with its old tests, is not published (the workflow skips `archive/`) and nothing uses it.
- Tests: `node tests/engine.test.mjs` (rules + bot strength). Run it before and after touching rules or bots.
- **Rules version** (9 October 2026): `RULES_VERSION` in `engine/rules.js` (now 2). `createGame({ rules })` plays a match by an older
  version; saves, replay links and multiplayer rooms record it (`opts.rules`, `MatchStart.rules`, `hello.rules`). A save or
  replay without it is version 1 (`legacyOpts`); one from a newer app is ignored. **Raise the version whenever a change
  would make an old move list play out differently** and gate the new behavior with `state.rules >= N` (version 2 =
  Armor for two takes in one Double move). A host refuses a guest on older rules; a guest refuses a room on newer rules.
- **Desync check**: the host sends `stateHash(state)` with every move; a guest whose hash differs sends `resync` and the host
  replies with `sync` (the whole move list; at most 3 times, then the guest leaves). The hash leaves out the seed and seat
  kinds on purpose (see the comment in `stateHash`).
- Publishing: a push to `main` runs `.github/workflows/pages.yml`, which runs the engine tests, builds `app/` and
  publishes the site to GitHub Pages. Only the root pages `index.html`, `arena/` and `engine/` go out as they are (not `design/`, `docs/`, `tools/`); the game is
  served at https://ardaulker.github.io/x-sword/play/ and https://ardaulker.github.io/x-sword/ redirects there. The old address `/oyun/` (before the English rename) redirects
  to `/play/` and keeps the `#/` route.
- Translation (`app/src/i18n/`): in `tr('English sentence', {variable})` the key is the English text itself, so English
  needs no dictionary. `tr de fr es it pt` dictionaries translate it; a missing entry falls back to English. Plural:
  `{n:one|many}`; bold: `rich('**bold** text')`. The language is chosen in Settings and stored under `xsword-lang`.
  When you add text, add it to all six dictionaries; `app/check-i18n.mjs` (part of `npm run build`) catches missing
  or mismatched entries. The first argument of `tr()` must be a plain quoted string (the extractor only sees those).
  The engine's `log` texts are English and never shown in the game.
- Old saves and links: identifiers were Turkish until 8 October 2026 (levels `kolay`/`zor`, modes `DUZ`/`CAPRAZ`,
  speeds `yavas`/`hizli`, theme ids, routes like `#/oyun`, `#/katil/CODE`, `#/izle/CODE`, puzzle map letters `K`/`C`).
  `app/src/game/legacy.ts`, the route table in `App.tsx`, `createPuzzle` and the arena map them on load. Keep that
  layer until old saves no longer matter.
- Design source: `design/`. Read `design/CLAUDE_CODE_HANDOFF.md` first, then `design/tokens/tokens.css` and
  `design/reference/*.dc.html` (references to read, not a running app; how to read them is in
  `design/reference/DC_FORMAT.md`).
- Decisions made after the first design brief override the design:
  - The game is called **X Sword**.
  - Pieces are **taken** ("take / took"), never hit, eaten or killed. Examples: "You took #5!", "#3 took you!".
  - Turkish glossary (Arda chose these on 8 October 2026; the game ships in Turkish first): the one who takes **alır**
    ("5 numarayı aldın!", "düz alır", "Alma sayısı"). The one taken is never "alındı" or "seni aldı"; Arda dislikes
    both. Use "Elendin" / "elendi" and "3 numara tarafından elendin!". Threats are "seni tehdit ediyor" or "bir taşın
    menzilindesin", an attacking piece "saldırır". Never vurmak, yemek, öldürmek. Arda tried "elemek" as the main verb and
    dropped it (it lost the sword feel). The Switcheroo bonus = **Yer Çalma**. The sword (kılıç) is the mark that shows
    the taking direction. "Almak" is also used for receiving things (bonus alır) and "Geri al" (undo).
  - The design's "Twin" in an empty seat is now an **AI player**, called "Player N" like a human. "Twin" belongs only to
    the mirror in single-player mode.
  - The top bar has a **match clock**: it counts from 00:00 when the match starts and stops at the end; the end screen
    shows the match time.
- Colors follow the design (Arda chose this on 6 October 2026): reachable squares in the player's **own color**, a
  reachable but dangerous square with red stripes, red (`--danger`) only for danger and threats, orange (`--hazard`)
  only for the ring about to collapse.
- When rules or bot intelligence change, update the rule texts in the same change: the in-game "How to play" screen
  (`app/src/screens/RulesScreen.tsx`), the arena's Rules window (`arena/index.html`) and the game section of
  `docs/design-prompt.md`. The player guide changes together with the code.

## Game rules (current summary; details in `RulesScreen.tsx`)
- Board 9/11/13/15 squares (at least the default for the player count: `BOARD_SIZES`, `defaultNeutrals`). The mode
  flips every round, STRAIGHT ↔ DIAGONAL. A star moves and takes straight or diagonally by the mode. Red bots walk
  straight and take diagonally; blue bots walk diagonally and take straight. Everyone moves one square. Red and blue
  bots are equal in number and balanced around the stars (`balancedKinds`).
- The move order is shuffled once (`matchOrder`) and stays the same all match. **A piece's number is reassigned every
  round among the survivors** (`roundOrder` also updates a bot's `label`; `app/src/game/order.ts → orderNo`). If a
  piece is taken mid-round, numbers don't change that round. The turn queue shows future rounds with that round's new
  numbers.
- A move: tap a square, preview, confirm. 20 seconds per move; when time runs out a safe move is played.
- Every 6 rounds (6, 12, 18 …) the outermost ring collapses; a thin orange edge warns one round before and stripes mark
  the collapse round. Tension music plays.
- Points: star / Twin / red-blue (`POINTS`), `SURVIVOR_BONUS` for the last star standing. Ranking: score, takes,
  survival. The winner is decided when the rival stars are gone; in a local 2–4 player match the game asks
  "Continue / End" (`keepGoing`, off online).
- Single player: the **Twin** is the player's mirror. It moves right after the player in the same direction: walks if
  the square is empty, takes the piece there if occupied, stays put if blocked. So it can never take the player. You
  win when every bot is gone (no need to take the Twin). A take by the Twin gives double points and a Switcheroo bonus.
  Arda chose this on 6 October 2026. In the first demo file the Twin was different: a hunter that chose its own
  moves under the player's rules.
- Bonuses: everyone starts with one double step. 20 points double step, 40 double move, 60 one of the two at random,
  50 Switcheroo (swap places with any piece on the board; Turkish name "Yer Çalma"). Surviving the first shrink gives armor (one extra life); so does taking two pieces with the two moves of one Double move (`state.extra.takes`, once per sequence). The
  second a double move. AI players use bonuses too (`bonusMoves`, `BONUS_COST`).
- Difficulty: Easy (you move first), Normal (random place), Hard (random place, bot target triangles hidden). AI rivals
  (`Setup.aiLevel`) and arena bots (`Setup.level`) are set separately. A Normal rival picks the second best move 30%
  of the time (`SLIP`); Hard never slips and hunts the rival star (`HUNT_PULL`).
- Options (off by default): personalities (hunter / careful / opportunist), obstacle squares (can't be entered or
  jumped with a double step), teams (2 vs 2, 4 players only); engine: `state.blocked`, `state.teams`, `friendly()`,
  `isWinner()`. Also: puzzles (bots don't walk), a daily challenge, statistics, replay links, a multiplayer lobby
  (board + bot count + options).
- Pause: the menu button pauses a local match (`GameController.pause/unpause`; timers fall into `deferred`). Going back
  to the main menu doesn't delete the match; it is `park`ed and the main menu shows "Continue". The unfinished match is
  saved under `xsword-save` (options + move list, `game/record.ts`) and resumes when the app reopens. Starting a
  multiplayer match deletes the save. Pause menu: Continue, Restart, New game, Settings (in a match only sound,
  vibration and language), Main menu.

## Measurements (printed by `tests/engine.test.mjs`)
- Careful player: wins 92–96% against an Easy rival, ~35–37% against Normal, ~14–15% against Hard. Hard beats Normal
  about 2:1 (149–51 and 134–66 in two runs).
- Personality wins (90 matches, 4 Hard): hunter 42, careful 32, opportunist 16.
- Team balance (100 matches, 4 AI): Normal A47/B53, Hard A42/B58; within noise, left alone. If "B always wins" comes up,
  check with 300 matches.
- Red/blue difference around stars: average 0.53.

## Decisions and reasons (in order)
- Name X Sword; "take", never "hit" or "eat".
- The old "green = your path, orange = bot path" color rule is gone; colors follow the design (see above).
- In single player you don't need to take the Twin; you win when the bots are gone. Bonuses are earned by conditions
  (points, surviving shrinks), never handed out at random.
- 7 languages (English source + Turkish, German, French, Spanish, Italian, Portuguese), a flag picker in Settings.
- 7 suggestions were built: daily challenge, tip card, bonus balance + AI bonuses, share card, 15 s for a dropped
  guest, wide layout, sound settings. Arda declined one of them (the 3rd).
- Hard AI first played even with Normal (99–101); adding slips to Normal and hunting to Hard separated them.
- The first 11 puzzles were random 9×9 positions; Arda found them "thin and illogical" (7 October 2026) because the bots
  ran away unpredictably. They were replaced by hand-drawn maps where bots don't walk and only take what steps into
  reach (`bots.js → chooseMove`, `state.puzzle`).
- Slogan: "Direction changes hands every round." (Arda picked option 1). The color-blind mode is called "Color assist"
  (kinder wording).
- Pause survives going back to the main menu and reopening the app.
- Arda didn't like the stone/brick obstacle pattern (8 October 2026); the striped pattern stayed, with higher contrast.
- The demo switch that unlocked every reward was removed (8 October 2026); locked styles show a preview card instead.
  Arda plans to sell rewards later.
- Discussed but not done: the TestFlight / Capacitor path (memory note), themes beyond the five board themes.

## When rules change (checklist)
1. `engine/rules.js` / `bots.js` + the `engine/rules.d.ts` types. If old move lists would now play out differently,
   raise `RULES_VERSION` and gate the change with `state.rules` (see "Rules version" above).
2. `node tests/engine.test.mjs`; add a test when needed.
3. `app/src/screens/RulesScreen.tsx`, the Rules window in `arena/index.html`, the game section of
   `docs/design-prompt.md`, this file.
4. New text goes through `tr()` in English and into **all six dictionaries** (`app/src/i18n/{tr,de,fr,es,it,pt}.ts`),
   edited by hand. The key is the English sentence; if you change a key, change it in all six files.
5. `npm --prefix app run build` (tsc + vite + `check-css.mjs` + `check-i18n.mjs`).
6. Commit, push, Actions and the live console.

## Code map (quick)
- Engine: `engine/rules.js` (`createGame`, `play`, `roundOrder`, `matchOrder`, `createPuzzle`, `isWinner`, `friendly`,
  `ranking`, `attackersOf`), `engine/bots.js` (`chooseMove`, `SLIP`, `HUNT_*`, personality weights). Seeded
  (`mulberry32`); a replay is options + seed + move list.
- App: `app/src/App.tsx` (hash routes `#/ #/play #/rules #/settings #/multiplayer #/room #/match #/join/CODE #/stats
  #/puzzles #/replay/CODE #/profile`, plus the legacy Turkish paths), `game/controller.ts` (match flow, pause / park /
  save / restart / replay / undo), `game/{settings,order,names,record,stats,daily,share,coach,haptics,threats,puzzles,
  puzzleText,themes,profile,progress,platform,legacy}.ts`, `components/{Board,Sheets,InfoChip,PlayerStrip,ActionPanel,
  TurnQueue,Header,Flag,SkinFx,PieceGlyph}.tsx`, `screens/*`, `net/{room,protocol,transport}.ts`, `i18n/`.
- Tools: `tools/puzzle-maps.mjs` (hand-drawn maps) → `node tools/make-puzzles.mjs [id]` → `app/src/game/puzzles.ts` +
  `tools/puzzles-out.mjs`.
- Docs: `docs/design-prompt.md` (the design brief), `docs/profile-infrastructure.md` (profiles, platform accounts).

## Watch out
- The first argument of `tr()` must be a plain quoted string. Engine `log` texts are not translated, but a bot's name
  (`label`) appears in game text.
- Test setups (like `position()`) recompute bot `label`s when they call `roundOrder`; don't assume fixed numbers in a
  test, use `pieceById(...).label`.
- `app/src/game/names.ts` keeps Turkish grammar data (accusative suffixes) because Turkish needs it; that is language
  data, not prose.

## Puzzle maps
- Rules: take every bot in at most par+1 moves; solving in par gives 3 stars, par+1 gives 2. Bots don't walk; they take
  a star that steps into their reach. The mode flips every round. No timer, no tip card, no target triangle.
- Map language: `.` floor, `#` obstacle, `-` off the map (the board need not be square; the engine pads the short side
  with void, `state.holes`), `S` you, `R` red bot, `B` blue bot.
- Flow: draw the map in `tools/puzzle-maps.mjs` (title, hint, mode, bot count, target par, bonuses, `needBonus`,
  `botCols`, `near`, `trap`, `shrink`, `tutorial`, `fixed`), then `node tools/make-puzzles.mjs <id>` places the pieces
  and verifies with the solver (exact par, at most 2 right first moves, the player takes every bot, with `needBonus`
  not solvable without the bonus; ids above 110 require the exact par). Regenerate one map at a time: a full run
  shifts the random sequence. Add the title and hint to `app/src/game/puzzleText.ts` and to the six dictionaries.
  Puzzle ids start at 101 (so old star records don't mix); the screen shows a running number. Tutorials are 201–203.
- Design lessons: a row of obstacles on odd-odd squares boxes a piece in on all four sides in a diagonal round; avoid
  it. A Switcheroo swaps you with a bot and sends the bot to your old square, so a "separate islands" puzzle can't be
  solved. Far-away bots can't be solved in 5–6 moves; use `near`.
- **Don't repeat the ideas and shapes below when adding puzzles.** Unused ideas so far: a puzzle with the Twin, a bot that
  walks.

### 201 · Take straight — STRAIGHT, par 1, bonus - — idea: tutorial: take straight
```
.....
..R..
..S..
.....
```
### 202 · The mode changes — STRAIGHT, par 2, bonus - — idea: tutorial: the mode flips
```
.B...
.....
..S..
.....
.....
```
### 203 · Danger — STRAIGHT, par 2, bonus - — idea: tutorial: greedy-take trap (taking blue puts you on red's diagonal; take red first, then blue diagonally)
```
.....
.SB..
.R...
.....
.....
```
### 101 · Corridor — STRAIGHT, par 3, bonus - — idea: teaches the mode flip (straight/diagonal)
```
#.....#
.......
.RB....
.......
#..S..#
```
### 102 · Cross — DIAGONAL, par 4, bonus - — idea: narrow arms, order of takes
```
--...--
--...--
.......
.......
....BR.
--...--
--.S.--
```
### 103 · Ring — STRAIGHT, par 5, bonus - — idea: ring with an empty middle; going around the edge
```
-.BR..-
.......
.B---..
..---..
S.---..
.......
-.....-
```
### 104 · Pillars — DIAGONAL, par 5, bonus - — idea: single pillars; behind an obstacle
```
.......
.#...#.
...#B..
.......
.#RB.#.
...#.S.
.......
```
### 105 · Staircase — STRAIGHT, par 5, bonus - — idea: diagonal strip; the path narrows in straight rounds
```
...-----
R.B.----
-...B---
--....--
---..S.-
----....
-----...
```
### 106 · Double step — STRAIGHT, par 3, bonus step:1 — idea: double step required
```
....---
...S---
..#..R.
..#R...
.......
```
### 107 · Switcheroo — DIAGONAL, par 4, bonus swap:1 — idea: Switcheroo required (to change direction / square color)
```
.........
..RR.....
---...---
---.S.---
---...---
---...---
```
### 108 · Diamond — DIAGONAL, par 4, bonus double:1 — idea: double move required
```
---.---
--...--
-...B.-
....RB.
-.S...-
--...--
---.---
```
### 109 · Fortress — STRAIGHT, par 6, bonus - — idea: castle walls with gates
```
.........
.###.###.
.#.....#.
.#.....#.
S...B....
.#..R..#.
.#.B...#.
.###.###.
.........
```
### 110 · Maze — DIAGONAL, par 6, bonus step:1 — idea: maze + double step, 3 bots
```
-...#...-
.#.....#.
...##....
.#.....#S
....#R...
.#..B..#.
....##...
.#R....#.
-...#...-
```
### 111 · L — STRAIGHT, par 6, bonus - — idea: L shape, 4 bots, greedy-take trap
```
....-----
....-----
.R..-----
B...B....
..S.R....
```
### 112 · U — DIAGONAL, par 6, bonus - — idea: U shape, 4 bots, which arm to start with
```
...---...
RR.---...
...---...
B..S.....
.R.......
```
### 113 · Armor — STRAIGHT, par 4, bonus armor:1 — idea: armor required: step into danger on purpose
```
.......
R#..S#.
..R....
..R....
.......
.#...#.
.......
```
### 114 · Pair — DIAGONAL, par 5, bonus step:1,swap:1 — idea: two bonuses together (double step + Switcheroo)
```
...R....
.##R.##.
........
.....S..
.##..##.
...R....
```
### 115 · Collapse — STRAIGHT, par 5, bonus -, shrink 2/2 — idea: collapse inside a puzzle: the outer ring falls at the end of round 2 (shrink)
```
.......
.......
...R...
.......
...B...
.B.....
...S...
```
### 116 · Butterfly — DIAGONAL, par 4, bonus swap:1 — idea: symmetric butterfly map + Switcheroo required
```
..-----..
...---...
....-....
......RR.
....-...B
...---...
..-----.S
```
### 117 · Courtyard — STRAIGHT, par 6, bonus - — idea: courtyard closed in the middle, going around the wall
```
.........
.........
..##.##..
..#...#..
.........
..#...#..
..##.##.S
......B..
......R.B
```
### 118 · Zigzag — STRAIGHT, par 6, bonus - — idea: diagonal wall: no crossing in straight rounds
```
#.......
.#......
..#.....
...#....
....#...
..B..#..
....B.#.
.S.B...#
```
### 119 · Hourglass — DIAGONAL, par 5, bonus double:1 — idea: hourglass, one-square waist + double move required
```
.......
-..B.B-
--..B--
---R---
--...--
-.S...-
.......
```
### 120 · Finale — STRAIGHT, par 6, bonus step:1,double:1 — idea: finale: 4 bots, double step + double move
```
...#...
.#...#.
..B#...
#B....#
...#.B.
.#S.R#.
...#...
```
### 121 · Two for one — STRAIGHT, par 4, bonus double:1 — idea: a Double move that takes two bots earns Armor (and 20 points bring a Double step)
```
.......
.......
..#.#..
.......
..#.#B.
..R.R..
......S
```
### 122 · Crowd — STRAIGHT, par 6, bonus - — idea: five bots packed close; every take changes who can reach you
```
..B....
S.R....
.......
BR.....
..B....
.......
.......
```
### 123 · Toolbox — DIAGONAL, par 4, bonus step:1, double:1, swap:1 — idea: three bonuses at once (Double step, Double move, Switcheroo)
```
........
.#....#.
........
........
..B.B...
..R.....
S#....#.
........
```
### 124 · Falling walls — STRAIGHT, par 5, bonus -, shrink 2/3 — idea: obstacles inside + a collapsing ring (shrink at the end of round 2)
```
.........
.........
..##.##..
.........
.B..#....
.........
.B##.##..
...B.....
.S.......
```
### 125 · Two rings — DIAGONAL, par 6, bonus -, shrink 2/2 — idea: two shrinks (end of rounds 2 and 4)
```
.........
.........
.........
....R....
....B....
......S..
..B......
.........
.........
```

## UI notes (UI/UX pass, 7–8 October 2026)
- **Main menu order** (Arda, 9 October 2026): Tutorial / Continue when they apply, then **New game** (opens the setup sheet), **Quick
  match** (starts at once with the last New game setup, `App.tsx → lastSetup`; a puzzle or daily start does not change it and the
  button shows it as "Last setup: Solo · Normal · 9×9"), Daily challenge + Puzzles side by side, a wide Multiplayer button, and
  Statistics + Settings at the bottom. "How to play" lives in Settings.
- **Setup sheet** (`Sheets.tsx → SetupSheet`): the X closes it; the bottom row is "Customize character" (opens the piece-effect
  picker, `components/SkinPicker.tsx`, shared with Settings) + Start. "Obstacle squares" and "Bot characters" (the AI rival
  personalities) are two tiles side by side. Rival intelligence is always shown but disabled in solo, so the sheet keeps its
  height when the player count changes; `.sheet-tall` lets it fill 94% so Start stays in view up to 3 players (4 adds the Teams row).
- **Match start** (9 October 2026): every new match except puzzles starts with the sword drawn from its scabbard (`playUnsheath`),
  then a 3 · 2 · 1 countdown over the board (`View.countdown`, `GameController.launch`, `.countdown` in `GameScreen.css`) and
  only then the first mode card. A guest who rejoins a running match skips it.
- **Bell** (multiplayer): while another human is on the move, a bell button sits in the panel (`ActionPanel.tsx → BellButton`,
  `GameController.canNudge / nudge / ring`). The message is `nudge` (guest → host: target seat; host → guest: sender seat); the
  host checks that it really is that seat's move and allows one bell per 6 s per sender; the receiver hears a bell
  (`playBell`), feels a strong buzz and sees "{name} is waiting for you!".
- **Public lobby** (9 October 2026): `screens/Lobby.tsx → MultiplayerEntry` lists open rooms and offers Create room with a "Show in
  the public lobby" switch; `net/directory.ts` is the room board (`Directory`). The shipped app has no internet-wide board yet
  (`directory` is null, so no list and no public switches); development uses a same-browser board for two-tab tests. Choosing the
  service is Arda's decision, see `docs/public-lobby.md`.
- **Error screen**: `components/ErrorBoundary.tsx` wraps the app; on a render error it offers "Reload" and "Reload without the
  saved match" (clears `xsword-save`), so a broken save cannot crash the app on every start.
- The top bar shows "ROUND n" translated; the menu and battle-log buttons have small captions (hidden on short
  screens). The mode box subtitle shows only in the first two matches (`ctl.autoMap`) and in puzzles; otherwise the box
  is 44 px.
- Bonus buttons use short names: Armor, Step ×2, Move ×2, Switcheroo (`shortBonus`). The ring chip says "Shrink: n rounds".
- The danger map doesn't tint squares; it puts a faint red dot in the middle.
- In single player the preview shows where the Twin will go as a faint Twin piece (`Board.tsx → twinGhost`, which copies
  the state and plays the move).
- While others move, the panel says "Your turn in N moves" (`ActionPanel.tsx → untilMe`). The last 6 movers of the
  round leave a faint dashed line from where they came (`View.lastMoves`). Your own piece always has a soft pulsing halo
  (`halo-me`).
- Your own takes get a bigger burst, a bigger score and a 750 ms pause.
- **Undo** (`GameController.undo`): only on Easy (3 per match) and in puzzles (unlimited); not in the daily or
  multiplayer. It rebuilds the match from the recorded moves at the start of your previous turn (`undoPoints`).
  Settings has "Play without preview" (`settings.quick`) and "Play bots fast" (`settings.fastBots`), both off by
  default.
- **Tutorial**: three mini puzzles (201 Take straight, 202 The mode changes, 203 Danger), all `fixed` (hand-placed; the
  generator only verifies). 203 is a greedy-take trap: taking blue puts you on red's diagonal; take red first, then blue
  diagonally. A puzzle's own hint is shown before the threat warning. New players (fewer than 3 matches, tutorial not
  done) see a green "Tutorial · 1 minute" button on the main menu.
- **Board themes** (`game/themes.ts`): Night (open), Emerald (6 puzzle stars), Ember (5 wins), Ice (3 dailies), Violet
  (25 matches). Only square, void and frame colors change (`--square`, `--square-2`, `--void`, `--board-frame`);
  player, danger and ring colors stay. Chosen in Settings; the result card announces new unlocks (`freshRewards`).
- **Piece effects** (`components/SkinFx.tsx`, CSS at the end of `Board.css`): an animated decoration on your star only.
  Flame (12 puzzle stars), Lightning (10 wins), Crystal (7 dailies), Gold (36 puzzle stars). Chosen in Settings
  (`settings.skin`; the active one is `activeSkin`). Unlock rules live in `game/themes.ts` (`SKINS`, `THEMES`, shared
  `Need`). Tapping a locked style opens a big animated preview card (`SettingsScreen.tsx → PeekCard`) with how to
  unlock it and the progress. If rewards are sold later, add a "purchased" source next to `need` and make `isUnlocked`
  check both; payment and accounts are Arda's clicks.
- **Result rewards**: a won match shows a gold star, the daily a lightning star; a 3-star puzzle a flame star
  ("Flawless!"), 2 stars a crystal star ("Well done!"); earned stars pop in one by one.
- **Daily streak** (`daily.ts → dailyStreak`): played days in `xsword-daily-days`; the main menu shows "N day streak".
- **"Why I lost"**: after a loss the card says "#9 took you (straight) · round 3" or "You were caught in the ring";
  `TakeEvent.at` lets "Watch the last moves" open the replay near that moment (`#/replay/CODE~N`).
- **Zoom**: on 13×13 and up a zoom button sits at the top right; squares become at least 34 px, the board scrolls and
  centers on your piece (`board-scroll`).
- **Phone turned sideways** (`GameScreen.tsx → landscape`: height under 520 and width over 1.2× height): the board at
  full height on the left, the bars and panel in a right column (`land-side`). Portrait tablets get a 680 px column.
- **Arena growth**: after a ring collapses and its fall animation ends (`GameScreen.tsx → shown`, ~0.95 s) the board
  draws only the remaining area (`Board` → `offset`) and the squares grow: at most 1.7× the base and 64 px (a bigger
  base stays). The transition is a smooth FLIP (800 ms). Each collapsed ring stays as a trace line outside the frame
  (`.ring-trace`, `RING_W`, `RING_COLORS`: newest innermost in bright orange, older ones fade outward) with a slow,
  low-amplitude ember glow. The replay screen keeps the old layout (offset 0).
- The rules screen's "Pieces" and "Taking" examples are animated (`Mini` → `hop`, `prey`).
- Haptic patterns in `BUZZ` have distinct rhythms (take, star take, being taken, shrink, armor, bonus, win / loss).
- **Puzzle navigation**: during a puzzle the panel has "Undo · Previous · Next"; the result card has "Previous" and
  "Next" (allowed without solving; "Next" is highlighted after a win). The order is the `PUZZLES` array (tutorials
  first).
- **Bonus visibility** (9 October 2026; a friend who tried the game never noticed the bonuses): on your turn the panel
  always shows the bonus bar (`ActionPanel.tsx → BonusBar`: icon + name buttons, a pulsing ring on usable ones, a
  dashed look on ones you don't hold; tapping one you don't hold opens the guide) with a header "Next: Double move at
  40 pts" and an info button. The **bonus guide** (`Sheets.tsx → BonusSheet`, `Sheet` type `bonus`,
  `GameController.openBonusGuide`; the local clock stops while it is open) lists what each bonus does and shows two
  tracks: points (Start, 20, 40, 50, 60) and surviving shrinks (round 6 Armor, round 12 Double move), with a marker for
  your score or round.
- **Double move counter**: the engine sets `state.extra = { id, n }` while a star plays the extra moves of a Double move
  (cleared when the turn passes). The panel shows a strip (`BonusStrip`) with the bonus, what to do and a "Move 1/2 ·
  2/2" counter; previews say "Move 1/2 · Double move". The strip takes the place of the hint and the bonus header so the
  panel keeps its height (the board reserves `PANEL_ROOM`; keep the normal panel at or below it).
- **Sword stroke on every take** (`View.slashes`, `Board.tsx`, `.board-slash` in `Board.css`): a blade and a crescent
  cut across the taken square along the attack direction; bigger for your own takes. The being-taken toast says
  "{name} swung their sword. You are out!" and the "why I lost" line says "Struck down by {name} (…) · round n"; the
  rules' Taking card explains the sword mark (+ straight, × diagonal).
- **Sounds** (`game/haptics.ts`, all synthesized): every take plays a sword stroke (`playSlash`: a noise whoosh that
  sweeps up plus a short metallic ring; `slashBig` for your own takes), and each bonus has its own sound when used
  (`useStep` a dash, `useDouble` a quick double tap, `useSwap` a crossing swap). The slash animation lasts 360 ms
  (560 ms for yours) and scales with the animation speed setting.
- **Multiplayer lobby options**: the host can turn on personalities, obstacles and (with 4 filled seats) teams
  (`RoomView.opts`, `MatchStart.personas/obstacles/teams`).
- **Logo**: the middle X turns right into a plus and back left into an x, once a second in a 2 s loop (`.logo-x`,
  `MainMenu.css`).

## Profiles (8 October 2026)
- Arda left the profile system entirely to Claude ("I know nothing about this"). Decision: identity comes from **Game
  Center** on iPhone and **Google Play Games** on Android; progress lives in the platform's cloud save; no X Sword
  server (consistent with the serverless decision). Details and roadmap: `docs/profile-infrastructure.md`.
- The web side is ready: `game/profile.ts` (name, color, id, `provider`), `game/progress.ts` (progress snapshot +
  `mergeProgress` + the `XS1.` backup code), `game/platform.ts` (the contract of the native `XSwordGames` plugin; a
  no-op on the web; `bootPlatform` at startup, `syncCloud` at the end of a match), `screens/ProfileScreen.tsx`
  (`#/profile`, the badge at the top right of the main menu).
- Seat names: `names.ts → setSeatNames` (filled in the controller's `reset`). Human seats with a profile name use it;
  AI seats are "Player N". The Turkish accusative suffix follows vowel harmony (`accusative`: Ada'yı, Mert'i,
  Kılıç 482'yi).
- Multiplayer: `profile` in the `hello` message (name + color, cleaned by `readPublic`), `LobbySeat.name/color`,
  `MatchStart.names`. Only the name and color reach opponents.
- Next steps: the Capacitor shell + the `XSwordGames` plugin (Claude); Apple Developer / App Store Connect / Game Center
  / Google Play Console / Play Games Services / privacy policy (Arda's clicks).
