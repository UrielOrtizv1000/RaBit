/**
 * Utilidades de fechas/horas puras. Formatos: fecha "YYYY-MM-DD", hora "HH:MM" (24 h).
 * MONTHS/WEEKDAYS se actualizan en sitio al cambiar de idioma (ver onLang).
 */
import { onLang, t } from "../i18n";
import type { HHMM, ISODate } from "./types";

const p2 = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromISO = (s: ISODate): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = (now: Date = new Date()): ISODate => toISO(now);
export const addDays = (s: ISODate, n: number): ISODate => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDays = (a: ISODate, b: ISODate): number => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
export const addMonths = (s: ISODate, n: number): ISODate => {
  const d = fromISO(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
};

/** 0 = lunes … 6 = domingo */
export const dow = (s: ISODate): number => (fromISO(s).getDay() + 6) % 7;
export const startOfWeek = (s: ISODate, weekStart: 0 | 1 = 1): ISODate => {
  const wd = fromISO(s).getDay(); // 0 dom
  const back = weekStart === 1 ? (wd + 6) % 7 : wd;
  return addDays(s, -back);
};
export const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

export const toMin = (t: HHMM): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (n: number): HHMM => `${p2(Math.floor(n / 60) % 24)}:${p2(n % 60)}`;

export const fmtTime = (t: HHMM, f: "12h" | "24h"): string => {
  if (f === "24h") return t;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${p2(m)} ${h < 12 ? "AM" : "PM"}`;
};

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Se actualizan EN SITIO al cambiar de idioma (la interfaz se vuelve a montar entonces). */
export const MONTHS: string[] = [...EN_MONTHS];
export const WEEKDAYS: string[] = [...EN_WEEKDAYS];
const applyLocale = () => {
  EN_MONTHS.forEach((m, i) => {
    MONTHS[i] = t(m);
  });
  EN_WEEKDAYS.forEach((d, i) => {
    WEEKDAYS[i] = t(d);
  });
};
onLang(applyLocale);

export const fmtDay = (s: ISODate): string => {
  const d = fromISO(s);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

export const relDay = (s: ISODate, today: ISODate = todayISO()): string => {
  const n = diffDays(s, today);
  return n === 0 ? t("Today") : n === 1 ? t("Tomorrow") : n === -1 ? t("Yesterday") : fmtDay(s);
};
