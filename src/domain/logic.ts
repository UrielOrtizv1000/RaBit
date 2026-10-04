/**
 * Reglas de negocio puras (sin React ni base de datos), todas cubiertas por tests:
 * orden de tareas, purga de papelera (30 días), borrado automático de eventos, repeticiones y recordatorios.
 */
import { addDays, addMonths, diffDays, dow, fromISO, toISO, toMin } from "./dates";
import { DAY_MS, TRASH_DAYS, type CalEvent, type ISODate, type Note, type RoutineBlock, type Tag, type Task } from "./types";

/** Pendientes primero (por fecha y hora; sin hora al final del día); hechas al final. */
export function sortTasks(tasks: Task[]): Task[] {
  const key = (t: Task) => diffDays(t.date, "2000-01-01") * 1440 + (t.time ? toMin(t.time) : 1439);
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || key(a) - key(b) || a.createdAt - b.createdAt);
}

/** Notas que siguen vivas tras purgar la papelera (> 30 días). */
export function purgeTrash(notes: Note[], now: number = Date.now()): Note[] {
  const cut = now - TRASH_DAYS * DAY_MS;
  return notes.filter((n) => n.deletedAt === null || n.deletedAt > cut);
}

export const trashDaysLeft = (n: Note, now: number = Date.now()): number =>
  n.deletedAt === null ? TRASH_DAYS : Math.max(0, Math.ceil((n.deletedAt + TRASH_DAYS * DAY_MS - now) / DAY_MS));

/** Elimina eventos "delete after event" cuya fecha ya pasó. */
export function autoDeleteEvents(events: CalEvent[], today: ISODate): CalEvent[] {
  return events.filter((e) => !(e.autoDeleteAfter && e.date < today));
}

/** Renombrar una etiqueta se propaga a las notas por id: solo cambia el nombre. */
export function renameTag(tags: Tag[], id: string, name: string): Tag[] {
  return tags.map((t) => (t.id === id ? { ...t, name } : t));
}

/** Al borrar una etiqueta, sus notas quedan sin etiqueta. */
export function removeTag(tags: Tag[], notes: Note[], id: string): { tags: Tag[]; notes: Note[] } {
  return { tags: tags.filter((t) => t.id !== id), notes: notes.map((n) => (n.tagId === id ? { ...n, tagId: null } : n)) };
}

/** ¿El evento (con repetición) ocurre en `day`? */
export function eventOccursOn(e: CalEvent, day: ISODate): boolean {
  if (e.date === day) return true;
  if (!e.recurring || !e.repeat || day < e.date) return false;
  const a = fromISO(e.date),
    b = fromISO(day);
  if (e.repeat === "weekly") return diffDays(day, e.date) % 7 === 0;
  if (e.repeat === "monthly") return a.getDate() === b.getDate();
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

export const eventsOn = (events: CalEvent[], day: ISODate): CalEvent[] =>
  events.filter((e) => eventOccursOn(e, day)).sort((a, b) => Number(b.allDay) - Number(a.allDay) || toMin(a.start) - toMin(b.start));

/** ¿El bloque de rutina aplica en esa fecha concreta (día de semana + cada N semanas)? */
export function routineOccursOn(r: RoutineBlock, day: ISODate, anchor: ISODate): boolean {
  if (dow(day) !== r.day) return false;
  if (r.everyWeeks <= 1) return true;
  const weeks = Math.floor(diffDays(day, anchor) / 7);
  return ((weeks % r.everyWeeks) + r.everyWeeks) % r.everyWeeks === 0;
}

/** Minutos de solape entre dos rangos horarios. */
export const overlapMin = (aS: string, aE: string, bS: string, bE: string): number => Math.max(0, Math.min(toMin(aE), toMin(bE)) - Math.max(toMin(aS), toMin(bS)));

/** Instante (epoch ms) en que debe sonar el recordatorio de un evento. */
export function remindAt(e: CalEvent): number | null {
  if (!e.remind) return null;
  const [y, m, d] = e.date.split("-").map(Number);
  const [h, mi] = (e.allDay ? "09:00" : e.start).split(":").map(Number);
  const start = new Date(y, m - 1, d, h, mi).getTime();
  const lead = e.remind.n * (e.remind.unit === "days" ? DAY_MS : 3_600_000);
  return start - lead;
}

export const nextMonth = (d: ISODate) => addMonths(d, 1);
export const iso = toISO;
export const plusDays = addDays;
