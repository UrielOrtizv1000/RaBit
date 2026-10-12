# Shared contract

RaBit has three clients — desktop (`/`), iOS (`ios/`) and Android (`android/`) — and
no server. The apps share **no code**, only this contract. If a client diverges from it,
the backup file stops being portable between platforms.

| File                                                                                   | What it defines                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`schema/v1.sql`](schema/v1.sql), [`v2.sql`](schema/v2.sql), [`v3.sql`](schema/v3.sql) | SQLite schema, versions 1–3 (Savings)                  |
| [`backup-format.md`](backup-format.md)                                                 | The exported/imported `.json` backup (the sync format) |
| [`design-tokens.md`](design-tokens.md)                                                 | Colors, limits and conventions every client must match |
| [`fixtures/`](fixtures)                                                                | Sample backups clients can import in their tests       |

## Source of truth

The desktop app is the reference implementation until the contract says otherwise:

- Schema: `src/db/migrations.ts`
- Types and constants: `src/domain/types.ts`
- Backup shape: `BackupFile` in `src/store/data.ts`

When any of those change, update the matching file here **in the same PR**, and bump
the schema or backup `version`. Migrations are append-only: never edit `v1.sql`, add `v2.sql`.
