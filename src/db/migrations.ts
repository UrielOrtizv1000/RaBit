/** Migraciones versionadas. Nunca edites una existente: añade una nueva. */
export const MIGRATIONS: { version: number; sql: string[] }[] = [
  {
    version: 1,
    sql: [
      `CREATE TABLE user (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, created_at INTEGER NOT NULL, onboarding_done INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)`,
      `CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL)`,
      `CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, time TEXT, important INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0, done_at INTEGER, created_at INTEGER NOT NULL)`,
      `CREATE TABLE events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, start TEXT NOT NULL, "end" TEXT NOT NULL, all_day INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL, important INTEGER NOT NULL DEFAULT 0, recurring INTEGER NOT NULL DEFAULT 0, repeat TEXT, auto_delete_after INTEGER NOT NULL DEFAULT 0, remind_n INTEGER, remind_unit TEXT, remind_freq TEXT)`,
      `CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', tag_id TEXT REFERENCES tags(id) ON DELETE SET NULL, pinned INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER, updated_at INTEGER NOT NULL)`,
      `CREATE TABLE routine_blocks (id TEXT PRIMARY KEY, title TEXT NOT NULL, day INTEGER NOT NULL, start TEXT NOT NULL, "end" TEXT NOT NULL, color TEXT NOT NULL, every_weeks INTEGER NOT NULL DEFAULT 1)`,
      `CREATE TABLE kv (key TEXT PRIMARY KEY, json TEXT NOT NULL)`,
      `CREATE INDEX idx_tasks_date ON tasks(date)`,
      `CREATE INDEX idx_events_date ON events(date)`,
    ],
  },
];
