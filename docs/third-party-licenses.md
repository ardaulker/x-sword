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
| `app/public/sounds/sword-draw.m4a` | sword drawn at match start | Trimmed and compressed from a file Arda supplied (`sword.wav`, 9 Oct 2026) as royalty-free. Source: freesound.org (Arda, 9 Oct 2026: taken from the royalty-free sources suggested in chat). **The exact page URL, creator and license (CC0 or CC BY) are still to be recorded here.** If it is CC BY, the creator's name must also go into the in-app "Open-source licenses" screen (`app/src/legal/{en,tr}.json → licenses`). |

| `app/public/sounds/*.m4a` (all other game sounds) | moves, takes, bonuses, bell, countdown … | Kenney Vleugels, kenney.nl packs "RPG Audio", "Impact Sounds", "Interface Sounds", **CC0 1.0** (public domain; no credit needed, credited anyway). Downloaded 19 Oct 2026; the file-to-event table is in `tools/make-sounds.py`. |
| `app/public/sounds/energy/armor.m4a`, `useSwap.m4a` | the Laser sword sound theme | Kenney Vleugels, kenney.nl "Sci-Fi Sounds", **CC0 1.0**. Downloaded 20 Oct 2026. The laser sword strokes, its ignition and all tension music are synthesized in `app/src/game/haptics.ts`. |
| Cuts listed in `tools/cut-sounds.py` (classic select, move, take, slash, slashBig, combo, out, collapse, armor, bell; laser sword take and collapse) | both sound themes | **Sonniss GDC 2026 Game Audio Bundle** (gdc.sonniss.com), downloaded 20 Oct 2026. Libraries: Epic Stock Media (Board Game, HD Game Materials, Elemental Mutation), 344 Audio (Historical Weapons Vol. 2), David Dumais Audio (Melee Weapons Pack 2), Federico Soler (Effective Trailer Booms Vol. 2), Ivo Vicic (Church Bells), InMotionAudio (Arc). License: royalty-free, commercial use in games, perpetual, no attribution required; the sounds must not be redistributed or resold as sounds (only these short cuts ship, inside the game) and must not be used to train AI/ML. Keep the downloaded zips out of the repository. |

The synthesized versions in `app/src/game/haptics.ts` stay as the fallback when a file cannot load.
