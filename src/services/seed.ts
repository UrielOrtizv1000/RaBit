/**
 * Datos de ejemplo para probar la app. Solo se cargan a petición del usuario (Ajustes → Try RaBit) o con `?seed` en
 * desarrollo; nunca de forma automática en producción.
 */
import { addDays, fromMin, todayISO } from "../domain/dates";
import { DAY_MS } from "../domain/types";
import { useData } from "../store/data";
import { t } from "../i18n";

/**
 * Datos de ejemplo para probar la app. Se cargan SOLO cuando el usuario lo pide
 * (Settings → Try RaBit) o con ?seed en desarrollo; nunca de forma automática en producción.
 */
export async function seedDemoData(): Promise<void> {
  const d = useData.getState();
  const today = todayISO();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const soon = fromMin(Math.min(nowMin + 3, 23 * 60 + 58)); // evento con recordatorio en ~3 min

  const tags = useData.getState().tags;
  const tag = (i: number) => tags[i % Math.max(1, tags.length)]?.id ?? null;

  await d.addTask({ title: t("Submit report"), date: today, time: "13:30", important: true });
  await d.addTask({ title: t("Reply to emails"), date: today });
  await d.addTask({ title: t("Buy groceries"), date: addDays(today, 1), description: t("Milk, eggs, coffee") });
  await d.addTask({ title: t("Pay rent"), date: addDays(today, 3), time: "09:00", important: true });
  await d.addTask({ title: t("Old finished task"), date: addDays(today, -2), done: true, doneAt: Date.now() - DAY_MS });

  await d.addEvent({
    title: t("Reminder test (rings in ~3 min)"),
    date: today,
    start: soon,
    end: fromMin(Math.min(nowMin + 33, 23 * 60 + 59)),
    color: "#c98a1e",
    remind: { n: 0, unit: "hours", freq: "once" },
    description: t("Leave the app open: you should get a notification."),
  });
  await d.addEvent({ title: t("Team sync"), date: today, start: "10:00", end: "11:00", color: "#4b7fd6", recurring: true, repeat: "weekly" });
  await d.addEvent({ title: t("Gym"), date: addDays(today, 2), start: "18:00", end: "19:00", color: "#17b866", important: true });
  await d.addEvent({ title: t("Dentist"), date: addDays(today, 4), start: "16:30", end: "17:30", color: "#a8443a", remind: { n: 1, unit: "days", freq: "once" } });
  await d.addEvent({ title: t("Birthday"), date: addDays(today, 6), start: "00:00", end: "23:59", allDay: true, color: "#8a6fd6", recurring: true, repeat: "yearly" });
  await d.addEvent({ title: t("Deletes itself after it passes"), date: addDays(today, 1), start: "12:00", end: "13:00", color: "#2aa6a0", autoDeleteAfter: true });

  const n1 = await d.addNote({ title: t("Project ideas"), body: t("- RaBit sync\n- Widgets\n- Dark mode ✔"), tagId: tag(0), pinned: true });
  await d.addNote({ title: t("Reading list"), body: "Atomic Habits\nDeep Work", tagId: tag(1) });
  const gone = await d.addNote({ title: t("Deleted note (in trash)"), body: t("Restore me from the Deleted filter."), tagId: tag(2) });
  await d.trashNote(gone.id);
  void n1;

  await d.addRoutine({ title: t("Morning run"), day: 0, start: "07:00", end: "08:00", color: "#2aa6a0" });
  await d.addRoutine({ title: t("Morning run"), day: 2, start: "07:00", end: "08:00", color: "#2aa6a0" });
  await d.addRoutine({ title: t("Study"), day: 1, start: "10:00", end: "12:00", color: "#4b7fd6" }); // choca con Team sync
  await d.addRoutine({ title: t("Read"), day: 4, start: "21:30", end: "22:30", color: "#8a6fd6" });
  await d.addRoutine({ title: t("Weekly review"), day: 6, start: "18:00", end: "19:00", color: "#c98a1e", everyWeeks: 2 });
}

/** Borra tareas, eventos, notas, rutina y portafolio. Conserva nombre, ajustes y etiquetas. */
export async function clearAllData(): Promise<void> {
  const d = useData.getState();
  const b = d.exportAll();
  await d.importAll({ ...b, tasks: [], events: [], notes: [], routine: [] });
}
