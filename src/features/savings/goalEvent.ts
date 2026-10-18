/**
 * Evento de Calendario ligado a la fecha límite de una meta de ahorro (se crea, se mueve o se quita con la meta).
 */
import { money, perOf, type SavingsGoal } from "../../domain/savings";
import { TITLE_MAX } from "../../domain/types";
import { useData } from "../../store/data";
import { t } from "../../i18n";

/** Crea, mueve o quita el evento de Calendario ligado a la fecha límite de la meta; devuelve su id (o null). */
export const syncDeadlineEvent = async (
  g: { name: string; target: number; color: string; deadline: string | null; eventId: string | null; freq: SavingsGoal["freq"] },
  perPeriod: number,
): Promise<string | null> => {
  const { events, addEvent, updateEvent, deleteEvent } = useData.getState();
  const current = g.eventId ? events.find((e) => e.id === g.eventId) : undefined;
  if (!g.deadline) {
    if (current) await deleteEvent(current.id);
    return null;
  }
  const title = t("Savings deadline: {name}", { name: g.name });
  const description =
    perPeriod > 0
      ? t("Goal {target}. Save {amt} to get there.", { target: money(g.target), amt: `${money(perPeriod)}${perOf(g.freq)}` })
      : t("Goal {target}.", { target: money(g.target) });
  const fields = { title: title.slice(0, TITLE_MAX), date: g.deadline, allDay: true, start: "00:00", end: "23:59", color: g.color, description };
  if (current) {
    await updateEvent(current.id, fields);
    return current.id;
  }
  return (await addEvent(fields)).id;
};
