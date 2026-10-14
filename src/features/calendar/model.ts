/**
 * Calendario: tipos y reglas puras compartidas por las cuatro vistas (elementos de un día, meses, encabezados). Sin React.
 */
import { daysInMonth, fmtTime, fromISO, toISO, WEEKDAYS } from "../../domain/dates";
import { eventsOn } from "../../domain/logic";
import type { HHMM, ISODate } from "../../domain/types";
import { t } from "../../i18n";
import type { useData } from "../../store/data";
import { TASK_COLOR } from "./gridKit";

export type View = "MONTH" | "WEEK" | "DAY" | "YEAR";
export const VIEWS: View[] = ["MONTH", "WEEK", "DAY", "YEAR"];

export interface Item {
  key: string;
  kind: "event" | "task";
  id: string;
  title: string;
  color: string;
  allDay: boolean;
  start: HHMM;
  end: HHMM;
  important: boolean;
  recurring: boolean;
  done: boolean;
  meta: string;
}

export const SILK = "Silkscreen,monospace";
export const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (d: ISODate) => d.slice(0, 7);

export function shiftMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  t.setDate(Math.min(d.getDate(), daysInMonth(t.getFullYear(), t.getMonth())));
  return toISO(t);
}

export const dowHeaders = (ws: 0 | 1): string[] => {
  const base = WEEKDAYS.map((w) => w.slice(0, 3).toUpperCase());
  return ws === 1 ? [...base.slice(1), base[0]] : base;
};

export const rangeLabel = (it: Item, tf: "12h" | "24h"): string => {
  if (it.allDay) return t("All day");
  if (it.kind === "task") return fmtTime(it.start, tf);
  return `${fmtTime(it.start, tf)} — ${fmtTime(it.end, tf)}`;
};

export function itemsOn(events: ReturnType<typeof useData.getState>["events"], tasks: ReturnType<typeof useData.getState>["tasks"], day: ISODate): Item[] {
  const evs: Item[] = eventsOn(events, day).map((e) => ({
    key: `e:${e.id}:${day}`,
    kind: "event",
    id: e.id,
    title: e.title,
    color: e.color,
    allDay: e.allDay,
    start: e.start,
    end: e.end,
    important: e.important,
    recurring: e.recurring,
    done: false,
    meta: e.description.split("\n")[0] ?? "",
  }));
  const ts: Item[] = tasks
    .filter((t) => t.date === day)
    .map((t) => ({
      key: `t:${t.id}`,
      kind: "task",
      id: t.id,
      title: t.title,
      color: TASK_COLOR,
      allDay: t.time === null,
      start: t.time ?? "",
      end: "",
      important: t.important,
      recurring: false,
      done: t.done,
      meta: t.description.split("\n")[0] ?? "",
    }));
  return [...evs, ...ts].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
}

/** Column index of the 1st of a month given JS getDay() and week start (0 Sun / 1 Mon). */
export const startOfWeekOffset = (jsDay: number, ws: 0 | 1): number => (ws === 1 ? (jsDay + 6) % 7 : jsDay);
