# Backup format (v1)

A plain UTF-8 `.json` file named `rabit-backup-YYYY-MM-DD.json`. It is the only way data
moves between devices and platforms (there is no sync backend), so every client must read
and write it identically.

```jsonc
{
  "app": "rabit",          // must equal "rabit"; anything else is rejected
  "version": 1,            // backup format version
  "exportedAt": 1759560000000, // epoch ms
  "user": { "name": "…", "createdAt": 0, "onboardingDone": true } | null,
  "settings": {
    "modules": { "calendar": true, "routine": true, "notes": true, "savings": false },
    "theme": "light" | "dark",
    "timeFormat": "12h" | "24h",
    "weekStart": 0 | 1,    // 0 = Sunday, 1 = Monday
    "reminders": false,    // in development on desktop: always false for now
    "sound": false,        // in development on desktop: always false for now
    "language": "en" | "es",
    "fontSize": "small" | "medium" | "large", // optional in old files; default "medium"
    "glass": false         // retired; always false, kept for compatibility
  },
  "tags": [],              // { id, name, color }
  "tasks": [],             // { id, title, description, date, time|null, important, done, doneAt|null, createdAt }
  "events": [],            // { id, title, description, date, start, end, allDay, color, important,
                           //   recurring, repeat: "weekly"|"monthly"|"yearly"|null, autoDeleteAfter,
                           //   remind: { n, unit: "days"|"hours", freq: "once"|"daily" } | null }
  "notes": [],             // { id, title, body, tagId|null, pinned, deletedAt|null, updatedAt }
  "routine": [],           // { id, title, day (0 = Monday … 6 = Sunday), start, end, color, everyWeeks }
  "savings": {             // optional: backups made before Savings do not have it
    "goals": [],           // { id, name, target, saved, color, freq: "none"|"week"|"month", n, start, important,
    //   deadline: "YYYY-MM-DD"|null (also an all-day Calendar event), eventId: string|null }
    "moves": []            // { id, goalId, amt (+deposit / −withdrawal), at (epoch ms) }
  }
}
```

Types and field meanings: `src/domain/types.ts`.

## Rules for every client

- **Validate before touching the database.** Reject files where `app !== "rabit"` or any of
  `tags`, `tasks`, `events`, `notes`, `routine` is not an array.
- **IDs are UUID strings** (`crypto.randomUUID()` on desktop; `UUID().uuidString` / `UUID.randomUUID()` natively).
- **Preserve unknown fields** when re-exporting data from a newer version when feasible; never crash on them.
- **Import replaces** the local data (it is not a merge). Warn before doing it.
- A file with `version` greater than the client understands must be refused with a clear message.
- Import and export on mobile use the system share/file sheet, never a network call.
