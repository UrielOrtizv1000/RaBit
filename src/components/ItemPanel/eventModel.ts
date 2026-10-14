/**
 * Evento: formulario, valores iniciales, textos de duración y las «chips» de la vista de lectura. Sin estado de React.
 */
import type { CSSProperties } from "react";
import { fromMin, toMin, todayISO } from "../../domain/dates";
import { EVENT_COLORS, type CalEvent, type ISODate, type Remind } from "../../domain/types";
import { t, tn } from "../../i18n";
import { GREEN, RED } from "./ui";

export type Form = Omit<CalEvent, "id" | "remind">;
export const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";
export const unitSpan = (n: number, u: Remind["unit"]) => (u === "days" ? tn(n, "day", "days") : tn(n, "hour", "hours"));

export function fromEvent(e: CalEvent | null, seed?: { date?: ISODate; time?: string }): { f: Form; rem: Remind; remOn: boolean } {
  if (e) {
    const { id: _id, remind, ...f } = e;
    void _id;
    return { f, rem: remind ?? { n: 1, unit: "days", freq: "once" }, remOn: remind !== null };
  }
  const start = seed?.time ?? "09:00";
  return {
    f: {
      title: "",
      description: "",
      date: seed?.date ?? todayISO(),
      start,
      end: fromMin(Math.min(toMin(start) + 60, 1439)),
      allDay: false,
      color: EVENT_COLORS[0],
      important: false,
      recurring: false,
      repeat: null,
      autoDeleteAfter: false,
    },
    rem: { n: 1, unit: "days", freq: "once" },
    remOn: true,
  };
}

export const MUTEDC = "#5d6f67";
export const sectionLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTEDC, marginBottom: 7 };

export interface Chip {
  text: string;
  color: string;
  bg: string;
  dot: string;
  mono?: boolean;
  square?: boolean;
}

/** Etiquetas de la vista de lectura de un evento (cuándo, importante, repetición, borrado automático, recordatorio). */
export function eventChips(cur: CalEvent, when: (e: Pick<CalEvent, "date" | "allDay" | "start" | "end">) => string): Chip[] {
  const out: Chip[] = [];
  out.push({ text: when(cur), color: GREEN, bg: "rgba(23,184,102,.12)", dot: cur.color });
  if (cur.important) out.push({ text: t("Important"), color: RED, bg: "rgba(192,74,66,.1)", dot: "#c0503f" });
  if (cur.recurring)
    out.push({
      text: cur.repeat === "monthly" ? t("Repeats monthly") : cur.repeat === "yearly" ? t("Repeats yearly") : t("Repeats weekly"),
      color: "#3d63a8",
      bg: "rgba(75,127,214,.1)",
      dot: "#4b7fd6",
    });
  if (cur.autoDeleteAfter) out.push({ text: t("Deletes after event"), color: "#8a5d0e", bg: "rgba(201,138,30,.12)", dot: "#c98a1e" });
  if (cur.remind) {
    const r = cur.remind;
    out.push({
      mono: true,
      square: true,
      text: (r.freq === "daily"
        ? r.unit === "days"
          ? t("Daily from {span} before", { span: unitSpan(r.n, r.unit) })
          : t("Hourly from {span} before", { span: unitSpan(r.n, r.unit) })
        : t("{span} before", { span: unitSpan(r.n, r.unit) })
      ).toUpperCase(),
      color: "var(--rb-neon)",
      bg: "linear-gradient(150deg,#14261d,#10241a)",
      dot: "#3ddc84",
    });
  }
  return out;
}
