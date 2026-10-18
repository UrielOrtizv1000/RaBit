# RaBit Architecture

Desktop application (Tauri 2) with a React + TypeScript interface. **100% local**: there is no server or accounts; the only network request is the update check against GitHub releases.
This document explains _why_ the code is organized this way and how to extend it without breaking anything.

## Multi-platform layout

This repository holds the desktop app (root, `src/`, `src-tauri/`) and the folders for the native mobile clients,
`ios/` (RaBitIOS, SwiftUI) and `android/` (RaBitAndroid, Kotlin + Compose). The clients share no code: they share the
contract in `shared/` (schema, backup `.json` format, design tokens). The desktop app is the reference implementation;
change the contract in the same PR as the code it describes.

## Layers and dependency direction

```
app ──► features ──► components ──► store ──► db ──► (SQLite)
 │          │             │            │
 └──────────┴─────────────┴────────────┴──► domain (pure)   lib (no-domain utils)   i18n
```

A layer may only import from the ones to its right. Never the other way around.

| Folder           | Responsibility                                                                                                          | Must not contain                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `src/domain`     | **Pure** types and business rules (dates, task ordering, repetitions, column distribution).                             | React, database, `window`.      |
| `src/db`         | SQL interface (`SqlAdapter`), versioned migrations and row ⇄ domain repository.                                         | Business logic, UI.             |
| `src/store`      | State (Zustand). `data.ts` writes to SQLite; `ui.ts` is UI state only.                                                  | JSX, styles.                    |
| `src/services`   | Effects with the outside world: startup, reminders, backup, glass, sample data.                                         | React components.               |
| `src/lib`        | UI utilities without domain (`swipe`, `zoom`, `log`).                                                                   | Business rules.                 |
| `src/components` | Reusable components: `ui/` (header, terminal, styles) and `ItemPanel/` (shared panel).                                  | Knowing about a specific page.  |
| `src/features/*` | One folder per page/module (home, calendar, routine, notes, savings, settings, onboarding).                             | Importing from another feature. |
| `src/app`        | Shell: window, top bar, dock, page fitting (`FitPage`), app startup.                                                    | Business rules.                 |
| `src/i18n`       | `t()` and per-area dictionaries in `es/*.ts`.                                                                           | Untranslated UI text.           |
| `src-tauri`      | Minimal Rust backend: window, plugins (sql, notifications, dialog, fs, updater, process, log), backup and glass effect. | Application logic.              |

## Important decisions (and why)

- **Persistence behind an interface (`SqlAdapter`).** Tauri uses real SQLite; the browser and the tests use `sql.js`
  with the _same_ SQL. This way the persistence tests are fast and don't depend on the desktop app.
- **Versioned migrations** (`db/migrations.ts`, `PRAGMA user_version`). An existing migration is never edited: another one is added.
- **Always parameterized queries.** SQL is never concatenated with user data.
- **The store normalizes before saving** (titles max. 60 and without "whitespace only", events without an inverted range). This way no
  screen has to defend itself against weird data.
- **`FitPage`: no page scroll.** Each page is scaled to fit; the base scale is the same across all of them (uniform padding).
  Long lists scroll _inside_ their card; side columns use `contain: size` so they don't stretch the page.
- **i18n by key = English text.** `t("Today")`. Changing the language remounts the tree (`key={language}` in `App.tsx`), which is why
  `t()` is never called in module constants (they would be evaluated only once): constants store the key and it is translated at render time.
- **Gestures and animations** live in `lib/swipe.ts` (hold + swipe to delete) and `styles/global.css` (keyframes `rb-*`).
  During a gesture, `FitPage` and the ambient animations are paused so the interface doesn't vibrate.
- **No secrets or network.** Restrictive CSP in `tauri.conf.json`; there are no required environment variables.

## How to extend

### Add a page/module

1. `src/store/ui.ts`: add the id to `PageId`. `src/domain/types.ts`: add the key to `Modules`.
2. `src/app/nav.ts`: icon and label (the English label is the i18n key).
3. `src/features/<module>/<Module>Page.tsx`: use `PageHeader` and the cards from `components/ui`.
4. Register it in `PAGES` (`src/app/App.tsx`), in the `MODS` of Settings and Onboarding, and in the Dock's `moduleOf`.
5. Normalize old settings in `db/repo.ts → normalizeSettings` if you rename a key.

### Add or change text

1. Write `t("English text")` (or `t("Hi, {name}", { name })` / `tn(n, "event", "events")`).
2. Add the translation in `src/i18n/es/<area>.ts`. `npm test` fails if any key is missing.

### Add a language

Add it to `LANGS` in `src/i18n/index.ts`, create the dictionary for that language (same shape as `es/`) and extend `Lang`.

