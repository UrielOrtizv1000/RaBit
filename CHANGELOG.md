# Changelog

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
