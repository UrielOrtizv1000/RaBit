/**
 * Repositorio: traduce entre filas SQL y los tipos del dominio (carga completa + guardados por entidad).
 * Todas las consultas están parametrizadas (nunca se concatena SQL con datos del usuario).
 * `normalizeSettings` migra ajustes antiguos (p. ej. módulo `portfolio` → `savings`).
 */
import type { SqlAdapter, SqlValue } from "./adapter";
import { systemLang } from "../i18n";
import type { CalEvent, Note, RoutineBlock, Settings, Tag, Task, User } from "../domain/types";

type Row = Record<string, SqlValue>;
const b = (v: SqlValue) => v === 1;
const s = (v: SqlValue) => String(v ?? "");
const n = (v: SqlValue) => Number(v ?? 0);

export const DEFAULT_SETTINGS: Settings = {
  modules: { calendar: true, routine: true, notes: true, savings: true },
  theme: "light",
  timeFormat: "24h",
  weekStart: 1,
  reminders: true,
  sound: true,
  language: systemLang(),
  glass: true,
};

/** Une ajustes guardados con los valores por defecto (y migra módulos antiguos: portfolio → savings). */
export function normalizeSettings(raw: Partial<Settings>): Settings {
  const m = (raw.modules ?? {}) as unknown as Record<string, boolean | undefined>;
  return { ...DEFAULT_SETTINGS, ...raw, modules: { calendar: m.calendar ?? true, routine: m.routine ?? true, notes: m.notes ?? true, savings: m.savings ?? m.portfolio ?? true } };
}

export interface Snapshotted {
  user: User | null;
  settings: Settings;
  tags: Tag[];
  tasks: Task[];
  events: CalEvent[];
  notes: Note[];
  routine: RoutineBlock[];
}

const toTask = (r: Row): Task => ({
  id: s(r.id),
  title: s(r.title),
  description: s(r.description),
  date: s(r.date),
  time: r.time === null ? null : s(r.time),
  important: b(r.important),
  done: b(r.done),
  doneAt: r.done_at === null ? null : n(r.done_at),
  createdAt: n(r.created_at),
});
const toEvent = (r: Row): CalEvent => ({
  id: s(r.id),
  title: s(r.title),
  description: s(r.description),
  date: s(r.date),
  start: s(r.start),
  end: s(r.end),
  allDay: b(r.all_day),
  color: s(r.color),
  important: b(r.important),
  recurring: b(r.recurring),
  repeat: r.repeat === null ? null : (s(r.repeat) as CalEvent["repeat"]),
  autoDeleteAfter: b(r.auto_delete_after),
  remind: r.remind_n === null ? null : { n: n(r.remind_n), unit: s(r.remind_unit) as "days" | "hours", freq: s(r.remind_freq) as "once" | "daily" },
});
const toNote = (r: Row): Note => ({
  id: s(r.id),
  title: s(r.title),
  body: s(r.body),
  tagId: r.tag_id === null ? null : s(r.tag_id),
  pinned: b(r.pinned),
  deletedAt: r.deleted_at === null ? null : n(r.deleted_at),
  updatedAt: n(r.updated_at),
});

export async function loadAll(db: SqlAdapter): Promise<Snapshotted> {
  const u = (await db.select("SELECT * FROM user WHERE id = 1"))[0];
  const st = (await db.select<{ json: string }>("SELECT json FROM settings WHERE id = 1"))[0];
  return {
    user: u ? { name: s(u.name), createdAt: n(u.created_at), onboardingDone: b(u.onboarding_done) } : null,
    settings: st ? normalizeSettings(JSON.parse(st.json) as Partial<Settings>) : DEFAULT_SETTINGS,
    tags: (await db.select("SELECT * FROM tags ORDER BY rowid")).map((r) => ({ id: s(r.id), name: s(r.name), color: s(r.color) })),
    tasks: (await db.select("SELECT * FROM tasks")).map(toTask),
    events: (await db.select("SELECT * FROM events")).map(toEvent),
    notes: (await db.select("SELECT * FROM notes")).map(toNote),
    routine: (await db.select("SELECT * FROM routine_blocks")).map((r) => ({
      id: s(r.id),
      title: s(r.title),
      day: n(r.day),
      start: s(r.start),
      end: s(r.end),
      color: s(r.color),
      everyWeeks: n(r.every_weeks),
    })),
  };
}

const i = (v: boolean) => (v ? 1 : 0);

export const repo = {
  saveUser: (db: SqlAdapter, u: User) =>
    db.execute(
      "INSERT INTO user (id,name,created_at,onboarding_done) VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, onboarding_done=excluded.onboarding_done",
      [u.name, u.createdAt, i(u.onboardingDone)],
    ),
  saveSettings: (db: SqlAdapter, v: Settings) => db.execute("INSERT INTO settings (id,json) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json", [JSON.stringify(v)]),
  saveTag: (db: SqlAdapter, t: Tag) =>
    db.execute("INSERT INTO tags (id,name,color) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color", [t.id, t.name, t.color]),
  deleteTag: (db: SqlAdapter, id: string) => db.execute("DELETE FROM tags WHERE id=?", [id]),
  saveTask: (db: SqlAdapter, t: Task) =>
    db.execute("INSERT OR REPLACE INTO tasks (id,title,description,date,time,important,done,done_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)", [
      t.id,
      t.title,
      t.description,
      t.date,
      t.time,
      i(t.important),
      i(t.done),
      t.doneAt,
      t.createdAt,
    ]),
  deleteTask: (db: SqlAdapter, id: string) => db.execute("DELETE FROM tasks WHERE id=?", [id]),
  saveEvent: (db: SqlAdapter, e: CalEvent) =>
    db.execute(
      'INSERT OR REPLACE INTO events (id,title,description,date,start,"end",all_day,color,important,recurring,repeat,auto_delete_after,remind_n,remind_unit,remind_freq) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        e.id,
        e.title,
        e.description,
        e.date,
        e.start,
        e.end,
        i(e.allDay),
        e.color,
        i(e.important),
        i(e.recurring),
        e.repeat,
        i(e.autoDeleteAfter),
        e.remind?.n ?? null,
        e.remind?.unit ?? null,
        e.remind?.freq ?? null,
      ],
    ),
  deleteEvent: (db: SqlAdapter, id: string) => db.execute("DELETE FROM events WHERE id=?", [id]),
  saveNote: (db: SqlAdapter, v: Note) =>
    db.execute("INSERT OR REPLACE INTO notes (id,title,body,tag_id,pinned,deleted_at,updated_at) VALUES (?,?,?,?,?,?,?)", [
      v.id,
      v.title,
      v.body,
      v.tagId,
      i(v.pinned),
      v.deletedAt,
      v.updatedAt,
    ]),
  deleteNote: (db: SqlAdapter, id: string) => db.execute("DELETE FROM notes WHERE id=?", [id]),
  saveRoutine: (db: SqlAdapter, r: RoutineBlock) =>
    db.execute('INSERT OR REPLACE INTO routine_blocks (id,title,day,start,"end",color,every_weeks) VALUES (?,?,?,?,?,?,?)', [
      r.id,
      r.title,
      r.day,
      r.start,
      r.end,
      r.color,
      r.everyWeeks,
    ]),
  deleteRoutine: (db: SqlAdapter, id: string) => db.execute("DELETE FROM routine_blocks WHERE id=?", [id]),
};
