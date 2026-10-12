/**
 * Savings (ahorros): metas con forma de frasco, depósitos/retiros y el plan que RaBit recalcula.
 * Reglas puras (sin React ni base de datos). Los periodos son índices absolutos: semana (lunes) o mes.
 */
import { daysInMonth, diffDays, fromISO, MONTHS, toISO, todayISO } from "./dates";
import type { ISODate } from "./types";

export type SavingsFreq = "none" | "week" | "month";

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: string;
  /** "none" = sin plan (solo una meta); si no, el plan se reparte en `n` semanas o meses */
  freq: SavingsFreq;
  n: number;
  /** índice del periodo (semana o mes, según `freq`) en que arrancó el plan */
  start: number;
  important: boolean;
  /** fecha límite (se muestra en el Calendario); null si el frasco no tiene */
  deadline: ISODate | null;
  /** id del evento de Calendario ligado a la fecha límite */
  eventId: string | null;
}

/** Depósito (amt > 0) o retiro (amt < 0) en una meta. */
export interface SavingsMove {
  id: string;
  goalId: string;
  amt: number;
  /** epoch ms */
  at: number;
}

export const JAR_COLORS = ["#17b866", "#2aa6a0", "#4b7fd6", "#8a6fd6", "#d0579a", "#c98a1e", "#a8443a", "#5d6f67"] as const;
/** Monedas dentro de un frasco lleno. */
export const JAR_COINS = 58;
const DAY = 86_400_000;
const WEEK0 = Date.UTC(2000, 0, 3); // un lunes

/** Semana (lunes–domingo) a la que pertenece un instante, como entero creciente. */
export const weekIndex = (at: number | Date): number => {
  const d = new Date(at);
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - WEEK0) / (7 * DAY));
};
export const monthIndex = (at: number | Date): number => {
  const d = new Date(at);
  return d.getFullYear() * 12 + d.getMonth();
};
const mon3 = (m0: number): string => MONTHS[((m0 % 12) + 12) % 12].slice(0, 3);
/** «Oct 5»: el lunes de la semana `w`. */
export const weekLabel = (w: number): string => {
  const d = new Date(WEEK0 + w * 7 * DAY);
  return `${mon3(d.getUTCMonth())} ${d.getUTCDate()}`;
};
/** «Oct 2026» para el mes `m`. */
export const monthLabel = (m: number): string => `${mon3(m)} ${Math.floor(m / 12)}`;
const periodLabel = (freq: "week" | "month", idx: number): string => (freq === "week" ? weekLabel(idx) : monthLabel(idx));

/** Suma `n` meses conservando el día (recortado al último día del mes destino). */
const plusMonths = (iso: string, n: number): string => {
  const d = fromISO(iso);
  const day = d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return toISO(new Date(first.getFullYear(), first.getMonth(), Math.min(day, daysInMonth(first.getFullYear(), first.getMonth()))));
};

/** Periodos (semanas o meses, mínimo 1) que faltan para una fecha límite; 0 si ya pasó o no es válida. */
export function periodsUntil(deadline: string, freq: "week" | "month", at: number): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return 0;
  const days = diffDays(deadline, todayISO(new Date(at)));
  if (days <= 0) return 0;
  if (freq === "week") return Math.max(1, Math.ceil(days / 7));
  const today = todayISO(new Date(at));
  let months = 0;
  while (months < 1200 && plusMonths(today, months + 1) <= deadline) months++;
  return Math.max(1, plusMonths(today, months) < deadline ? months + 1 : months);
}

/** «Dec 21» para una fecha ISO. */
export const shortDate = (iso: string): string => {
  const d = fromISO(iso);
  return `${mon3(d.getMonth())} ${d.getDate()}`;
};

export const perOf = (f: SavingsFreq): string => (f === "week" ? "/wk" : "/mo");

export interface GoalPlan {
  /** periodo actual (índice) */
  cur: number;
  /** periodos que quedan (contando el actual) */
  rem: number;
  /** depositado en el periodo actual */
  dThis: number;
  /** lo que toca depositar en el periodo actual */
  now: number;
  /** cuota de los periodos siguientes si te saltas el actual */
  next: number;
  left: number;
  /** fecha (texto) en que termina el plan */
  end: string;
  done: boolean;
  free: boolean;
}

export function planOf(g: SavingsGoal, moves: SavingsMove[], at: number): GoalPlan {
  const mine = moves.filter((m) => m.goalId === g.id);
  const left = Math.max(0, g.target - g.saved);
  const done = g.saved >= g.target;
  if (g.freq === "none") {
    const cur = weekIndex(at);
    const dThis = mine.filter((m) => weekIndex(m.at) === cur).reduce((a, m) => a + m.amt, 0);
    return { cur, rem: 1, dThis, now: 0, next: 0, left, end: "", done, free: true };
  }
  const idx = g.freq === "week" ? weekIndex : monthIndex;
  const cur = idx(at);
  const rem = Math.max(1, g.n - (cur - g.start));
  const dThis = mine.filter((m) => idx(m.at) === cur).reduce((a, m) => a + m.amt, 0);
  const before = g.saved - dThis;
  const now = Math.max(0, (g.target - before) / rem);
  const next = rem > 1 ? left / (rem - 1) : left;
  return { cur, rem, dThis, now, next, left, end: periodLabel(g.freq, g.start + g.n - 1), done, free: false };
}

