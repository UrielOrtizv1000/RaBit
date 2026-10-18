/**
 * Calendario: vista Año (doce mini calendarios con conteo por mes).
 */
import { daysInMonth, MONTHS } from "../../domain/dates";
import type { ISODate } from "../../domain/types";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { monthKey, pad, SILK, startOfWeekOffset, type Item } from "./model";

export function YearView({
  year,
  selected,
  today,
  ws,
  byDay,
  counts,
  onMonth,
  onDay,
}: {
  year: number;
  selected: ISODate;
  today: ISODate;
  ws: 0 | 1;
  byDay: Map<ISODate, Item[]>;
  counts: number[];
  onMonth: (monthKey: string) => void;
  onDay: (d: ISODate) => void;
}): JSX.Element {
  const selMonth = monthKey(selected);
  return (
    <div style={{ ...GLASS_CARD, flex: 1, padding: "18px 20px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
        {MONTHS.map((name, mi) => {
          const mk = `${year}-${pad(mi + 1)}`;
          const first = startOfWeekOffset(new Date(year, mi, 1).getDay(), ws);
          const len = daysInMonth(year, mi);
          const isSel = mk === selMonth;
          const cells = Array.from({ length: 42 }, (_, i) => i - first + 1);
          return (
            <div
              key={mk}
              className="rbc-month"
              onClick={() => onMonth(mk)}
              style={{
                padding: 14,
                borderRadius: 16,
                cursor: "pointer",
                background: isSel ? "rgba(215,244,229,.5)" : "rgba(255,255,255,.55)",
                border: `1px solid ${isSel ? "rgba(23,184,102,.35)" : "rgba(18,38,30,.06)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: SILK, fontSize: 10, letterSpacing: ".08em", color: isSel ? "var(--rb-green-deep)" : "var(--rb-body)" }}>
                  {name.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--rb-muted)" }}>{counts[mi] > 0 ? counts[mi] : ""}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                {cells.map((n, i) => {
                  const inM = n >= 1 && n <= len;
                  const d = inM ? `${mk}-${pad(n)}` : "";
                  const has = inM && (byDay.get(d)?.length ?? 0) > 0;
                  const isT = inM && d === today;
                  return (
                    <div
                      key={i}
                      onClick={
                        inM
                          ? (e) => {
                              e.stopPropagation();
                              onDay(d);
                            }
                          : undefined
                      }
                      style={{
                        height: 19,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 5,
                        fontSize: 9.5,
                        fontWeight: 600,
                        cursor: inM ? "pointer" : "inherit",
                        color: isT ? "#fff" : has ? "var(--rb-green-deep)" : inM ? "var(--rb-body)" : "transparent",
                        background: isT ? "var(--rb-green)" : has ? "rgba(215,244,229,.95)" : "transparent",
                      }}
                    >
                      {inM ? n : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
