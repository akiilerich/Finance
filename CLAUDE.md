# SVJ savings tracker

Phone-first PWA served by GitHub Pages from the root of `main` (akiilerich.github.io/Finance). Tracks balances per bank → account, net worth over time, and money saved vs market growth.

## Layout
- `index.html` is the whole app: CSS, a pure parsing script (`Core`: CSV/PDF statement readers, testable in Node), then the app IIFE in sections marked `// ---------- NAME ----------`. No build step or framework; edit it directly.
- `sw.js` is the service worker. Bump `VERSION` whenever it changes.
- `manifest.webmanifest` and the icons are for the installed app.
- `tests/core.test.js` holds the parser tests: `node --test tests/core.test.js`.

## Data
- All state is `S = { meta, bal, tx, tr }`, kept in `localStorage` under `savings-tracker-cache-v1`. There is no server.
- Account and bank ids never change. `migrate(st)` runs on every load and restore: when adding a field, fill it in there and set `st._dirty`.
- The Claude-hosted copy (where `window.claude` exists) stores the same parts in the artifact database (`Store` in cloud mode). It can't fetch exchange rates, and the back-button handling is off there.

## Conventions
- Every change bumps `APP_VERSION`, shown at the bottom of every screen: patch for fixes, minor for features, major for redesigns.
- Commit summaries start with the version, then a short bulleted list, and name the files changed.
- Keep the Pocket Cards design: Bricolage Grotesque, colour tokens on `:root` with dark-mode overrides, white 26px-radius cards, a mint accent and pill buttons.
- The repo and site are public. Never commit real statements or backups; tests use made-up data only.
- The owner isn't a developer. Explain changes in plain words. Plan bigger changes first and get approval.

## Testing
Serve the folder (`python3 -m http.server`) and drive it with Playwright at 390×844. Cover typing balances (2000000 → 20,000.00), importing Chase and Monzo CSVs, the transfer spotted in an import, undoing an import, backup and restore, and the back button.
