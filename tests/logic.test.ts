import { describe, expect, it } from "vitest";
import { autoDeleteEvents, eventOccursOn, purgeTrash, removeTag, renameTag, sortTasks, trashDaysLeft } from "../src/domain/logic";
import { DAY_MS, type CalEvent, type Note, type Task } from "../src/domain/types";

const task = (o: Partial<Task>): Task => ({
  id: "t",
  title: "t",
  description: "",
  date: "2026-10-04",
  time: null,
  important: false,
  done: false,
  doneAt: null,
  createdAt: 1,
  ...o,
});
const note = (o: Partial<Note>): Note => ({ id: "n", title: "", body: "", tagId: null, pinned: false, deletedAt: null, updatedAt: 1, ...o });
const ev = (o: Partial<CalEvent>): CalEvent => ({
  id: "e",
  title: "e",
  description: "",
  date: "2026-10-04",
  start: "09:00",
  end: "10:00",
  allDay: false,
  color: "#17b866",
  important: false,
  recurring: false,
  repeat: null,
  autoDeleteAfter: false,
  remind: null,
  ...o,
});

describe("sortTasks", () => {
  it("orders by date/time, untimed last in the day, done at the end", () => {
    const r = sortTasks([
      task({ id: "done", done: true, date: "2026-10-01" }),
      task({ id: "later", date: "2026-10-06" }),
      task({ id: "untimed", date: "2026-10-04" }),
      task({ id: "timed", date: "2026-10-04", time: "13:30" }),
    ]).map((t) => t.id);
    expect(r).toEqual(["timed", "untimed", "later", "done"]);
  });
});

describe("trash purge", () => {
  const now = Date.UTC(2026, 9, 4);
  it("drops notes deleted more than 30 days ago and keeps the rest", () => {
    const kept = purgeTrash([note({ id: "live" }), note({ id: "old", deletedAt: now - 31 * DAY_MS }), note({ id: "recent", deletedAt: now - 5 * DAY_MS })], now).map((n) => n.id);
    expect(kept).toEqual(["live", "recent"]);
  });
  it("counts days left", () => expect(trashDaysLeft(note({ deletedAt: now - 5 * DAY_MS }), now)).toBe(25));
});

describe("events", () => {
  it("auto-deletes only past events flagged autoDeleteAfter", () => {
    const r = autoDeleteEvents(
      [ev({ id: "a", date: "2026-10-01", autoDeleteAfter: true }), ev({ id: "b", date: "2026-10-01" }), ev({ id: "c", date: "2026-10-05", autoDeleteAfter: true })],
      "2026-10-04",
    ).map((e) => e.id);
    expect(r).toEqual(["b", "c"]);
  });
  it("expands weekly/monthly/yearly repeats", () => {
    expect(eventOccursOn(ev({ recurring: true, repeat: "weekly" }), "2026-10-18")).toBe(true);
    expect(eventOccursOn(ev({ recurring: true, repeat: "weekly" }), "2026-10-19")).toBe(false);
    expect(eventOccursOn(ev({ recurring: true, repeat: "monthly" }), "2026-12-04")).toBe(true);
    expect(eventOccursOn(ev({ recurring: true, repeat: "yearly" }), "2027-10-04")).toBe(true);
  });
});

describe("tags", () => {
  it("rename changes the name only; notes keep pointing at the tag id", () => {
    const tags = renameTag([{ id: "x", name: "Old", color: "#000" }], "x", "New");
    expect(tags[0].name).toBe("New");
  });
  it("removing a tag untags its notes", () => {
    const r = removeTag([{ id: "x", name: "A", color: "#000" }], [note({ tagId: "x" })], "x");
    expect(r.tags).toHaveLength(0);
    expect(r.notes[0].tagId).toBeNull();
  });
});

describe("title limit", () => {
  it("TITLE_MAX is a sane positive number", async () => {
    const { TITLE_MAX } = await import("../src/domain/types");
    expect(TITLE_MAX).toBeGreaterThan(10);
  });
});

describe("calendar overlap layout", () => {
  it("caps simultaneous columns and reports how many blocks were hidden", async () => {
    const { layoutOverlap, MAX_COLS } = await import("../src/domain/timegrid");
    const items = Array.from({ length: 9 }, (_, i) => ({ id: i, sM: 600, eM: 660 }));
    const laid = layoutOverlap(items);
    expect(laid.every((l) => l.n <= MAX_COLS)).toBe(true);
    expect(laid.filter((l) => l.hidden)).toHaveLength(9 - MAX_COLS);
    expect(laid.reduce((s, l) => s + l.more, 0)).toBe(9 - MAX_COLS);
  });
  it("sequential blocks never share a column group", async () => {
    const { layoutOverlap } = await import("../src/domain/timegrid");
    const laid = layoutOverlap([
      { sM: 60, eM: 120 },
      { sM: 120, eM: 180 },
      { sM: 90, eM: 150 },
    ]);
    expect(Math.max(...laid.map((l) => l.n))).toBe(2);
  });
});
