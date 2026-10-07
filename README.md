# X Sword

A turn-based arena game on an octagon-square board. Every round the direction flips: STRAIGHT, then DIAGONAL.
You take pieces like in chess and try to outscore everyone while the arena shrinks.

The first version was made by Arda's cousin; the repo's first commit is that version. Arda develops the game now.

## Play

- **Game:** https://ardaulker.github.io/x-sword/play/ — the `app/` folder (React + TypeScript + Vite), built on the
  rules engine in `engine/`. Single player (you + your mirror Twin + arena bots), 2–4 stars against AI,
  multiplayer over phone-to-phone connections (PeerJS), puzzles, a tutorial and a daily challenge.
  The old address `/oyun/` and the root address redirect here.
- **Arena (engine test bench):** https://ardaulker.github.io/x-sword/arena/
- **The cousin's first demo:** https://ardaulker.github.io/x-sword/demo/ (`demo/index.html`, open it in a browser; no setup).

https://ardaulker.github.io/x-sword/ opens the game.

Every push to `main` runs the engine tests, builds the game and publishes the whole site to GitHub Pages
(`.github/workflows/pages.yml`).

## Develop

```
npm --prefix app install
npm --prefix app run dev     # http://localhost:5173
npm --prefix app run build   # type check + app/dist + CSS and translation checks
```

Multiplayer: main menu → "Multiplayer" → "Create room". Share the 5-character code or the invite link; friends join
with the code, tap "Ready" and the host starts. The host's phone runs the match; if a guest leaves, an AI takes over.

## Tests

```
node tests/engine.test.mjs  # rules engine: rules, bots never taking needless risks, bot strength
node tests/tests.js         # the cousin's demo: 2,000 random + 2,000 careful games in a fake DOM
node tests/tests2.js        # the cousin's demo: colored paths, skipping dead bots, log texts
```

## Rules in short

- Each round the mode flips between STRAIGHT and DIAGONAL. Stars move and take in that direction.
- Red bots walk straight and take diagonally. Blue bots walk diagonally and take straight.
- In single player the Twin is your mirror: it moves right after you, in your direction. You win when every bot is gone.
- The move order is shuffled once per match; a piece's number is its place among the survivors this round.
- Anyone can take anyone. Points: player 50, Twin 30, bot 10; the last star standing gets +30. The score decides the winner.
- Every 6 rounds the outer ring collapses.

The full rules are in the game ("How to play") and in `CLAUDE.md`. Player-facing text is written in English and
translated into Turkish, German, French, Spanish, Italian and Portuguese (`app/src/i18n/`).