### Change the database schema

Add an object at the end of `MIGRATIONS` (next `version`) with SQL statements, update `db/repo.ts` and add a test in `tests/store.test.ts`.

### Keep files small

Aim for **under ~400 lines per file**. A page (`features/<x>/<X>Page.tsx`) owns the state and the actions; its cards, windows
and dialogs live in sibling files that receive props, pure rules go in `model.ts`, and gesture/animation logic in a
`use<Name>.ts` hook. Move code, don't rewrite it, and compare screenshots before and after when you split a screen.

Still over that size and good candidates for the next split: `features/settings/SettingsModal.tsx`,
`components/ItemPanel/ItemPanel.tsx`, `features/savings/SavingsPage.tsx` and `components/ItemPanel/NotePane.tsx`.

### Tauri permissions (capabilities)

The window may only call what the app uses: `src-tauri/capabilities/default.json` lists **21 permissions** and no
`*:default` set. Anything not listed is rejected by Tauri's ACL ("not allowed by ACL"). Why each one is there:

| Permission(s)                                                                          | Used by                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql:allow-load`, `sql:allow-select`, `sql:allow-execute`                              | `db/tauriDb.ts` (the SQLite database)                                                                                                                                                               |
| `core:window:allow-minimize`, `allow-toggle-maximize`, `allow-close`                   | the title bar buttons (`app/TitleBar.tsx`)                                                                                                                                                          |
| `core:window:allow-start-dragging`, `allow-internal-toggle-maximize`                   | the draggable title bar (`data-tauri-drag-region`: drag and double-click to maximize)                                                                                                               |
| `core:window:allow-destroy`, `core:event:allow-listen`, `allow-unlisten`               | installing a downloaded update when the window is closed (`services/updater.ts`, `onCloseRequested`)                                                                                                |
| `core:app:allow-version`                                                               | the version shown and compared by the updater                                                                                                                                                       |
| `updater:allow-check`, `allow-download`, `allow-install`, `process:allow-restart`      | the update flow (check, download, install, relaunch)                                                                                                                                                |
| `notification:allow-is-permission-granted`, `allow-request-permission`, `allow-notify` | reminders (`services/reminders.ts`)                                                                                                                                                                 |
| `dialog:allow-save`, `fs:allow-write-text-file`                                        | **Export backup** (`services/backup.ts`): the user picks a file in the native "Save" dialog; the dialog plugin then adds **that exact path** to the file scope, so nothing else on disk is writable |

Not permissions: `invoke("set_glass")` is the app's own command and needs none; the `log` plugin is only used from Rust.

Rules:

- Adding a Tauri plugin or API means adding its permissions here **and** its row to the table in
  `tests/capabilities.test.ts`, which fails if the JSON grants more or less than the imported modules need (no `*:default`,
  no leftovers, no missing ones).
- **A browser test cannot see permissions.** After touching `capabilities/` or `tauri.conf.json`, run
  `npm run qa:permissions` (Windows): it builds a test copy of the app with another identifier (your data is not touched),
  drives it, and checks that everything the app uses is allowed and everything else is denied.
- History: until this audit the list used `core:default`, `dialog:default` and `fs:default`. `fs:default` has no write
  permission, so **exporting a backup failed in the installed app** (it worked in the browser).

### Colors and buttons

Brand colors are CSS variables (`--rb-*`, top of `styles/global.css`): write `color: "var(--rb-muted)"`, not the hex. Shared
button styles are in `components/ui/buttons.ts`. Two exceptions: SVG attributes (`stroke=`, `fill=`) and canvas/framer-motion
code need literal colors, and the dark surfaces `#1c2a23` / `rgba(12,24,18…)` must stay literal because the dark theme finds
them by text in the `style` attribute.

### Change the look

The shared styles are in `components/ui/cardStyles.ts` and `components/ui/glass.ts`; the keyframes in `styles/global.css`.
Dark mode inverts the light interface with a CSS filter (`.rb-themed`) and re-inverts what was already dark: if you add a new
dark surface, its color must match the selectors in `global.css` (section "Dark mode").

## Quality

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run typecheck`    | Strict TypeScript (no `any`, no unused variables).                |
| `npm run lint`         | oxlint: correctness, `no-explicit-any`, hooks rules.              |
| `npm run format:check` | Prettier with a fixed configuration (`.prettierrc.json`).         |
| `npm test`             | Vitest: pure rules, persistence, complete i18n.                   |
| `npm run test:e2e`     | Playwright: onboarding, tasks, theme, language, gestures, stress. |
| `npm run package`      | Builds and leaves `installers/RaBit-Setup.exe`.                   |

Error logging: no exception is silently swallowed; `lib/log.ts → logWarn(scope, error)` is used (without personal data).
