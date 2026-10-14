/**
 * Inicio: reglas puras (próximas ocurrencias de eventos, «hace X», ancla de la rutina). Sin React.
 */
import { addDays } from "../../domain/dates";
import { eventsOn } from "../../domain/logic";
import type { CalEvent, ISODate } from "../../domain/types";
import { t } from "../../i18n";

export const ROUTINE_ANCHOR: ISODate = "2024-01-01";

export interface Occ {
  ev: CalEvent;
  date: ISODate;
}
export function occurrences(events: CalEvent[], from: ISODate, days: number): Occ[] {
  const out: Occ[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    for (const ev of eventsOn(events, d)) out.push({ ev, date: d });
  }
  return out;
}
export function ago(ms: number, now: number): string {
  const m = Math.max(0, Math.floor((now - ms) / 60000));
  if (m < 1) return t("Just now");
  if (m < 60) return t("{n} min ago", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("{n} h ago", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("1 day ago") : t("{n} days ago", { n: d });
}
export const hasDigit = (s: string) => /\d/.test(s);
