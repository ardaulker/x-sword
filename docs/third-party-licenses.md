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
