/**
 * Calendario: vista Mes (cuadrícula de días con chips de eventos y tareas).
 */
import { fromISO } from "../../domain/dates";
import { t } from "../../i18n";
import type { ISODate } from "../../domain/types";
import { compactTime } from "../../domain/timegrid";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { swipeProps } from "../../lib/swipe";
import { dowHeaders, SILK, type Item } from "./model";

export function MonthView({
  days,
  byDay,
  selected,
  today,
  month,
  ws,
  tf,
  onSelect,
  onCreate,
  onOpen,
}: {
  days: ISODate[];
  byDay: Map<ISODate, Item[]>;
  selected: ISODate;
  today: ISODate;
  month: number;
  ws: 0 | 1;
  tf: "12h" | "24h";
  onSelect: (d: ISODate, toDay: boolean) => void;
  onCreate: (d: ISODate) => void;
  onOpen: (i: Item) => void;
}): JSX.Element {
  return (
    <div style={{ ...GLASS_CARD, flex: 1, padding: "18px 20px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
        {dowHeaders(ws).map((d) => (
          <div key={d} style={{ fontFamily: SILK, fontSize: 9.5, letterSpacing: ".16em", color: "var(--rb-faint)", paddingLeft: 4 }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 }}>
        {days.map((d, di) => {
          const dt = fromISO(d);
          const inMonth = dt.getMonth() === month;
          const isToday = d === today,
            isSel = d === selected;
          const list = byDay.get(d) ?? [];
          return (
            <div
              key={d}
              className="rbc-day"
              onClick={() => onSelect(d, false)}
              onDoubleClick={() => onCreate(d)}
              style={{
                animation: "rb-cell .42s cubic-bezier(.22,1,.36,1) both",
                animationDelay: `${Math.min(di, 41) * 11}ms`,
                minHeight: 104,
                padding: 8,
                borderRadius: 14,
                cursor: "pointer",
                background: isSel ? "rgba(215,244,229,.75)" : inMonth ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.22)",
                border: `1px solid ${isSel ? "rgba(23,184,102,.45)" : "rgba(18,38,30,.06)"}`,
                boxShadow: isSel ? "0 10px 24px -18px rgba(23,184,102,.9)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: "0 6px",
                    borderRadius: 7,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isToday ? "#fff" : inMonth ? "#16211c" : "#a3b0aa",
                    background: isToday ? "var(--rb-green)" : "transparent",
                  }}
                >
                  {dt.getDate()}
                </div>
                <div style={{ fontFamily: SILK, fontSize: 8.5, letterSpacing: ".08em", color: "var(--rb-green-deep)" }}>{isToday ? t("Today").toUpperCase() : ""}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: inMonth ? 1 : 0.6 }}>
                {list.slice(0, 2).map((c) => (
                  <div
                    key={c.key}
                    className="rbc-chip"
                    {...swipeProps(c)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(c);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 6px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: c.allDay ? "rgba(201,138,30,.12)" : "rgba(255,255,255,.7)",
                      opacity: c.done ? 0.55 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        flex: "none",
                        borderRadius: c.kind === "task" ? 2 : "50%",
                        background: c.allDay ? c.color : "transparent",
                        border: `1.5px solid ${c.color}`,
                        boxSizing: "border-box",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#2b3a34",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textDecoration: c.done ? "line-through" : "none",
                      }}
                    >
                      {c.allDay ? c.title : `${compactTime(c.start, tf)} ${c.title}`}
                    </div>
                    <div style={{ fontFamily: SILK, fontSize: 8, color: c.important ? "var(--rb-danger)" : "var(--rb-muted)" }}>{c.important ? "!" : c.recurring ? "↻" : ""}</div>
                  </div>
                ))}
                {list.length > 2 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(d, true);
                    }}
                    style={{ fontSize: 10.5, fontWeight: 600, color: "var(--rb-green-deep)", paddingLeft: 6 }}
                  >
                    {t("+{n} more", { n: list.length - 2 })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
