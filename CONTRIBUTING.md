# Contributing to X Sword

Thanks for helping. Short version: keep the rules engine pure, keep everything in the repository in English, run the
tests before you push.

## Setup

```
npm --prefix app install
npm --prefix app run dev        # the game at http://localhost:5173
npm --prefix app run build      # type check + build + CSS and translation checks
node tests/engine.test.mjs      # rules engine and bot tests
```

## Ground rules

- **Language:** file names, identifiers, comments, docs, tests and commit messages are English.
- **The engine stays pure.** `engine/` never touches the screen or the network. The app asks it for every rule.
- **Changing a rule?** Follow the checklist at the end of `CLAUDE.md` ("When rules change"). In short: update the
  engine and its `.d.ts` types, add a test, raise `RULES_VERSION` if old saves, replay links or rooms would play out
  differently, update the rule texts, and run all checks.
- **Player-facing text** is written in English as `tr('English text')` and translated by hand in the six dictionaries
  in `app/src/i18n/`. `npm run build` fails when a dictionary is missing a key. Turkish is the launch language, so
  its wording matters most (see the glossary in `CLAUDE.md`).
- **Look and feel** follows `design/` (tokens in `design/tokens/tokens.css`). Keep tap targets at least 44 px.
- Small, focused commits; say why, not only what.

## Where things are

See "Layout" and "Code map" in `CLAUDE.md`.

## License

The project does not have a license file yet; until one is added, all rights stay with the author. Ask before reusing
the code or art outside this repository.
