# QA Notes ("trying to break the UI" session)

Method: extreme scenarios with Playwright (throwaway exploration scripts, since removed; the findings live in the e2e tests; data injected with `window.__rabit` in development only),
screenshots at 1280×800 / 1600×980 / 2560×1440, Spanish + dark, and fuzzing of data and interactions.

## Found and fixed

| #   | Type                 | What was happening                                                                                                                          | Fix                                                                                                                                                         |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Functional/aesthetic | With many events/tasks in one day, the **right column of Home** (today's calendar) stretched the whole page: the UI shrank to 50 %          | The column no longer counts toward the natural height (`contain: size`); the list scrolls inside its card                                                   |
| 2   | Aesthetic            | Overlapping events in **Day/Week/Routine** were split into illegible strips (up to 9 columns)                                               | Greedy column layout with a **maximum of 3** and a `+N` counter for the rest; the Day view uses the full width                                              |
| 3   | Functional           | Press-and-hold on a card and dragging **made the whole UI shake** (page fit recalculating, hover reacting, animated blur on a scaled layer) | During the gesture: the reflow is paused, hover ignores the pointer, that card's blur is disabled, ambient animations are paused, and the shake is smoother |
| 4   | Aesthetic            | Toasts with long titles overflowed the window                                                                                               | Max width and ellipsis                                                                                                                                      |
| 5   | Aesthetic            | Long titles without spaces (`WWWW…`) overlapped the time/label in **Pending tasks**                                                         | Ellipsis on the title                                                                                                                                       |
| 6   | Aesthetic            | The "all day" strip grew without limit and pushed the grid                                                                                  | Max height with internal scroll                                                                                                                             |
| 7   | Functional           | An event could end **before it started** (15:00–14:00) or cross midnight and disappear from the grid                                        | The store normalizes it (end = start + 1 h, max 23:59)                                                                                                      |
| 8   | Functional           | Whitespace-only titles appeared as an empty row                                                                                             | Saved as empty and displayed as "Untitled"                                                                                                                  |
| 9   | Aesthetic            | In Spanish, the **"New event"** button was cut off in the panel at 1280 px                                                                  | More compact tabs and button                                                                                                                                |
| 10  | Aesthetic            | The event chip repeated the day ("Sun Oct 4 · Sunday")                                                                                      | Removed the duplicated name                                                                                                                                 |
| 11  | Aesthetic            | In **Upcoming** (Home) the last row was cut in half                                                                                         | Bottom fade on lists with internal scroll                                                                                                                   |
| 12  | Aesthetic            | Dark mode: the mascot kept a green glow                                                                                                     | No inline filter in dark                                                                                                                                    |
| 13  | Aesthetic            | On large screens (2560×1440) the UI looked small and empty                                                                                  | The base scale goes up to 1.5×                                                                                                                              |

## Tested without failures

Repeated Ctrl+N, rapid language/theme switches with Settings open, window-size storm, calendar navigation ±60 months,
view switching ×48, used tags deleted/renamed, corrupt/partial import, repeated events (Feb 29, day 31), dates
1999/2099, emoji/RTL/HTML in titles (displayed as text), routines reversed. No console errors in any of them.

## New tests

`tests/e2e/stress.spec.ts` (lots of content does not change the scale; holding a card does not re-layout), `tests/logic.test.ts`
(column layout with a cap), `tests/store.test.ts` (title and range normalization).

## Pending / ideas

- The glass (acrylic) effect can only be verified in the installed Windows app (it is off on Linux).
- Default labels created before switching language are not re-translated.

## Packaging regressions (fixed)

- **Exporting a backup failed in the installed app** ("not allowed by ACL"): the window used `fs:default`, which has no write permission, and
  the browser build never goes through Tauri's permissions, so nobody saw it. The window now lists exactly the 21 permissions the code uses
  (`src-tauri/capabilities/default.json`), `tests/capabilities.test.ts` keeps the list honest and `npm run qa:permissions` checks the real app.

- A CSP that included `script-src`, `base-uri`, `form-action` and `frame-ancestors` made **the installed app close as soon as it started** (in the browser it went unnoticed).
  A simpler policy was kept instead (`default-src 'self'`, inline styles, `data:` fonts and images, `connect-src` limited to the Tauri IPC, `object-src 'none'`).
  Rule: after touching `tauri.conf.json` or `src-tauri/capabilities/`, **open the built executable**, not just the browser (`scripts/qa/csp-check.mjs` only validates the interface; `npm run qa:permissions` drives the real app and checks the permissions).

