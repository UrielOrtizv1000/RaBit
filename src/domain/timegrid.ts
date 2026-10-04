/**
 * Lógica pura (sin React) de las rejillas horarias: formato compacto de horas, rangos en minutos
 * y reparto de bloques solapados en columnas. Testeada en tests/logic.test.ts.
 */
import { toMin } from "./dates";
import type { HHMM } from "./types";

/** Compact time for tight chips: 24h "09:00"; 12h "9a" / "9:30p". */
export function compactTime(t: HHMM, f: "12h" | "24h"): string {
  if (f === "24h") return t;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "a" : "p"}`;
}

/** Start/end minutes of a timed item. Missing/invalid end → +60 min; "00:00" end → midnight. */
export function minutesRange(start: HHMM, end: HHMM): { sM: number; eM: number } {
  const sM = toMin(start);
  let eM = end ? toMin(end) : sM + 60;
  if (eM <= sM) eM = end === "00:00" ? 1440 : sM + 60;
  return { sM, eM: Math.min(eM, 1440) };
}

/** Máximo de columnas simultáneas; el resto se agrupa en un contador "+N" (evita franjas ilegibles). */
export const MAX_COLS = 3;
export type Laid<T> = T & { n: number; idx: number; hidden: boolean; more: number };

/** Reparte ítems solapados en columnas (algoritmo voraz por grupo). Con más de MAX_COLS, los sobrantes se ocultan y
 *  el primer ítem de la última columna visible lleva `more` = cuántos quedaron ocultos. */
export function layoutOverlap<T extends { sM: number; eM: number }>(list: T[]): Laid<T>[] {
  const items = [...list].sort((a, b) => a.sM - b.sM || b.eM - a.eM);
  const clusters: { items: T[]; end: number }[] = [];
  for (const it of items) {
    const last = clusters[clusters.length - 1];
    if (last && it.sM < last.end) {
      last.items.push(it);
      last.end = Math.max(last.end, it.eM);
    } else clusters.push({ items: [it], end: it.eM });
  }
  const out: Laid<T>[] = [];
  for (const c of clusters) {
    const colEnds: number[] = [];
    const placed = c.items.map((it) => {
      let col = colEnds.findIndex((e) => e <= it.sM);
      if (col < 0) {
        colEnds.push(it.eM);
        col = colEnds.length - 1;
      } else colEnds[col] = it.eM;
      return { it, col };
    });
    const n = Math.min(colEnds.length, MAX_COLS);
    const hiddenCount = placed.filter((p) => p.col >= MAX_COLS).length;
    let badgeGiven = false;
    for (const p of placed) {
      const hidden = p.col >= MAX_COLS;
      const more = !hidden && hiddenCount > 0 && p.col === MAX_COLS - 1 && !badgeGiven ? hiddenCount : 0;
      if (more) badgeGiven = true;
      out.push({ ...p.it, n, idx: p.col, hidden, more });
    }
  }
  return out;
}
