<div align="center">
  <img src="assets/app-icon.png" alt="RaBit — a neon-green pixel rabbit head on a black background" width="190">
  <h1>RaBit</h1>
  <p><b>A local-first desktop organizer for tasks, events, notes and routine.</b><br>
  No account. No cloud. No ads. No paywall.</p>
</div>

---

## Why this exists

I kept bouncing between organizers that put an ad in front of everything or
asked me to subscribe for features a to-do list should just have. So I built
the one I wanted: it lives on your machine, stores everything in a local
SQLite file, and has nobody to sell your data to — because it never leaves
your computer.

**RaBit is free, and it stays free.** No ads, no tiers, no "pro" upsell.

## Status: beta, in active development

This is version **0.1.0-beta**. It is functional and it is what I use, but it
is not finished. Windows is the platform I build and test on.

**Working today**

- Onboarding (pick a name, switch modules on or off)
- **Home** — today's events, pending tasks, quick capture
- **Calendar** — month, week, day and year views, click a slot to create
- **Routine** — recurring blocks tied to the real calendar, with clash detection
- **Quick Notes** — tags, pinning, and a 30-day trash you can restore from
- A shared detail panel for events, notes and tasks (autosave, cancel/undo)
- **Settings** — theme, language, glass effect, JSON export/import, sample data
- Native reminders, light and dark themes, English and Spanish
- A discreet glass effect (custom title bar + acrylic on Windows), with a switch

**Not done yet**

- **Savings** — the dock entry exists, the screen is a "coming soon" placeholder
- Real dark theme — the preference is saved, the palette is still being worked on
- Sync, accounts and an auto-updater are deliberately out of scope for now.
  The `SyncProvider` interface exists so a backend can be dropped in later
  without touching the rest of the app.

## How this was built

RaBit is an AI-assisted project and I would rather say so than have you guess
from the commit history.

- **Claude** produced the original UI/UX mockups (the `.dc.html` files in
  `design/`) and a substantial part of the implementation.
- **Hermes** has acted as the coding agent — repository setup, refactors,
  documentation, and the QA pass that produced `docs/QA.md`.
- I direct the project, review every change, decide what ships, and test it
  myself. The architecture, the data model and the standards are mine.

The result is honest, tested work, but you will find the fingerprints of an AI
pair throughout. Judge it on that basis.

## Tech stack

Tauri 2 (Rust shell) + React 18 + strict TypeScript + Vite. State with Zustand,
persistence in SQLite through `tauri-plugin-sql` with versioned migrations
(`sql.js` in the browser for development and end-to-end tests). Framer Motion
for the animations. Quality gate: Vitest (logic, persistence, i18n coverage),
Playwright (end-to-end), oxlint, Prettier and `tsc --noEmit`.

## Getting started

Requirements: Node 20+, npm, a stable Rust toolchain (`rustup`) and the Tauri 2
system dependencies for your platform — on Windows that means the Microsoft C++
Build Tools and WebView2. No environment variables, no secrets, no API keys.

```bash
npm install
npm run tauri dev      # the desktop app, in development mode
npm run dev            # frontend only, in a browser (sql.js + localStorage)
npm run demo           # browser with sample data (?seed)

npm run typecheck      # strict TypeScript
npm run lint           # oxlint
npm run format:check   # Prettier
npm test               # Vitest
npm run test:e2e       # Playwright
npm run package:beta   # builds installers/RaBit_beta.exe and .msi
```

`http://localhost:1420/?seed` loads sample data in development. In an installed
build, use **Settings → Try RaBit**.

Step-by-step manual checks live in [`docs/TESTING.md`](docs/TESTING.md).

## Where your data lives

A single SQLite file, `rabit.db`, in the per-platform app data directory:

| Platform | Path |
| --- | --- |
| Windows | `%APPDATA%\app.rabit.desktop\rabit.db` |
| macOS | `~/Library/Application Support/app.rabit.desktop/rabit.db` |
| Linux | `~/.local/share/app.rabit.desktop/rabit.db` |

In the browser (development and tests only) the same SQL schema is kept in
`localStorage`. To move your data, use **Settings → Data → Export / Import**
(a plain `.json` file).

## Privacy and security

RaBit makes no network requests and collects nothing. There is no telemetry, no
analytics and no crash reporting — the app has nothing to phone home with. The
Tauri window ships a restrictive CSP, every SQL query is parameterised, and
errors are logged through `src/lib/log.ts` without personal data. See
[`SECURITY.md`](SECURITY.md).

## Project layout

```
src/domain      pure business rules (no React, no DB)   src/lib         swipe, zoom, log
src/db          SQL, migrations, repository             src/components  ui/ and the shared ItemPanel/
src/store       Zustand (data + UI state)               src/features    home, calendar, routine, notes, savings, settings, onboarding
src/services    boot, reminders, backup, sample data    src/app         shell, dock, FitPage
src/i18n        t() plus Spanish dictionaries           src-tauri       Tauri 2 shell (Rust)
tests/          Vitest and Playwright                   docs/           architecture, testing, QA
```

The reasoning behind the layering — and how to extend the app without breaking
it — is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Contributing

Fork it, branch off `main`, and open a pull request. Conventional Commits,
passing tests, and no secrets in the diff. [`CONTRIBUTING.md`](CONTRIBUTING.md)
has the details.

## License

RaBit is free software, released under the **GNU General Public License v3.0**
(see [`LICENSE`](LICENSE)). You can use it, study it, change it and share it.
If you distribute a modified version, it has to stay under the same license and
keep the original authorship and copyright intact — RaBit stays RaBit, and it
stays mine. That is the whole point of picking a copyleft license over a
permissive one.

Copyright (C) 2026 Uriel Ortiz.
