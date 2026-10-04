# RaBit Architecture

Desktop application (Tauri 2) with a React + TypeScript interface. **100% local**: there is no server, accounts or network.
This document explains _why_ the code is organized this way and how to extend it without breaking anything.

## Layers and dependency direction

```
app ──► features ──► components ──► store ──► db ──► (SQLite)
 │          │             │            │
 └──────────┴─────────────┴────────────┴──► domain (pure)   lib (no-domain utils)   i18n
```

A layer may only import from the ones to its right. Never the other way around.

| Folder           | Responsibility                                                                                     | Must not contain                  |
| ---------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- |
| `src/domain`     | **Pure** types and business rules (dates, task ordering, repetitions, column distribution).       | React, database, `window`.        |
| `src/db`         | SQL interface (`SqlAdapter`), versioned migrations and row ⇄ domain repository.                   | Business logic, UI.               |
| `src/store`      | State (Zustand). `data.ts` writes to SQLite; `ui.ts` is UI state only.                            | JSX, styles.                      |
| `src/services`   | Effects with the outside world: startup, reminders, backup, glass, sample data.                   | React components.                 |
| `src/lib`        | UI utilities without domain (`swipe`, `zoom`, `log`).                                             | Business rules.                   |
| `src/components` | Reusable components: `ui/` (header, terminal, styles) and `ItemPanel/` (shared panel).            | Knowing about a specific page.    |
| `src/features/*` | One folder per page/module (home, calendar, routine, notes, savings, settings, onboarding).       | Importing from another feature.   |
| `src/app`        | Shell: window, top bar, dock, page fitting (`FitPage`), app startup.                              | Business rules.                   |
| `src/i18n`       | `t()` and per-area dictionaries in `es/*.ts`.                                                     | Untranslated UI text.             |
| `src-tauri`      | Minimal Rust backend: window, plugins (sql, notifications, dialog, fs) and glass effect.          | Application logic.                |

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

### Change the look

The shared styles are in `components/ui/cardStyles.ts` and `components/ui/glass.ts`; the keyframes in `styles/global.css`.
Dark mode inverts the light interface with a CSS filter (`.rb-themed`) and re-inverts what was already dark: if you add a new
dark surface, its color must match the selectors in `global.css` (section "Dark mode").

## Quality

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm run typecheck`    | Strict TypeScript (no `any`, no unused variables).             |
| `npm run lint`         | oxlint: correctness, `no-explicit-any`, hooks rules.           |
| `npm run format:check` | Prettier with a fixed configuration (`.prettierrc.json`).      |
| `npm test`             | Vitest: pure rules, persistence, complete i18n.                |
| `npm run test:e2e`     | Playwright: onboarding, tasks, theme, language, gestures, stress. |
| `npm run package:beta` | Builds and leaves `installers/RaBit_beta.exe` and `RaBit_beta.msi`. |

Error logging: no exception is silently swallowed; `lib/log.ts → logWarn(scope, error)` is used (without personal data).
