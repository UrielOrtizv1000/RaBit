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

- The glass (acrylic) effect can only be verified in the installed Windows app.
- Default labels created before switching language are not re-translated.

## Packaging regression (fixed)

- A CSP that included `script-src`, `base-uri`, `form-action` and `frame-ancestors` made **the installed app close as soon as it started** (in the browser it went unnoticed).
  A simpler policy was kept instead (`default-src 'self'`, inline styles, `data:` fonts and images, `connect-src` limited to the Tauri IPC, `object-src 'none'`).
  Rule: after touching `tauri.conf.json`, **open the built executable**, not just the browser (`tools/qa/csp-check.mjs` only validates the interface).
