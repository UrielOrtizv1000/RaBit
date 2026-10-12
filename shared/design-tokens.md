# Design tokens and limits

Values every client must keep identical so the three apps feel like one product.
Source: `src/domain/types.ts`.

## Colors

| Token          | Values                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ |
| Event colors   | `#17b866` `#4b7fd6` `#8a6fd6` `#2aa6a0` `#c98a1e` `#a8443a`                                |
| Routine colors | Event colors **minus** blue `#4b7fd6` and purple `#8a6fd6` (reserved for events and tasks) |
| Tag colors     | `#17b866` `#2aa6a0` `#4b7fd6` `#8a6fd6` `#d0579a` `#c98a1e` `#a8443a` `#5d6f67`            |
| Brand          | neon-green pixel rabbit on black — see `assets/app-icon.png`                               |

Fonts: Plus Jakarta Sans (UI), Doto and Silkscreen (pixel accents).

## Limits and defaults

| Rule             | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Title max length | 60 chars (events, tasks, notes, routine), trimmed, never whitespace-only |
| Trash retention  | 30 days (`TRASH_DAYS`), then notes are purged                            |
| Default tags     | Ideas `#17b866`, Study `#4b7fd6`, Shopping `#c98a1e`                     |
| Event time range | `end` must not be before `start`                                         |
| Languages        | `en` (default), `es`; UI strings keyed by their English text             |

## Platform adaptation

Mobile clients follow platform conventions (SwiftUI / Material 3) but keep the same modules:
Home, Calendar, Routine, Quick Notes, Settings (Savings is still a placeholder).
The desktop-only glass effect and custom title bar do not apply.
