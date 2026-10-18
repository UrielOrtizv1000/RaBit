# Changelog

## Unreleased

- **Shorter tutorial**: 17 steps instead of 42 (4 in the main tour, 1–2 per page or window), still shown once per page.
- **Settings → Updates → Check for updates**, with a message when you are up to date.
- Windows installer with the RaBit icon, publisher and branded banners; `npm run package` → `installers/RaBit-Setup.exe` (the `.msi` is no longer built).
  Releases also carry a copy named `RaBit-Setup.exe` so the download link never changes, and a check that `latest.json` is valid.
- Repository tidy-up: CI workflow, issue templates, scripts under `scripts/`, design mockups under `docs/design/`, `npm run clean`.
- Updater hardening: a time limit on the check (20 s) and the download (10 min), release notes from the network capped to 20 lines of 160
  characters, third-party GitHub Actions pinned by commit SHA, `release:check` refuses placeholder values and `npm run release:set-pubkey`
  copies the public key into the config. The key and the release rules are documented in `docs/UPDATES.md`.
- Internal: no lint warnings (`oxlint --deny-warnings`); the seven largest files were split into one component per card, window or dialog
  (every file is now under ~400 lines, except four still listed in the architecture guide); brand colors are CSS variables (`--rb-*`) and
  shared button styles live in `components/ui/buttons.ts`. No visual change.
- **Fix: exporting a backup failed in the installed app** (the window had no permission to write the file; the browser version worked). The window's Tauri permissions are now exactly the 21 the app uses (before: `core:default`, `dialog:default`, `fs:default` and others, 21 of the 27 unused commands checked were open); `tests/capabilities.test.ts` keeps them honest and `npm run qa:permissions` checks the real app.
- README: badges (CI, release, license, platform), a hero image and a gallery of the real app in light and dark; `npm run screenshots` regenerates the images (`docs/assets/screenshots/`).
- `public/rabit.png` recompressed without loss (1.2 MB → 1.0 MB): the browser decodes exactly the same pixels.

- **Automatic updates** (`docs/UPDATES.md`): the app checks quietly at start and every 6 hours; a glass download icon (orange dot, progress
  ring) appears next to the bell with a panel (what's new, **Update** / **Later**, **Restart to update**, Retry on errors); an already-downloaded
  update installs on exit; after updating the Home terminal types `UPDATED TO vX.Y.Z`. Built on `tauri-plugin-updater` + `tauri-plugin-process`,
  signed releases from `.github/workflows/release.yml` (tag `v*`), `npm run release:check`, and a dev-only simulation (`npm run update-sim`).
- `rabit.db` is backed up (`rabit.backup-<version>.db`, last 3 kept) the first time a new version starts, before migrations run.

- **Savings** module: jars with physics-driven coins, weekly streak, per-goal plans (deadline / "what I can save" / no plan),
  deposits and withdrawals, calculator and RaBit messages. Data in two new tables (schema v2) and an optional `savings`
  section in the JSON backup (older backups still import).
- Savings: pull a jar up to delete it (with Undo); a jar with a **deadline** adds an all-day event to the Calendar and tells you how much to save
  per week until then; the calculator column lines up with the jars (schema v3).
- Savings windows now blur the whole app (not just the page area); every page and window (Calendar, Routine, Quick Notes, Savings, the jar
  and money windows, the item panel, Settings) has its own first-visit guided tutorial, shown once after the main one.
- Notification bell is now real: overdue tasks, events still ahead today and today's tasks.
- First-run guided tutorial (replayable from Settings → Data); text size setting (small / medium / large).
- Quick Notes tags stay on one row, can be dragged sideways and searched; routine colors exclude blue and purple, and a routine card has a back button.
- Reminders and sound are switched off ("in development"); the glass effect option was removed.

## 0.1.0-beta

- Beta installer with a fixed name: `npm run package:beta` → `installers/RaBit_beta.exe` / `RaBit_beta.msi`.
- Code reorganized into layers (`domain → db → store → services → components → features → app`), shared components moved out of `calendar`,
  utilities in `src/lib`, documentation headers in every file, and `docs/ARCHITECTURE.md`.
- Quality: oxlint + Prettier with a fixed configuration, `lib/log.ts` (no swallowed exceptions), restrictive CSP in Tauri.
- QA session (`docs/QA.md`): 13 UI and data fixes.

- Portfolio removed; new **Savings** module marked as "coming soon".
- Spanish and English with a selector in Settings (and in the onboarding).
- Very subtle glass effect (transparent window + acrylic on Windows), with a toggle.
- Flat dark theme, press-and-swipe-to-delete gesture, smooth animations, shared safe area.

## 0.1.0 — local test build

### Included

- Tauri 2 shell: 1440×900 window (min. 1200×760), custom title bar, fixed dock and topbar.
- Local onboarding (name + modules ON/OFF), `Rabit.png` mascot (also the app icon).
- Home, shared Events/Notes/Tasks panel, Calendar (month/week/day/year), Routine linked to the real calendar,
  Quick Notes with a 30-day trash and tags, Settings.
- SQLite with versioned migrations, reminders with native notifications, JSON backup, empty `SyncProvider`.
- Tests: Vitest (logic, persistence) and Playwright (basic flow).

### Pending

- Real dark theme (the original design only changes the logo; the preference is saved).
- Savings module (currently just a "coming soon" page).
- Cloud sync, login, and auto-updater (out of scope for this version).
