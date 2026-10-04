/**
 * Store principal (Zustand): estado de la app + acciones que escriben en SQLite (escritura directa, sin cola).
 * Normaliza la entrada antes de guardar: títulos (vacío si solo espacios, máx. TITLE_MAX) y rangos de evento válidos.
 */
import { create } from "zustand";
import type { SqlAdapter } from "../db/adapter";
import { t } from "../i18n";
import { DEFAULT_SETTINGS, loadAll, normalizeSettings, repo } from "../db/repo";
import { autoDeleteEvents, purgeTrash, removeTag, renameTag } from "../domain/logic";
import { fromMin, todayISO, toMin } from "../domain/dates";
import { TITLE_MAX, type CalEvent, type Note, type RoutineBlock, type Settings, type Tag, type Task, type User } from "../domain/types";

/** Títulos: solo-espacios → vacío (así se muestra "Untitled…") y máximo TITLE_MAX caracteres. */
const clipTitle = <T extends { title?: string }>(o: T): T => {
  if (typeof o.title !== "string") return o;
  const title = o.title.trim() === "" ? "" : o.title.slice(0, TITLE_MAX);
  return title === o.title ? o : { ...o, title };
};

/** Un evento no puede terminar antes de empezar: se ajusta a 1 h después (máx. 23:59). */
const fixRange = (e: CalEvent): CalEvent => (!e.allDay && toMin(e.end) < toMin(e.start) ? { ...e, end: fromMin(Math.min(toMin(e.start) + 60, 23 * 60 + 59)) } : e);

export const uid = (): string => crypto.randomUUID();

export interface BackupFile {
  app: "rabit";
  version: 1;
  exportedAt: number;
  user: User | null;
  settings: Settings;
  tags: Tag[];
  tasks: Task[];
  events: CalEvent[];
  notes: Note[];
  routine: RoutineBlock[];
}

interface DataState {
  db: SqlAdapter | null;
  ready: boolean;
  user: User | null;
  settings: Settings;
  tags: Tag[];
  tasks: Task[];
  events: CalEvent[];
  notes: Note[];
  routine: RoutineBlock[];

  init: (db: SqlAdapter, now?: Date) => Promise<void>;
  runMaintenance: (now?: Date) => Promise<void>;

