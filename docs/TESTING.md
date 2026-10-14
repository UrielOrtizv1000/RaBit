# How to test RaBit

## Option A — double-click (the easiest)

Run **`scripts/windows/probar-rabit.bat`**. It opens the installable app if you already built it;
if not, it launches it in development mode (`npm run tauri dev`).

## Option B — installer

`npm run package` and run `installers\RaBit-Setup.exe`.

## Option C — browser only (fast, no Rust)

`npm run demo` opens `http://localhost:1420/?seed` with sample data.

## Sample data inside the app

Settings (⚙) → **TRY RABIT** → **Load** loads tasks, events, notes, routine and actions.
**Clear** (two clicks) deletes them. It includes an event with a reminder that sounds in ~3 minutes.

## Checklist (5 minutes)

1. **Onboarding**: type your name → Start locally → turn off a module → Let's go. That module disappears from the dock.
2. **Theme**: click the `> RABIT` logo (top left) or Settings → Theme. Light ⇄ Dark; it is remembered when reopening.
3. **Home**: "+ Task" → create a task with a time → mark it: it gets struck through and moves to the end with an animation; "Undo" brings it back.
4. **Panel**: open an existing event (read mode) → Edit → change it and Cancel (reverts) / Save. Tabs EVENTS · NOTES · TASKS.
5. **Notes**: create a note, tag it, pin it, delete it → Deleted filter (30-day trash) → Restore.
   Rename a tag: it updates on all notes. Hide-list button = full-screen note.
6. **Calendar**: Month / Week / Day / Year, navigate real months, click a slot to create.
7. **Routine**: add a block that clashes with an event → it is flagged "! Clash".
8. **Savings**: create a jar (with and without a plan), add and withdraw money (the plan recalculates), fill a jar → RaBit celebrates; drag the carousel and the coins react.
9. **Tutorials**: the main tour on first run, then a short one the first time you open each page or window; Settings → Data → Tutorial → Show replays them all.
10. **Shortcuts**: `Ctrl+N` create, `Esc` close, `Ctrl+K` search.
11. **Backup**: Settings → Data → Export, then Clear and Import.
12. **Updates**: `npm run update-sim:web` (or open the app with `?update-sim`): the download icon appears next to the bell → Update → progress → Restart to update → the Home terminal types "UPDATED TO …".
13. **Notifications**: the bell lists overdue tasks and what is pending today. Reminders/sound are disabled ("in development").

## Tauri permissions (installed app only)

The browser cannot exercise Tauri's permissions, so two checks cover them:

- `npm test` includes `tests/capabilities.test.ts`: `src-tauri/capabilities/default.json` must grant exactly what the code imports.
- `npm run qa:permissions` (Windows) builds a test copy of the app with another identifier, drives it over the WebView2 debugging
  port and checks the real ACL: what the app uses works, everything else is denied, the title bar buttons and Close work.
  Run it after touching `capabilities/` or `tauri.conf.json`. It leaves `target/release/rabit.exe` as the test build
  (use `RABIT_TARGET_DIR` to avoid that, or run `npm run package` afterwards).

Manual check in the **installed** app (the native dialog is not automated): Settings → Data → **Export**, choose a
file, and confirm the `.json` is created and can be imported back.

## README screenshots

`npm run screenshots` starts the dev server if needed, loads the sample data with a fixed date and rewrites the WebP images
in `docs/assets/screenshots/` (Home, Calendar, Routine, Quick Notes and Savings, light and dark). Run it after a visual change,
look at the result, and commit the images with the change. The script lives in `scripts/screenshots/` and is not part of
`npm run test:e2e`.

## Automated tests

`npm test` (logic and database) · `npm run test:e2e` (browser: onboarding, task, theme, demo).
