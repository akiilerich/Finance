# SVJ savings tracker

Phone-first PWA served by GitHub Pages from the root of `main` (akiilerich.github.io/Finance). Tracks balances per bank → account, net worth over time, and money saved vs market growth.

## Layout
- `index.html` is the whole app: CSS, a pure parsing script (`Core`: CSV/PDF statement readers, testable in Node), then the app IIFE in sections marked `// ---------- NAME ----------`. No build step or framework; edit it directly.
- `sw.js` is the service worker. Bump `VERSION` whenever it changes.
- `manifest.webmanifest` and the icons are for the installed app.
- `tests/core.test.js` holds the parser tests: `node --test tests/core.test.js`.

## Data
- All state is `S = { meta, bal, tx, tr }`, kept in `localStorage` under `savings-tracker-cache-v1`. There is no server.
- The Update page lists accounts with "your usual" first: accounts with at least two typed balances or imports in the last 60 days (computed, not stored). Balances are typed on a built-in keypad sheet (`startKeypad`), one account after another.
- Account and bank ids never change. `migrate(st)` runs on every load and restore: when adding a field, fill it in there and set `st._dirty`.
- The Claude-hosted copy (where `window.claude` exists) stores the same parts in the artifact database (`Store` in cloud mode). It can't fetch exchange rates, and the back-button handling is off there.

## SVJ Beta (the test copy)
- A second app to install next to SVJ for trying changes: repo `akiilerich/svj-beta`, served at akiilerich.github.io/svj-beta. It sits beside /Finance/ on purpose: on Android anything under /Finance/ counts as part of the installed SVJ, so it couldn't be installed separately.
- It runs the same `index.html` and `sw.js`, copied from the branch being tested. Only its `manifest.webmanifest` (name "SVJ Beta") and icons (mint background, BETA tag) differ. `index.html` detects it from the /svj-beta/ path (`BETA`) and shows a Beta tag on every screen.
- Both apps share one website, so they share browser storage. The beta keeps its data under `svj-beta-cache-v1` and can copy the main app's `savings-tracker-cache-v1` (read only). Never write the main key from the beta. Service worker caches are named per app (`savings-tracker-v*`, `svj-beta-v*`) and each clears only its own.
- Workflow: publish experimental work to svj-beta first; when Anders is happy with it, merge the branch into Finance `main`.
- To test both together, serve a folder holding `Finance/` and `svj-beta/` side by side.

## Conventions
- Every change bumps `APP_VERSION`, shown at the bottom of every screen: patch for fixes, minor for features, major for redesigns.
- Commit summaries start with the version, then a short bulleted list, and name the files changed.
- Keep the Pocket Cards design: Bricolage Grotesque, colour tokens on `:root` with dark-mode overrides, white 26px-radius cards, a mint accent and pill buttons.
- The repo and site are public. Never commit real statements or backups; tests use made-up data only.
- The owner isn't a developer. Explain changes in plain words. Plan bigger changes first and get approval.

## Testing
Serve the folder (`python3 -m http.server`) and drive it with Playwright at 390×844. Cover the keypad (2000000 → £20,000.00, ⌫ → £2,000.00), the "Update …" round and the stray-digit warning, card-machine typing in the transfer amount (2000000 → 20,000.00), importing Chase and Monzo CSVs, the transfer spotted in an import, undoing an import, backup and restore, and the back button.
