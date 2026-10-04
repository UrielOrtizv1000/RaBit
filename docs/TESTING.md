# How to test RaBit

## Option A — double-click (the easiest)

Run **`Probar RaBit.bat`** (in the project root). It opens the installable app if you already built it;
if not, it launches it in development mode (`npm run tauri dev`).

## Option B — installer

`npm run tauri build` and run the `.msi` or the `-setup.exe` from `src-tauri\target\release\bundle\`.

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
8. **Savings**: icon with an amber dot and the "Coming soon" label (placeholder page).
9. **Shortcuts**: `Ctrl+N` create, `Esc` close, `Ctrl+K` search.
10. **Backup**: Settings → Data → Export, then Clear and Import.
11. **Reminder**: with the sample data, leave the app open ~3 min: system notification.

## Automated tests

`npm test` (logic and database) · `npm run test:e2e` (browser: onboarding, task, theme, demo).