## Linux baseline (Phase 0 of `docs/LINUX-PLAN.md`, 2026-10-17)

Run in a Docker container (Ubuntu 22.04, Node 20.20, Rust 1.99, WebKitGTK 4.1) from `HEAD` of `refactor/second-split`, with no code changes.
The window ran under Xvfb **without a window manager and without a compositor**, so everything about window decorations, resizing,
dragging, transparency and real-GPU rendering is still **unverified** (needs a real GNOME/KDE session).

| Check                                                                  | Result                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`, `typecheck`, `lint`, `format:check`, `npm test` (68 tests)   | Pass                                                                                                                                             |
| `cargo test` (5 tests in `backup.rs`)                                  | Pass                                                                                                                                             |
| `cargo clippy -- -D warnings`                                          | **Fails**: `unnecessary_sort_by` at `src-tauri/src/backup.rs:67` (fix: `sort_by_key` + `Reverse`), before adding clippy to CI                    |
| `tauri build` with `bundle.targets` overridden to `deb, rpm, appimage` | Pass in ~4 min: `.deb` 9.4 MiB, `.rpm` 9.4 MiB, `.AppImage` 83.6 MiB. Today's config (`nsis, dmg, app`) builds none                              |
| `.deb` metadata                                                        | `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` (auto), `.desktop` with `Categories=Office`, `StartupWMClass=rabit`, icons 32/128/256                 |
| App launch (`./rabit`)                                                 | Starts, first screen renders correctly (fonts, gradients, pixel animation); window opens at 1600×980                                             |
| Updater                                                                | Registers and runs the check; logs `update endpoint did not respond with a successful status code` (no release yet)                              |
| Database location                                                      | **`~/.config/app.rabit.desktop/rabit.db`** (+ `-wal`, `-shm`, `last_version.txt`). `README.md:165` and `docs/UPDATES.md:126` are wrong for Linux |
| Logs, WebKit cache, localStorage                                       | `~/.local/share/app.rabit.desktop/` (`logs/`, `WebKitCache/`, `localstorage/`)                                                                   |
| Console/stderr                                                         | Only `dbind-WARNING` about the AT-SPI accessibility bus (harmless in a container)                                                                |

Not tested yet (need a desktop session): resize and drag of the frameless window, `transparent` window, `shadow`, maximize/close buttons,
notifications (`dunst` was installed but no reminder was triggered), `backdrop-filter` look and performance, scrollbars, the jar canvas,
AppImage self-update, 1366×768 screens (current `minHeight` is 800).

### Phase 2 check (native window, 2026-10-18)

Ubuntu 22.04 container, Xvfb 1366×768 **with openbox** (a window manager, still no compositor), `.deb` build from the working tree.

- Native title bar and borders (`_NET_FRAME_EXTENTS` = 1,1,20,5); RaBit's own title bar is not drawn.
- The 1600×980 window of Phase 0 no longer overflows the screen: it opens at 1364×743 and the minimum size is 1024×680 (the WM refused `windowsize 600 400`).
- Resizing to 1200×700 works; the first screen renders correctly. `cargo clippy -D warnings`, typecheck, lint and the 68 tests pass.
- Still needs a real GNOME/KDE session (Wayland): dragging, maximize, `backdrop-filter` cost, scrollbars, jar canvas, notifications.

### Phase 3 check (updater, 2026-10-18)

Same container, AppImage build. The plain binary (no `APPIMAGE`) never contacts the update endpoint; the AppImage does (it logs the expected
"endpoint did not respond" because no release exists yet). 70 tests pass (2 new for unsupported installs).
Not verified: a real AppImage self-update N → N+1 (needs a published release), `relaunch` after replacing the AppImage, and desktop
notifications (reminders were not triggered; `libnotify` is only a recommended package).

### Phase 4 check (CI and scripts, 2026-10-18)

In the container: `npm run build`, `cargo clippy -D warnings`, `cargo test` and `npm run package` (the same steps as the new `linux` job in
`ci.yml`) all pass; `installers/` gets `RaBit-x86_64.AppImage` (87 MB), `.deb` and `.rpm` (9.8 MB each). The workflow itself has **not run on GitHub yet**
(it runs on the first push), and `scripts/linux/probar-rabit.sh` was only checked for its executable bit, not launched.
