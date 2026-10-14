/**
 * Calendario: vistas Semana y Día (cuadrícula por horas con eventos que se solapan en columnas).
 */
import { fmtTime, fromISO, MONTHS, WEEKDAYS } from "../../domain/dates";
import { t, tn } from "../../i18n";
import type { ISODate } from "../../domain/types";
import { layoutOverlap, minutesRange } from "../../domain/timegrid";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { MoreBadge } from "../../components/ui/MoreBadge";
import { swipeProps } from "../../lib/swipe";
import { ROW } from "./gridKit";
import { pad, rangeLabel, SILK, type Item } from "./model";

export function TimeGrid({
  mode,
  days,
  byDay,
  selected,
  today,
  tf,
  onSelect,
  onCreate,
  onOpen,
}: {
  mode: "week" | "day";
  days: ISODate[];
  byDay: Map<ISODate, Item[]>;
  selected: ISODate;
  today: ISODate;
  tf: "12h" | "24h";
  onSelect: (d: ISODate) => void;
  onCreate: (d: ISODate, time?: string) => void;
  onOpen: (i: Item) => void;
}): JSX.Element {
  const timed = days.flatMap((d) => (byDay.get(d) ?? []).filter((i) => !i.allDay));
  let h0 = 7,
    last = 22;
  for (const it of timed) {
    const { sM, eM } = minutesRange(it.start, it.end);
    h0 = Math.min(h0, Math.floor(sM / 60));
    last = Math.max(last, Math.min(23, Math.ceil(eM / 60) - 1));
  }
  const hours: number[] = [];
  for (let h = h0; h <= last; h++) hours.push(h);
  const endMin = (last + 1) * 60;
  const hasAllDay = days.some((d) => (byDay.get(d) ?? []).some((i) => i.allDay));
  const day = mode === "day";
  const dowShort = WEEKDAYS.map((w) => w.slice(0, 3).toUpperCase());
  const selDt = fromISO(selected);
  const selCount = (byDay.get(selected) ?? []).length;

  return (
    <div style={{ ...GLASS_CARD, flex: 1, padding: "18px 20px 20px" }}>
      {day ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14, paddingLeft: 58 }}>
          <div style={{ fontFamily: SILK, fontSize: 13, letterSpacing: ".08em", color: "#16211c" }}>{WEEKDAYS[selDt.getDay()].toUpperCase()}</div>
          <div style={{ fontSize: 13, color: "var(--rb-muted)", whiteSpace: "nowrap" }}>
            {MONTHS[selDt.getMonth()].slice(0, 3).toUpperCase()} {selDt.getDate()} · {tn(selCount, "item", "items")}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", paddingLeft: 58, marginBottom: 8 }}>
          {days.map((d) => {
            const dt = fromISO(d);
            return (
              <div
                key={d}
                onClick={() => onSelect(d)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 7,
                  padding: "5px 9px",
                  borderRadius: 9,
                  cursor: "pointer",
                  background: d === selected ? "rgba(215,244,229,.9)" : "transparent",
                }}
              >
                <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".08em", color: "var(--rb-muted)" }}>{dowShort[dt.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: d === today ? "#0b7a45" : "#16211c" }}>{dt.getDate()}</div>
              </div>
            );
          })}
        </div>
      )}

      {hasAllDay && (
        <div style={{ display: "flex", marginBottom: 8, paddingLeft: 0 }}>
          <div
            style={{
              width: 58,
              flex: "none",
              paddingRight: 10,
              paddingTop: 5,
              textAlign: "right",
              fontFamily: SILK,
              fontSize: 7.5,
              letterSpacing: ".08em",
              color: "var(--rb-muted)",
            }}
          >
            {t("ALL DAY")}
          </div>
          {days.map((d) => (
            <div key={d} className="rb-noscroll" style={{ flex: 1, minWidth: 0, maxHeight: 78, display: "flex", flexDirection: "column", gap: 3, padding: "0 6px 0 12px" }}>
              {(byDay.get(d) ?? [])
                .filter((i) => i.allDay)
                .map((c) => (
                  <div
                    key={c.key}
                    className="rbc-chip"
                    {...swipeProps(c)}
                    onClick={() => onOpen(c)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 6px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: "rgba(201,138,30,.12)",
                      opacity: c.done ? 0.55 : 1,
                    }}
                  >
                    <div style={{ width: 7, height: 7, flex: "none", borderRadius: c.kind === "task" ? 2 : "50%", background: c.color }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 600, color: "#2b3a34", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.title}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div
        className="rb-scroll"
        style={{ position: "relative", maxHeight: 610, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "thin", scrollbarColor: "rgba(23,184,102,.45) transparent" }}
      >
        {hours.map((h) => (
          <div key={h} style={{ display: "flex", height: ROW, boxSizing: "border-box", borderTop: "1px solid rgba(18,38,30,.06)" }}>
            <div style={{ width: 58, flex: "none", paddingRight: 10, paddingTop: 3, textAlign: "right", fontSize: 10.5, lineHeight: "14px", color: "var(--rb-muted)" }}>
              {fmtTime(`${pad(h)}:00`, tf)}
            </div>
            {days.map((d) => (
              <div key={d} className="rbc-cell" onClick={() => onCreate(d, `${pad(h)}:00`)} style={{ flex: 1, borderLeft: "1px solid rgba(18,38,30,.06)", cursor: "pointer" }} />
            ))}
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(18,38,30,.06)" }} />
        <div style={{ position: "absolute", left: 58, right: 0, top: 0, bottom: 0, display: "flex", pointerEvents: "none" }}>
          {days.map((d) => {
            const laid = layoutOverlap((byDay.get(d) ?? []).filter((i) => !i.allDay).map((i) => ({ ...i, ...minutesRange(i.start, i.end) })));
            return (
              <div key={d} style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={day ? { position: "absolute", left: 18, right: 18, top: 0, bottom: 0 } : { position: "absolute", inset: 0 }}>
                  {laid
                    .filter((b) => !b.hidden)
                    .map((b) => {
                      const eM = Math.min(b.eM, endMin);
                      const top = ((b.sM - h0 * 60) / 60) * ROW + 1;
                      const h = Math.max(22, ((eM - b.sM) / 60) * ROW - 2);
                      const multi = b.n > 1;
                      const left = multi ? `calc(${(b.idx * 100) / b.n}% + 3px)` : day ? 0 : 12;
                      const width = multi ? `calc(${100 / b.n}% - 6px)` : day ? "100%" : "calc(100% - 18px)";
                      return (
                        <div
                          key={b.key}
                          className="rbc-blk"
                          {...swipeProps(b)}
                          onClick={() => onOpen(b)}
                          style={{
                            pointerEvents: "auto",
                            cursor: "pointer",
                            position: "absolute",
                            left,
                            width,
                            top,
                            height: h,
                            padding: day ? "0 14px" : "0 8px",
                            boxSizing: "border-box",
                            borderRadius: day ? 12 : 10,
                            background: "rgba(255,255,255,.92)",
                            border: "1px solid rgba(18,38,30,.07)",
                            borderLeft: `3px solid ${b.color}`,
                            boxShadow: "0 8px 18px -14px rgba(18,60,40,.6)",
                            overflow: "hidden",
                            opacity: b.done ? 0.55 : 1,
                          }}
                        >
                          {day ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, height: "100%" }}>
                              {b.more > 0 && <MoreBadge n={b.more} />}
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#16211c",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {b.kind === "task" ? "□ " : ""}
                                {b.title}
                              </div>
                              <div style={{ flex: "none", fontSize: 11.5, color: "var(--rb-muted)" }}>{rangeLabel(b, tf)}</div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", overflow: "hidden" }}>
                              {b.more > 0 && <MoreBadge n={b.more} />}
                              <div
                                style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25, color: "#16211c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {b.kind === "task" ? "□ " : ""}
                                {b.title}
                              </div>
                              {h >= 30 && (
                                <div style={{ fontSize: 9, lineHeight: 1.3, color: "var(--rb-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {rangeLabel(b, tf)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
