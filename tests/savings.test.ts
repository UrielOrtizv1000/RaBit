import { describe, expect, it } from "vitest";
import {
  coverGoals,
  evalGoalForm,
  monthIndex,
  parseAmount,
  periodsUntil,
  planOf,
  sortGoals,
  streakOf,
  weekIndex,
  type GoalForm,
  type SavingsGoal,
  type SavingsMove,
} from "../src/domain/savings";

const WEEK = 7 * 86_400_000;
const NOW = new Date(2026, 9, 4, 12).getTime(); // domingo 4 de octubre de 2026
const goal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "g",
  name: "G",
  target: 1000,
  saved: 0,
  color: "#17b866",
  freq: "week",
  n: 10,
  start: weekIndex(NOW),
  important: false,
  deadline: null,
  eventId: null,
  ...over,
});
const mv = (amt: number, at: number, goalId = "g"): SavingsMove => ({ id: `${amt}-${at}`, goalId, amt, at });

describe("weeks and months", () => {
  it("a week runs Monday–Sunday", () => {
    expect(weekIndex(new Date(2026, 9, 4, 23))).toBe(weekIndex(new Date(2026, 9, 1))); // Thu and Sun, same week
    expect(weekIndex(new Date(2026, 9, 5))).toBe(weekIndex(new Date(2026, 9, 4)) + 1); // Monday starts a new one
    expect(monthIndex(new Date(2026, 11, 31))).toBe(monthIndex(new Date(2027, 0, 1)) - 1);
  });
});

describe("plan", () => {
  it("splits what is left evenly over the remaining periods", () => {
    const p = planOf(goal(), [], NOW);
    expect(p.rem).toBe(10);
    expect(p.now).toBeCloseTo(100);
  });
  it("recalculates the remaining weeks after skipping some", () => {
    const g = goal({ start: weekIndex(NOW) - 2, saved: 0 }); // 3rd week of 10
    const p = planOf(g, [], NOW);
    expect(p.rem).toBe(8);
    expect(p.now).toBeCloseTo(125);
    expect(p.next).toBeCloseTo(1000 / 7);
  });
  it("this week's deposits do not change this week's target", () => {
    const g = goal({ saved: 100 });
    const p = planOf(g, [mv(100, NOW)], NOW);
    expect(p.dThis).toBe(100);
    expect(p.now).toBeCloseTo(100); // (1000 - (100 - 100)) / 10
  });
  it("a goal without a plan is flagged free and done when full", () => {
    expect(planOf(goal({ freq: "none", n: 0 }), [], NOW).free).toBe(true);
    expect(planOf(goal({ saved: 1000 }), [], NOW).done).toBe(true);
  });
});

describe("streak", () => {
  it("counts consecutive weeks with a deposit; an empty current week does not break it", () => {
    const moves = [mv(10, NOW - WEEK), mv(10, NOW - 2 * WEEK), mv(10, NOW - 4 * WEEK)];
    const s = streakOf(moves, NOW);
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
    expect(s.weeks).toHaveLength(12);
    expect(s.weeks[11].current).toBe(true);
  });
  it("withdrawals do not count as a saving week", () => {
    expect(streakOf([mv(-50, NOW)], NOW).current).toBe(0);
  });
});

describe("ordering and calculator", () => {
  it("important first, completed last, ties keep creation order — except the one being celebrated", () => {
    const a = goal({ id: "a" });
    const b = goal({ id: "b", important: true });
    const c = goal({ id: "c", saved: 1000 });
    const plans = new Map([a, b, c].map((g) => [g.id, planOf(g, [], NOW)]));
    expect(sortGoals([a, c, b], plans, null).map((g) => g.id)).toEqual(["b", "a", "c"]);
    expect(sortGoals([c, a], plans, null).map((g) => g.id)).toEqual(["a", "c"]);
    expect(sortGoals([c, a], plans, "c").map((g) => g.id)).toEqual(["c", "a"]); // la que se celebra no salta al final todavía
  });
  it("spreads a pool over pending goals in order", () => {
    const r = coverGoals(
      [
        { name: "A", color: "#000", left: 100 },
        { name: "B", color: "#000", left: 300 },
      ],
      250,
    );
    expect(r.map((x) => Math.round(x.pct))).toEqual([100, 50]);
  });
  it("parses typed amounts", () => {
    expect(parseAmount("$1,200.50")).toBe(1200.5);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("goal form", () => {
  const base: GoalForm = { id: null, name: "Bike", target: "1200", mode: "date", freq: "week", deadline: "2026-12-27", n: "", per: "", color: "#17b866", important: false };
  it("a past or missing deadline is reported", () => {
    expect(evalGoalForm({ ...base, deadline: "2026-10-01" }, 0, NOW).missing).toContain("date");
    expect(evalGoalForm({ ...base, deadline: "" }, 0, NOW).ok).toBe(false);
  });
  it("counts the weeks and months until a deadline", () => {
    expect(periodsUntil("2026-10-05", "week", NOW)).toBe(1);
    expect(periodsUntil("2026-12-27", "week", NOW)).toBe(12);
    expect(periodsUntil("2027-01-04", "month", NOW)).toBe(3);
    expect(periodsUntil("2026-10-04", "week", NOW)).toBe(0);
  });
  it("deadline mode computes the amount per period", () => {
    const r = evalGoalForm(base, 0, NOW);
    expect(r.ok).toBe(true);
    expect(r.perPeriod).toBeCloseTo(100);
  });
  it("'what I can save' mode computes how many periods it takes", () => {
    const r = evalGoalForm({ ...base, mode: "amount", per: "250" }, 0, NOW);
    expect(r.n).toBe(5);
    expect(r.kind).toBe("reach");
  });
  it("reports what is missing", () => {
    const r = evalGoalForm({ ...base, name: " ", target: "" }, 0, NOW);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["name", "amount"]);
  });
});
