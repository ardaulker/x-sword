# Third-party software and fonts

X Sword bundles the following open-source packages in the game build. Their licenses allow this use; keep this list
current when dependencies change (`app/package.json`).

| Package | Use | License |
|---|---|---|
| Oxanium (via `@fontsource/oxanium`) | display font | SIL Open Font License 1.1 |
| Barlow (via `@fontsource/barlow`) | text font | SIL Open Font License 1.1 |
| React, React DOM | user interface | MIT |
| PeerJS | phone-to-phone connections | MIT |
| Vite, TypeScript | build tools (not shipped) | MIT / Apache-2.0 |

The OFL asks that the fonts keep their license text when redistributed: it is in
`app/node_modules/@fontsource/*/LICENSE` and must be included in any store build's "licenses" screen.

## Sounds

| File | Use | Source and license |
|---|---|---|
| `app/public/sounds/sword-draw.m4a` | sword drawn at match start | Trimmed and compressed from a file Arda supplied (`sword.wav`, 9 Oct 2026) as royalty-free. **Source page and license still to be recorded here.** If it is CC BY, the creator's name must also go into the in-app "Open-source licenses" screen (`app/src/legal/{en,tr}.json → licenses`). |

All other sounds are synthesized in code (`app/src/game/haptics.ts`) and carry no license.
