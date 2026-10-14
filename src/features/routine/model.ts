/**
 * Routine: modelo y reglas puras de la página (elementos por día, choques, grupos de bloques, horario de vigilia). Sin React.
 */
import { fromISO, fromMin, MONTHS, toMin, WEEKDAYS } from "../../domain/dates";
import { eventsOn, routineOccursOn } from "../../domain/logic";
import { routineColor, type HHMM, type ISODate, type RoutineBlock } from "../../domain/types";
import { minutesRange } from "../../domain/timegrid";
import { logWarn } from "../../lib/log";
import type { useData } from "../../store/data";
import { TASK_COLOR } from "../calendar/gridKit";

/** Routine blocks with everyWeeks > 1 count weeks from this fixed Monday. */
export const ANCHOR: ISODate = "2024-01-01";
export const DAY_KEY = "rabit.routine.day";
export const SILK = "Silkscreen,monospace";
/** Day names are locale-aware (WEEKDAYS is mutated on language change): read them at render time. */
export const dow3 = (): string[] => WEEKDAYS.map((w) => w.slice(0, 3).toUpperCase()); // by JS getDay()
export const routineDays = (): string[] => [1, 2, 3, 4, 5, 6, 0].map((i) => WEEKDAYS[i].slice(0, 3).toUpperCase()); // RoutineBlock.day 0..6
export const routineDayFull = (i: number): string => WEEKDAYS[(i + 1) % 7];

export interface DaySettings {
  wake: HHMM;
  bed: HHMM;
}
export const DEFAULT_DAY: DaySettings = { wake: "06:30", bed: "23:30" };

export function loadDay(): DaySettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DAY_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const r = raw as Partial<DaySettings>;
      const ok = (t: unknown): t is HHMM => typeof t === "string" && /^\d{2}:\d{2}$/.test(t);
      if (ok(r.wake) && ok(r.bed) && toMin(r.bed) > toMin(r.wake)) return { wake: r.wake, bed: r.bed };
    }
  } catch (e) {
    logWarn("routine.day.load", e);
  }
  return DEFAULT_DAY;
}
export function saveDay(d: DaySettings): void {
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(d));
  } catch (e) {
    logWarn("routine.day.save", e);
  }
}

export interface RItem {
  key: string;
  kind: "routine" | "event" | "task";
  id: string;
  title: string;
  color: string;
  sM: number;
  eM: number;
  block?: RoutineBlock;
}
export interface Clash {
  routineId: string;
  routine: string;
  cal: string;
  date: ISODate;
  min: number;
}

export const dayOfRoutine = (d: ISODate): number => (fromISO(d).getDay() + 6) % 7;
export const shortDate = (d: ISODate): string => {
  const x = fromISO(d);
  return `${MONTHS[x.getMonth()].slice(0, 3).toUpperCase()} ${x.getDate()}`;
};

export function itemsFor(
  date: ISODate,
  routine: RoutineBlock[],
  events: ReturnType<typeof useData.getState>["events"],
  tasks: ReturnType<typeof useData.getState>["tasks"],
): RItem[] {
  const out: RItem[] = [];
  for (const r of routine) {
    if (!routineOccursOn(r, date, ANCHOR)) continue;
    const { sM, eM } = minutesRange(r.start, r.end);
    out.push({ key: `r:${r.id}:${date}`, kind: "routine", id: r.id, title: r.title, color: routineColor(r.color), sM, eM, block: r });
  }
  for (const e of eventsOn(events, date)) {
    if (e.allDay) continue;
    const { sM, eM } = minutesRange(e.start, e.end);
    out.push({ key: `e:${e.id}:${date}`, kind: "event", id: e.id, title: e.title, color: e.color, sM, eM });
  }
  for (const t of tasks) {
    if (t.date !== date || !t.time || t.done) continue;
    const { sM, eM } = minutesRange(t.time, "");
    out.push({ key: `t:${t.id}`, kind: "task", id: t.id, title: t.title, color: TASK_COLOR, sM, eM });
  }
  return out;
}

export const overlaps = (a: RItem, b: RItem): number => Math.min(a.eM, b.eM) - Math.max(a.sM, b.sM);

export function clashesOf(date: ISODate, list: RItem[]): Clash[] {
  const out: Clash[] = [];
  for (const r of list) {
    if (r.kind !== "routine") continue;
    for (const c of list) {
      if (c.kind === "routine") continue;
      const m = overlaps(r, c);
      if (m > 0) out.push({ routineId: r.id, routine: r.title, cal: c.title, date, min: m });
    }
  }
  return out;
}

/** Siblings = blocks created together (same title/time/color/frequency, different days). */
export const groupOf = (b: RoutineBlock, all: RoutineBlock[]): RoutineBlock[] =>
  all.filter((x) => x.title === b.title && x.start === b.start && x.end === b.end && x.color === b.color && x.everyWeeks === b.everyWeeks);

export const timeOptions = (current: HHMM): HHMM[] => {
  const set = new Set<HHMM>();
  for (let m = 0; m < 1440; m += 15) set.add(fromMin(m));
  set.add("23:59");
  set.add(current);
  return [...set].sort();
};

export interface Draft {
  mode: "add" | "edit";
  ids: string[];
  title: string;
  start: HHMM;
  end: HHMM;
  color: string;
  days: number[];
  every: number;
}