export interface Streak {
  current: number;
  best: number;
  /** las últimas `count` semanas (la última es la actual) con lo depositado en cada una */
  weeks: { w: number; amount: number; current: boolean }[];
}

/** Racha = semanas seguidas con al menos un depósito (la semana en curso no rompe la racha si aún está vacía). */
export function streakOf(moves: SavingsMove[], at: number, count = 12): Streak {
  const by = new Map<number, number>();
  for (const m of moves) if (m.amt > 0) by.set(weekIndex(m.at), (by.get(weekIndex(m.at)) ?? 0) + m.amt);
  const cw = weekIndex(at);
  let current = 0;
  for (let w = by.has(cw) ? cw : cw - 1; by.has(w); w--) current++;
  let best = 0;
  let run = 0;
  const first = by.size ? Math.min(...by.keys()) : cw;
  for (let w = first; w <= cw; w++) {
    run = by.has(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const weeks = Array.from({ length: count }, (_, i) => {
    const w = cw - (count - 1) + i;
    return { w, amount: by.get(w) ?? 0, current: w === cw };
  });
  return { current, best, weeks };
}

/** Orden de los frascos: importantes primero, completados al final; el resto conserva el orden de creación. */
export function sortGoals(goals: SavingsGoal[], plans: Map<string, GoalPlan>, keepId: string | null): SavingsGoal[] {
  const rank = (g: SavingsGoal): number => {
    const done = plans.get(g.id)?.done ?? false;
    return done && g.id !== keepId ? 2 : g.important ? 0 : 1;
  };
  return goals
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .map((x) => x.g);
}

/** Cuánto de cada meta pendiente cubriría un monto (la calculadora reparte en orden). */
export function coverGoals(pending: { name: string; color: string; left: number }[], pool: number): { name: string; color: string; pct: number }[] {
  let rest = pool;
  return pending.map((p) => {
    const got = Math.min(p.left, rest);
    rest -= got;
    return { name: p.name, color: p.color, pct: p.left ? (got / p.left) * 100 : 100 };
  });
}

/** Número a partir de lo que escribe la persona («$1,200.50» → 1200.5), o null. */
export const parseAmount = (v: string | undefined): number | null => {
  const x = parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isNaN(x) ? null : x;
};

export const money = (n: number): string => `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

/** Aclara un color #rrggbb mezclándolo con blanco (k = 0…1). */
export const lighten = (hex: string, k: number): string => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${c.map((v) => Math.round(v + (255 - v) * k)).join(",")})`;
};

/** Monedas visibles en un frasco según su avance. */
export const coinsFor = (g: SavingsGoal): number => (g.target > 0 && g.saved >= g.target ? JAR_COINS : Math.round(Math.min(1, Math.max(0, g.saved / (g.target || 1))) * JAR_COINS));

export type GoalMode = "free" | "date" | "amount";
export interface GoalForm {
  id: string | null;
  name: string;
  target: string;
  mode: GoalMode;
  freq: "week" | "month";
  /** fecha límite (modo «fecha límite»), ISO */
  deadline: string;
  /** periodos que la persona escribió (solo se conserva por compatibilidad del formulario) */
  n: string;
  /** cuánto puede ahorrar por periodo (modo «lo que puedo ahorrar») */
  per: string;
  color: string;
  important: boolean;
}

export interface GoalFormResult {
  ok: boolean;
  /** periodos finales del plan */
  n: number;
  /** texto principal del resultado, ya listo para mostrar (clave i18n + datos) */
  kind: "none" | "free" | "perPeriod" | "reach";
  perPeriod: number;
  periods: number;
  endLabel: string;
  missing: ("name" | "amount" | "date" | "howMuch")[];
}

/** Evalúa el formulario de meta: qué falta y cuál es el plan resultante. */
export function evalGoalForm(f: GoalForm, savedNow: number, at: number): GoalFormResult {
  const target = parseAmount(f.target);
  const left = target ? Math.max(0, target - savedNow) : 0;
  const per = parseAmount(f.per);
  const cur = f.freq === "week" ? weekIndex(at) : monthIndex(at);
  const missing: GoalFormResult["missing"] = [];
  if (!f.name.trim()) missing.push("name");
  if (!(target && target > 0)) missing.push("amount");
  const dated = periodsUntil(f.deadline, f.freq, at);
  if (f.mode === "date" && dated === 0) missing.push("date");
  if (f.mode === "amount" && !(per && per > 0)) missing.push("howMuch");
  const nIn = Math.max(1, dated);
  const base = { ok: missing.length === 0, n: nIn, perPeriod: 0, periods: nIn, endLabel: "", missing };
  if (f.mode === "free") return { ...base, kind: target && target > 0 ? "free" : "none", n: 0 };
  if (f.mode === "date") return { ...base, kind: target && target > 0 && dated > 0 ? "perPeriod" : "none", perPeriod: left / nIn };
  if (target && target > 0 && per && per > 0) {
    const periods = Math.max(1, Math.ceil(left / per));
    return { ...base, kind: "reach", n: periods, periods, endLabel: periodLabel(f.freq, cur + periods - 1) };
  }
  return { ...base, kind: "none" };
}
