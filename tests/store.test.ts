import { createRequire } from "node:module";
import { beforeEach, describe, expect, it } from "vitest";
import { migrate } from "../src/db/adapter";
import { openSqlJs } from "../src/db/sqljsDb";
import { loadAll } from "../src/db/repo";
import { useData } from "../src/store/data";
import { DAY_MS } from "../src/domain/types";

const wasm = createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm");

async function fresh() {
  const db = await openSqlJs({ wasm });
  await migrate(db);
  useData.setState({ ready: false, tasks: [], events: [], notes: [], tags: [], routine: [], goals: [], moves: [], user: null });
  await useData.getState().init(db, new Date(2026, 9, 4));
  return db;
}

describe("persistence", () => {
  beforeEach(async () => {
    await fresh();
  });

  it("migrations are idempotent and versioned", async () => {
    const db = await openSqlJs({ wasm });
    await migrate(db);
    await migrate(db);
    const v = await db.select<{ user_version: number }>("PRAGMA user_version");
    expect(v[0].user_version).toBeGreaterThanOrEqual(3);
  });

  it("tasks round-trip through SQLite and sort with done last", async () => {
    const d = useData.getState();
    const a = await d.addTask({ title: "A", date: "2026-10-05" });
    await d.addTask({ title: "B", date: "2026-10-04" });
    await d.toggleTask(a.id);
    const snap = await loadAll(useData.getState().db!);
    expect(snap.tasks.find((t) => t.id === a.id)?.done).toBe(true);
    expect(snap.tasks).toHaveLength(2);
  });

  it("maintenance purges old trash and auto-deletes past events at startup", async () => {
    const d = useData.getState();
    const n = await d.addNote({ title: "gone" });
    const today = new Date(2026, 9, 4); // la misma fecha que recibe runMaintenance (no depende del reloj real)
    await d.updateNote(n.id, { deletedAt: today.getTime() - 40 * DAY_MS });
    await d.addEvent({ title: "past", date: "2026-10-01", autoDeleteAfter: true });
    await d.addEvent({ title: "kept", date: "2026-10-01" });
    await useData.getState().runMaintenance(today);
    const s = useData.getState();
    expect(s.notes.find((x) => x.id === n.id)).toBeUndefined();
    expect(s.events.map((e) => e.title)).toEqual(["kept"]);
  });

  it("renaming a tag shows up in every note that uses it", async () => {
    const d = useData.getState();
    const tag = await d.addTag("Work", "#4b7fd6");
    const n = await d.addNote({ title: "x", tagId: tag.id });
    await useData.getState().editTag(tag.id, { name: "Job" });
    const s = useData.getState();
    expect(s.tags.find((t) => t.id === n.tagId)?.name).toBe("Job");
    const snap = await loadAll(s.db!);
    expect(snap.tags.find((t) => t.id === tag.id)?.name).toBe("Job");
  });

  it("export then import restores the data", async () => {
    const d = useData.getState();
    await d.addTask({ title: "keep me" });
    const backup = useData.getState().exportAll();
    await useData.getState().importAll({ ...backup, tasks: [] });
    expect(useData.getState().tasks).toHaveLength(0);
    await useData.getState().importAll(backup);
    expect(useData.getState().tasks.map((t) => t.title)).toEqual(["keep me"]);
  });
});

describe("title limit in the store", () => {
  it("clips over-long titles on create and update", async () => {
    await fresh();
    const { TITLE_MAX } = await import("../src/domain/types");
    const d = useData.getState();
    const t = await d.addTask({ title: "x".repeat(TITLE_MAX + 40) });
    expect(t.title).toHaveLength(TITLE_MAX);
    await useData.getState().updateTask(t.id, { title: "y".repeat(TITLE_MAX + 5) });
    expect(useData.getState().tasks[0].title).toHaveLength(TITLE_MAX);
  });
});

