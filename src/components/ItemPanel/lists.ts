/**
 * Lógica pura de las listas del panel: filtros, agrupación (VENCIDAS/HOY/MAÑANA…) y filas.
 * Las constantes quedan en inglés (clave i18n): las etiquetas se traducen al renderizar.
 */
import { diffDays, fmtTime, fromISO, MONTHS, relDay, toMin, addDays } from "../../domain/dates";
import { eventOccursOn, trashDaysLeft } from "../../domain/logic";
import type { CalEvent, ISODate, Note, Tag, Task } from "../../domain/types";
import type { PanelKind } from "../../store/ui";
import { t } from "../../i18n";

export interface Row {
  id: string;
  kind: PanelKind;
  title: string;
  due: string;
  snippet: string;
  important: boolean;
  pinned: boolean;
  done: boolean;
  trashed: boolean;
  accent: string;
  mon: string;
  day: number;
  group: string;
}
export interface Group {
  label: string;
  color: string;
  rows: Row[];
}

export const FILTERS: Record<PanelKind, ReadonlyArray<readonly [string, string]>> = {
  task: [
    ["all", "All"],
    ["today", "Today"],
    ["upcoming", "Upcoming"],
    ["done", "Done"],
  ],
  event: [
    ["all", "All"],
    ["today", "Today"],
    ["upcoming", "Upcoming"],
    ["past", "Past"],
  ],
  note: [
    ["all", "All"],
    ["pinned", "Pinned"],
    ["deleted", "Deleted"],
  ],
};

export const isPastEvent = (e: CalEvent, today: ISODate) => !e.recurring && e.date < today;

/** Next date the event happens (today or later) — the event's own date when it is not recurring. */
export function nextOccurrence(e: CalEvent, today: ISODate): ISODate {
  if (e.date >= today || !e.recurring) return e.date;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, i);
    if (eventOccursOn(e, d)) return d;
  }
  return e.date;
}

export function ago(ts: number, now = Date.now()): string {
  const m = Math.floor((now - ts) / 60_000);
  if (m < 1) return t("Just now");
  if (m < 60) return t("{m} min ago", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("{h} h ago", { h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("1 day ago") : t("{d} days ago", { d });
}

const dueGroup = (d: ISODate, today: ISODate): string => {
  const n = diffDays(d, today);
  return n < 0 ? "OVERDUE" : n === 0 ? "TODAY" : n === 1 ? "TOMORROW" : n <= 6 ? "THIS WEEK" : "LATER";
};
const groupColor = (g: string) => (g === "OVERDUE" ? "#a8443a" : g === "TODAY" || g === "PINNED" ? "#0b7a45" : "#65746d");

export interface Ctx {
  today: ISODate;
  q: string[];
  filter: string;
  timeFormat: "12h" | "24h";
  tags: Tag[];
}
const match = (q: string[], ...parts: string[]) => {
  if (q.length === 0) return true;
  const hay = parts.join(" ").toLowerCase();
  return q.every((x) => hay.includes(x));
};
const pack = (rows: Row[]): Group[] => {
  const out: Group[] = [];
  for (const r of rows) {
    let g = out.find((x) => x.label === r.group);
    if (!g) {
      g = { label: r.group, color: groupColor(r.group), rows: [] };
      out.push(g);
    }
    g.rows.push(r);
  }
  return out;
};
const blank = { snippet: "", important: false, pinned: false, done: false, trashed: false, mon: "", day: 0 };

export function taskRows(tasks: Task[], c: Ctx): Group[] {
  const key = (t: Task) => diffDays(t.date, "2000-01-01") * 1440 + (t.time ? toMin(t.time) : 1439);
  return pack(
    tasks
      .filter((t) => match(c.q, t.title, t.description))
      .filter((t) => (c.filter === "today" ? t.date === c.today && !t.done : c.filter === "upcoming" ? t.date > c.today && !t.done : c.filter === "done" ? t.done : true))
      .sort((a, b) => Number(a.done) - Number(b.done) || key(a) - key(b) || a.createdAt - b.createdAt)
      .map((tk): Row => ({
        ...blank,
        id: tk.id,
        kind: "task",
        title: tk.title || t("Untitled task"),
        snippet: tk.description,
        due: relDay(tk.date, c.today) + (tk.time ? ` · ${fmtTime(tk.time, c.timeFormat)}` : ""),
        important: tk.important && !tk.done,
        done: tk.done,
        accent: "#17b866",
        group: tk.done ? "DONE" : dueGroup(tk.date, c.today),
      })),
  );
}

export function eventRows(events: CalEvent[], c: Ctx): Group[] {
  const eff = (e: CalEvent) => nextOccurrence(e, c.today);
  const key = (e: CalEvent) => diffDays(eff(e), "2000-01-01") * 1440 + (e.allDay ? -1 : toMin(e.start));
  return pack(
    events
      .filter((e) => match(c.q, e.title, e.description))
      .filter((e) => {
        const past = isPastEvent(e, c.today);
        return c.filter === "today" ? eff(e) === c.today : c.filter === "upcoming" ? !past && eff(e) > c.today : c.filter === "past" ? past : true;
      })
      .sort((a, b) => Number(isPastEvent(a, c.today)) - Number(isPastEvent(b, c.today)) || key(a) - key(b))
      .map((e): Row => {
        const past = isPastEvent(e, c.today),
          d = eff(e),
          dt = fromISO(d);
        return {
          ...blank,
          id: e.id,
          kind: "event",
          title: e.title || t("Untitled event"),
          snippet: "",
          accent: e.color,
          due: relDay(d, c.today) + (e.allDay ? ` · ${t("All day")}` : ` · ${fmtTime(e.start, c.timeFormat)}`) + (e.recurring && e.repeat ? ` · ${t(e.repeat)}` : ""),
          important: e.important && !past,
          done: past,
          mon: MONTHS[dt.getMonth()].slice(0, 3).toUpperCase(),
          day: dt.getDate(),
          group: past ? "PAST" : dueGroup(d, c.today) === "OVERDUE" ? "LATER" : dueGroup(d, c.today),
        };
      }),
  );
}

export function noteRows(notes: Note[], c: Ctx): Group[] {
  const tagName = (id: string | null) => c.tags.find((t) => t.id === id)?.name ?? t("Note");
  const tagColor = (id: string | null) => c.tags.find((t) => t.id === id)?.color ?? "#5d6f67";
  const wantTrash = c.filter === "deleted";
  return pack(
    notes
      .filter((n) => (n.deletedAt !== null) === wantTrash)
      .filter((n) => match(c.q, n.title, n.body, tagName(n.tagId)))
      .filter((n) => (c.filter === "pinned" ? n.pinned : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .map((n): Row => ({
        ...blank,
        id: n.id,
        kind: "note",
        title: n.title.trim() || t("Untitled note"),
        snippet: n.body,
        due: n.deletedAt !== null ? t("Deletes in {n} days", { n: trashDaysLeft(n) }) : `${tagName(n.tagId)} · ${ago(n.updatedAt)}`,
        pinned: n.pinned,
        trashed: n.deletedAt !== null,
        accent: tagColor(n.tagId),
        group: n.deletedAt !== null ? "TRASH · KEPT 30 DAYS" : n.pinned ? "PINNED" : "NOTES",
      })),
  );
}