  completeOnboarding: (name: string, modules: Settings["modules"]) => Promise<void>;
  setName: (name: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  addTask: (t: Partial<Task> & { title: string }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteDoneTasks: () => Promise<void>;

  addEvent: (e: Partial<CalEvent> & { title: string; date: string }) => Promise<CalEvent>;
  updateEvent: (id: string, patch: Partial<CalEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deletePastEvents: () => Promise<void>;

  addNote: (n?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  purgeNote: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;

  addTag: (name: string, color: string) => Promise<Tag>;
  editTag: (id: string, patch: Partial<Pick<Tag, "name" | "color">>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  addRoutine: (r: Partial<RoutineBlock> & { title: string; day: number }) => Promise<RoutineBlock>;
  updateRoutine: (id: string, patch: Partial<RoutineBlock>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;

  exportAll: () => BackupFile;
  importAll: (b: BackupFile) => Promise<void>;
}

const need = (db: SqlAdapter | null): SqlAdapter => {
  if (!db) throw new Error("DB no inicializada");
  return db;
};
const DEFAULT_TAGS: Pick<Tag, "name" | "color">[] = [
  { name: "Ideas", color: "#17b866" },
  { name: "Study", color: "#4b7fd6" },
  { name: "Shopping", color: "#c98a1e" },
];

export const useData = create<DataState>((set, get) => ({
  db: null,
  ready: false,
  user: null,
  settings: DEFAULT_SETTINGS,
  tags: [],
  tasks: [],
  events: [],
  notes: [],
  routine: [],

  async init(db, now = new Date()) {
    const snap = await loadAll(db);
    if (snap.tags.length === 0 && snap.user === null) {
      for (const tg of DEFAULT_TAGS) await repo.saveTag(db, { id: uid(), name: t(tg.name), color: tg.color });
      snap.tags = (await loadAll(db)).tags;
    }
    set({ db, ready: true, ...snap });
    await get().runMaintenance(now);
  },

  /** Purga papelera > 30 días y borra eventos "delete after event" vencidos. */
  async runMaintenance(now = new Date()) {
    const db = need(get().db);
    const { notes, events } = get();
    const keptNotes = purgeTrash(notes, now.getTime());
    for (const n of notes) if (!keptNotes.includes(n)) await repo.deleteNote(db, n.id);
    const keptEvents = autoDeleteEvents(events, todayISO(now));
    for (const e of events) if (!keptEvents.includes(e)) await repo.deleteEvent(db, e.id);
    set({ notes: keptNotes, events: keptEvents });
  },

  async completeOnboarding(name, modules) {
    const db = need(get().db);
    const user: User = { name: name.trim(), createdAt: Date.now(), onboardingDone: true };
    const settings = { ...get().settings, modules };
    await repo.saveUser(db, user);
    await repo.saveSettings(db, settings);
    set({ user, settings });
  },
  async setName(name) {
    const db = need(get().db);
    const user: User = { ...(get().user ?? { createdAt: Date.now(), onboardingDone: true }), name };
    await repo.saveUser(db, user);
    set({ user });
  },
  async updateSettings(patch) {
    const db = need(get().db);
    const settings = { ...get().settings, ...patch };
    await repo.saveSettings(db, settings);
    set({ settings });
  },

  async addTask(t) {
    const task: Task = { id: uid(), description: "", date: todayISO(), time: null, important: false, done: false, doneAt: null, createdAt: Date.now(), ...clipTitle(t) };
    await repo.saveTask(need(get().db), task);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },
  async updateTask(id, patch) {
    const cur = get().tasks.find((t) => t.id === id);
    if (!cur) return;
    const next = { ...cur, ...clipTitle(patch) };
    await repo.saveTask(need(get().db), next);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? next : t)) }));
  },
  async toggleTask(id) {
    const cur = get().tasks.find((t) => t.id === id);
    if (!cur) return;
    await get().updateTask(id, { done: !cur.done, doneAt: cur.done ? null : Date.now() });
  },
  async deleteTask(id) {
    await repo.deleteTask(need(get().db), id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  async deleteDoneTasks() {
    const db = need(get().db);
    for (const t of get().tasks.filter((x) => x.done)) await repo.deleteTask(db, t.id);
    set((s) => ({ tasks: s.tasks.filter((t) => !t.done) }));
  },

  async addEvent(e) {
    const ev: CalEvent = fixRange({
      id: uid(),
      description: "",
      start: "09:00",
      end: "10:00",
      allDay: false,
      color: "#17b866",
      important: false,
      recurring: false,
      repeat: null,
      autoDeleteAfter: false,
      remind: null,
      ...clipTitle(e),
    });
    await repo.saveEvent(need(get().db), ev);
    set((s) => ({ events: [...s.events, ev] }));
    return ev;
  },
  async updateEvent(id, patch) {
    const cur = get().events.find((x) => x.id === id);
    if (!cur) return;
    const next = fixRange({ ...cur, ...clipTitle(patch) });
    await repo.saveEvent(need(get().db), next);
    set((s) => ({ events: s.events.map((x) => (x.id === id ? next : x)) }));
  },
  async deleteEvent(id) {
    await repo.deleteEvent(need(get().db), id);
    set((s) => ({ events: s.events.filter((x) => x.id !== id) }));
  },
  async deletePastEvents() {
    const db = need(get().db),
      today = todayISO();
    const past = get().events.filter((e) => !e.recurring && e.date < today);
    for (const e of past) await repo.deleteEvent(db, e.id);
    set((s) => ({ events: s.events.filter((e) => !past.includes(e)) }));
  },

  async addNote(n = {}) {
    const note: Note = { id: uid(), title: "", body: "", tagId: null, pinned: false, deletedAt: null, updatedAt: Date.now(), ...clipTitle(n) };
    await repo.saveNote(need(get().db), note);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },
  async updateNote(id, patch) {
    const cur = get().notes.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...clipTitle(patch), updatedAt: Date.now() };
    await repo.saveNote(need(get().db), next);
    set((s) => ({ notes: s.notes.map((x) => (x.id === id ? next : x)) }));
  },
  async trashNote(id) {
    await get().updateNote(id, { deletedAt: Date.now(), pinned: false });
  },
  async restoreNote(id) {
    await get().updateNote(id, { deletedAt: null });
  },
  async purgeNote(id) {
    await repo.deleteNote(need(get().db), id);
    set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
  },
  async emptyTrash() {
    const db = need(get().db);
    for (const n of get().notes.filter((x) => x.deletedAt !== null)) await repo.deleteNote(db, n.id);
    set((s) => ({ notes: s.notes.filter((x) => x.deletedAt === null) }));
  },

  async addTag(name, color) {
    const tag: Tag = { id: uid(), name, color };
    await repo.saveTag(need(get().db), tag);
    set((s) => ({ tags: [...s.tags, tag] }));
    return tag;
  },
  async editTag(id, patch) {
    const db = need(get().db);
    let tags = get().tags;
    if (patch.name !== undefined) tags = renameTag(tags, id, patch.name); // las notas referencian por id: el renombrado se propaga solo
    if (patch.color !== undefined) tags = tags.map((t) => (t.id === id ? { ...t, color: patch.color as string } : t));
    const t = tags.find((x) => x.id === id);
    if (t) await repo.saveTag(db, t);
    set({ tags });
  },
  async deleteTag(id) {
    const db = need(get().db);
    const r = removeTag(get().tags, get().notes, id);
    await repo.deleteTag(db, id);
    set({ tags: r.tags, notes: r.notes });
  },

  async addRoutine(r) {
    const b: RoutineBlock = { id: uid(), start: "09:00", end: "10:00", color: "#17b866", everyWeeks: 1, ...clipTitle(r) };
    await repo.saveRoutine(need(get().db), b);
    set((s) => ({ routine: [...s.routine, b] }));
    return b;
  },
  async updateRoutine(id, patch) {
    const cur = get().routine.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...clipTitle(patch) };
    await repo.saveRoutine(need(get().db), next);
    set((s) => ({ routine: s.routine.map((x) => (x.id === id ? next : x)) }));
  },
  async deleteRoutine(id) {
    await repo.deleteRoutine(need(get().db), id);
    set((s) => ({ routine: s.routine.filter((x) => x.id !== id) }));
  },

  exportAll() {
    const s = get();
    return {
      app: "rabit",
      version: 1,
      exportedAt: Date.now(),
      user: s.user,
      settings: s.settings,
      tags: s.tags,
      tasks: s.tasks,
      events: s.events,
      notes: s.notes,
      routine: s.routine,
    };
  },
  async importAll(b) {
    if (b.app !== "rabit") throw new Error("Not a RaBit backup");
    const db = need(get().db);
    for (const t of ["notes", "tasks", "events", "routine_blocks", "tags", "kv"]) await db.execute(`DELETE FROM ${t}`);
    if (b.user) await repo.saveUser(db, b.user);
    await repo.saveSettings(db, normalizeSettings(b.settings));
    for (const t of b.tags) await repo.saveTag(db, t);
    for (const t of b.tasks) await repo.saveTask(db, t);
    for (const e of b.events) await repo.saveEvent(db, e);
    for (const n of b.notes) await repo.saveNote(db, n);
    for (const r of b.routine) await repo.saveRoutine(db, r);
    set({ user: b.user, settings: normalizeSettings(b.settings), tags: b.tags, tasks: b.tasks, events: b.events, notes: b.notes, routine: b.routine });
  },
}));
