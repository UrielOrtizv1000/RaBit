/** Fechas: "YYYY-MM-DD". Horas: "HH:MM" (24h). Timestamps: epoch ms. */
import type { Lang } from "../i18n";
export type ISODate = string;
export type HHMM = string;

export interface User {
  name: string;
  createdAt: number;
  onboardingDone: boolean;
}

export interface Modules {
  calendar: boolean;
  routine: boolean;
  notes: boolean;
  savings: boolean;
}

export interface Settings {
  modules: Modules;
  theme: "light" | "dark";
  timeFormat: "12h" | "24h";
  weekStart: 0 | 1; // 0 = domingo, 1 = lunes
  reminders: boolean;
  sound: boolean;
  language: Lang;
  /** efecto de cristal (transparencia muy leve de la ventana) */
  glass: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: ISODate;
  time: HHMM | null;
  important: boolean;
  done: boolean;
  doneAt: number | null;
  createdAt: number;
}

export type RepeatKind = "weekly" | "monthly" | "yearly";
export interface Remind {
  n: number;
  unit: "days" | "hours";
  freq: "once" | "daily";
}

export interface CalEvent {
  id: string;
  title: string;
  description: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  allDay: boolean;
  color: string;
  important: boolean;
  recurring: boolean;
  repeat: RepeatKind | null;
  autoDeleteAfter: boolean;
  remind: Remind | null;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tagId: string | null;
  pinned: boolean;
  deletedAt: number | null;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface RoutineBlock {
  id: string;
  title: string;
  day: number; // 0 = lunes … 6 = domingo
  start: HHMM;
  end: HHMM;
  color: string;
  everyWeeks: number; // 1 = cada semana, 2 = cada dos…
}

export const EVENT_COLORS = ["#17b866", "#4b7fd6", "#8a6fd6", "#2aa6a0", "#c98a1e", "#a8443a"] as const;
export const TAG_COLORS = ["#17b866", "#2aa6a0", "#4b7fd6", "#8a6fd6", "#d0579a", "#c98a1e", "#a8443a", "#5d6f67"] as const;

export const TRASH_DAYS = 30;
export const DAY_MS = 86_400_000;

/** Máximo de caracteres en títulos (eventos, tareas, notas, rutinas). */
export const TITLE_MAX = 60;
