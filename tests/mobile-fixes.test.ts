import { describe, expect, it } from "vitest";
import { buildNotifs } from "../src/domain/notifications";
import { ROUTINE_COLORS, routineColor, type CalEvent, type Task } from "../src/domain/types";
import { normalizeSettings } from "../src/db/repo";

const task = (id: string, date: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: "",
  date,
  time: null,
  important: false,
  done: false,
  doneAt: null,
  createdAt: 0,
  ...over,
});
const ev = (id: string, date: string, start: string, end: string, over: Partial<CalEvent> = {}): CalEvent => ({
  id,
  title: id,
  description: "",
  date,
  start,
  end,
  allDay: false,
  color: "#17b866",
  important: false,
  recurring: false,
  repeat: null,
  autoDeleteAfter: false,
  remind: null,
  ...over,
});

describe("notifications", () => {
  it("lists overdue tasks, events still ahead today and today's pending tasks, in that order", () => {
    const n = buildNotifs(
      [task("old", "2026-10-01"), task("done", "2026-10-01", { done: true }), task("today", "2026-10-04"), task("later", "2026-10-05")],
      [ev("past", "2026-10-04", "08:00", "09:00"), ev("next", "2026-10-04", "15:00", "16:00"), ev("tomorrow", "2026-10-05", "10:00", "11:00")],
      "2026-10-04",
      "12:00",
    );
    expect(n.map((x) => x.id)).toEqual(["old", "next", "today"]);
    expect(n[0].overdue).toBe(true);
  });
  it("is empty when there is nothing pending", () => {
    expect(buildNotifs([], [], "2026-10-04", "12:00")).toEqual([]);
  });
});

describe("routine colors", () => {
  it("never offers blue (events) or purple (tasks)", () => {
    expect(ROUTINE_COLORS).not.toContain("#4b7fd6");
    expect(ROUTINE_COLORS).not.toContain("#8a6fd6");
    expect(ROUTINE_COLORS.length).toBeGreaterThan(0);
  });
  it("maps a stored blue/purple to an allowed color and keeps the rest", () => {
    expect(ROUTINE_COLORS).toContain(routineColor("#4b7fd6"));
    expect(ROUTINE_COLORS).toContain(routineColor("#8a6fd6"));
    expect(routineColor("#c98a1e")).toBe("#c98a1e");
  });
});

describe("settings", () => {
  it("keeps reminders, sound and glass off and defaults the text size to medium", () => {
    const s = normalizeSettings({ reminders: true, sound: true, glass: true });
    expect([s.reminders, s.sound, s.glass, s.fontSize]).toEqual([false, false, false, "medium"]);
  });
  it("accepts a valid text size", () => {
    expect(normalizeSettings({ fontSize: "large" }).fontSize).toBe("large");
  });
});
