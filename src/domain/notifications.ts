/** Avisos de la campana, derivados de los datos (sin estado propio): tareas vencidas o de hoy y eventos de hoy que no terminaron. */
import type { CalEvent, HHMM, ISODate, Task } from "./types";
import { eventsOn, sortTasks } from "./logic";

export interface Notif {
  key: string;
  kind: "task" | "event";
  id: string;
  title: string;
  /** ISO del día del ítem (las tareas vencidas son de un día anterior) */
  date: ISODate;
  time: HHMM | null;
  allDay: boolean;
  overdue: boolean;
}

export const NOTIF_MAX = 8;

export function buildNotifs(tasks: Task[], events: CalEvent[], today: ISODate, nowHHMM: HHMM): Notif[] {
  const late = sortTasks(tasks.filter((x) => !x.done && x.date < today)).map((x): Notif => ({
    key: `t:${x.id}`,
    kind: "task",
    id: x.id,
    title: x.title,
    date: x.date,
    time: x.time,
    allDay: false,
    overdue: true,
  }));
  const evs = eventsOn(events, today)
    .filter((e) => e.allDay || e.end >= nowHHMM)
    .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1))
    .map((e): Notif => ({ key: `e:${e.id}`, kind: "event", id: e.id, title: e.title, date: today, time: e.allDay ? null : e.start, allDay: e.allDay, overdue: false }));
  const tod = sortTasks(tasks.filter((x) => !x.done && x.date === today)).map((x): Notif => ({
    key: `t:${x.id}`,
    kind: "task",
    id: x.id,
    title: x.title,
    date: today,
    time: x.time,
    allDay: false,
    overdue: false,
  }));
  return [...late, ...evs, ...tod];
}