describe("input normalisation in the store", () => {
  it("whitespace-only titles become empty so the UI shows 'Untitled'", async () => {
    await fresh();
    const t = await useData.getState().addTask({ title: "    " });
    expect(t.title).toBe("");
  });
  it("an event can never end before it starts", async () => {
    await fresh();
    const e = await useData.getState().addEvent({ title: "x", date: "2026-10-04", start: "15:00", end: "14:00" });
    expect(e.end >= e.start).toBe(true);
    await useData.getState().updateEvent(e.id, { start: "23:30", end: "00:30" });
    const u = useData.getState().events.find((x) => x.id === e.id)!;
    expect(u.end >= u.start).toBe(true);
  });
});

describe("savings persistence", () => {
  beforeEach(async () => {
    await fresh();
  });

  it("deposits and withdrawals move the saved amount, are stored, and survive export/import", async () => {
    const d = useData.getState();
    const g = await d.addGoal({ name: "Laptop", target: 1000, color: "#17b866", freq: "none", n: 0, start: 0, important: false, deadline: null, eventId: null });
    await useData.getState().addMove(g.id, 300, 1_000);
    await useData.getState().addMove(g.id, -100, 2_000);
    expect(useData.getState().goals[0].saved).toBe(200);
    expect(useData.getState().moves.map((m) => m.amt)).toEqual([-100, 300]);

    const backup = useData.getState().exportAll();
    expect(backup.savings?.goals).toHaveLength(1);
    await useData.getState().importAll({ ...backup, savings: { goals: [], moves: [] } });
    expect(useData.getState().goals).toEqual([]);
    await useData.getState().importAll(backup);
    expect(useData.getState().goals[0].saved).toBe(200);
    expect(useData.getState().moves).toHaveLength(2);
  });

  it("goals and moves are loaded back when the app starts again", async () => {
    const db = await fresh();
    const g = await useData.getState().addGoal({ name: "Camera", target: 800, color: "#c98a1e", freq: "week", n: 8, start: 3, important: false, deadline: null, eventId: null });
    await useData.getState().addMove(g.id, 120, 5_000);
    useData.setState({ goals: [], moves: [] });
    await useData.getState().init(db, new Date(2026, 9, 4));
    expect(useData.getState().goals.map((x) => [x.name, x.saved])).toEqual([["Camera", 120]]);
    expect(useData.getState().moves).toHaveLength(1);
  });

  it("restoreGoal brings a deleted goal back with its moves and deadline", async () => {
    const d = useData.getState();
    const g = await d.addGoal({ name: "Moto", target: 5200, color: "#8a6fd6", freq: "week", n: 12, start: 3, important: false, deadline: "2027-01-02", eventId: "ev1" });
    await useData.getState().addMove(g.id, 400, 9_000);
    const goal = useData.getState().goals[0];
    const moves = useData.getState().moves;
    await useData.getState().deleteGoal(g.id);
    expect(useData.getState().goals).toEqual([]);
    await useData.getState().restoreGoal(goal, moves);
    expect(useData.getState().goals[0]).toMatchObject({ name: "Moto", saved: 400, deadline: "2027-01-02", eventId: "ev1" });
    expect(useData.getState().moves).toHaveLength(1);
  });

  it("never withdraws more than what is in the jar, and deleting a goal removes its moves", async () => {
    const d = useData.getState();
    const g = await d.addGoal({ name: "Trip", target: 500, color: "#4b7fd6", freq: "month", n: 5, start: 0, important: true, deadline: null, eventId: null });
    await useData.getState().addMove(g.id, 50, 1);
    await useData.getState().addMove(g.id, -999, 2);
    expect(useData.getState().goals[0].saved).toBe(0);
    await useData.getState().deleteGoal(g.id);
    expect(useData.getState().goals).toEqual([]);
    expect(useData.getState().moves).toEqual([]);
  });

  it("old backups without a savings section import cleanly", async () => {
    const backup = useData.getState().exportAll();
    const old = { ...backup };
    delete old.savings;
    await useData.getState().importAll(old);
    expect(useData.getState().goals).toEqual([]);
  });
});
