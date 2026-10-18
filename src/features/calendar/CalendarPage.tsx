/**
 * Página Calendario: vistas Mes / Semana / Día / Año, agenda del día y gesto de eliminar.
 * Los bloques solapados usan `layoutOverlap` (máx. 3 columnas + contador «+N»).
 */
import { useMemo, useState } from "react";
import { addDays, daysInMonth, fmtTime, fromISO, MONTHS, startOfWeek, todayISO, WEEKDAYS } from "../../domain/dates";
import { eventsOn } from "../../domain/logic";
import { t, tn } from "../../i18n";
import type { ISODate } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { PILL_GROUP, PRIMARY_BTN, SIDE_CARD, SILK_LABEL } from "../../components/ui/cardStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { PlusIcon } from "../../components/ui/PlusIcon";
import { SHARED_CSS } from "./gridKit";
import { swipeProps } from "../../lib/swipe";
import { Terminal } from "../../components/ui/Terminal";
import { itemsOn, pad, rangeLabel, shiftMonths, SILK, VIEWS, type Item, type View } from "./model";
import { MonthView } from "./MonthView";
import { TimeGrid } from "./TimeGrid";
import { YearView } from "./YearView";

export function CalendarPage(): JSX.Element {
  const events = useData((s) => s.events);
  const tasks = useData((s) => s.tasks);
  const { weekStart: ws, timeFormat: tf } = useData((s) => s.settings);
  const openPanel = useUi((s) => s.openPanel);

  const today = todayISO();
  const [view, setView] = useState<View>("MONTH");
  const [selected, setSelected] = useState<ISODate>(today);

  const sel = fromISO(selected);
  const selY = sel.getFullYear(),
    selM = sel.getMonth();

  // visible days for the current view
  const days: ISODate[] = useMemo(() => {
    const first = (s: ISODate, n: number) => Array.from({ length: n }, (_, i) => addDays(s, i));
    if (view === "DAY") return [selected];
    if (view === "WEEK") return first(startOfWeek(selected, ws), 7);
    if (view === "YEAR") {
      const y = fromISO(selected).getFullYear();
      const n = Math.round((new Date(y + 1, 0, 1).getTime() - new Date(y, 0, 1).getTime()) / 86_400_000);
      return first(`${y}-01-01`, n);
    }
    const m1 = `${selected.slice(0, 7)}-01`;
    const start = startOfWeek(m1, ws);
    const offset = Math.round((fromISO(m1).getTime() - fromISO(start).getTime()) / 86_400_000);
    const dim = daysInMonth(fromISO(selected).getFullYear(), fromISO(selected).getMonth());
    return first(start, Math.ceil((offset + dim) / 7) * 7);
  }, [view, selected, ws]);

  const byDay = useMemo(() => {
    const map = new Map<ISODate, Item[]>();
    for (const d of days) map.set(d, itemsOn(events, tasks, d));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tasks, days]);

  const selItems = byDay.get(selected) ?? itemsOn(events, tasks, selected);

  const monthEvents = useMemo(() => {
    let n = 0;
    for (let d = 1; d <= daysInMonth(selY, selM); d++) n += eventsOn(events, `${selY}-${pad(selM + 1)}-${pad(d)}`).length;
    return n;
  }, [events, selY, selM]);

  const yearCounts = useMemo(() => {
    const c = Array<number>(12).fill(0);
    if (view !== "YEAR") return c;
    for (const [d, list] of byDay) c[Number(d.slice(5, 7)) - 1] += list.filter((i) => i.kind === "event").length;
    return c;
  }, [view, byDay]);
  const yearTotal = yearCounts.reduce((a, b) => a + b, 0);

  const td = fromISO(today);
  const eyebrow = `${WEEKDAYS[td.getDay()].toUpperCase()} · ${MONTHS[td.getMonth()].toUpperCase()} ${td.getDate()}`;
  const subtitle =
    view === "YEAR"
      ? yearTotal === 1
        ? t("1 event this year")
        : t("{n} events this year", { n: yearTotal })
      : monthEvents === 1
        ? t("1 event this month")
        : t("{n} events this month", { n: monthEvents });

  const step = (dir: 1 | -1) => {
    if (view === "DAY") setSelected(addDays(selected, dir));
    else if (view === "WEEK") setSelected(addDays(selected, 7 * dir));
    else if (view === "MONTH") setSelected(shiftMonths(selected, dir));
    else setSelected(shiftMonths(selected, 12 * dir));
  };

  const navLabel = (): string => {
    if (view === "MONTH") return MONTHS[selM].toUpperCase();
    if (view === "YEAR") return String(selY);
    if (view === "DAY") return selected === today ? t("Today").toUpperCase() : `${MONTHS[selM].slice(0, 3).toUpperCase()} ${sel.getDate()}`;
    const a = fromISO(days[0]),
      b = fromISO(days[6]);
    const am = MONTHS[a.getMonth()].slice(0, 3).toUpperCase(),
      bm = MONTHS[b.getMonth()].slice(0, 3).toUpperCase();
    return a.getMonth() === b.getMonth() ? `${am} ${a.getDate()}–${b.getDate()}` : `${am} ${a.getDate()}–${bm} ${b.getDate()}`;
  };

  const create = (date: ISODate, time?: string) => openPanel("event", null, time ? { date, time } : { date });
  const openItem = (it: Item) => openPanel(it.kind, it.id);

  const n = selItems.length;
  const greeting = n === 0 ? t("ALL CLEAR.") : n > 2 ? t("HEADS UP!") : t("HEY!");
  const botDay = `${MONTHS[selM].slice(0, 3).toUpperCase()} ${sel.getDate()}`;
  const line = n === 0 ? t("NOTHING ON {day}.", { day: botDay }) : n === 1 ? t("YOU HAVE 1 ITEM THIS DAY.") : t("YOU HAVE {n} ITEMS THIS DAY.", { n });
  const agenda = [...selItems].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
      <style>{SHARED_CSS}</style>
      <PageHeader eyebrow={eyebrow} title={t("Calendar")} subtitle={subtitle}>
        <div data-tour="cal-nav" style={PILL_GROUP}>
          <div className="rbc-btn" onClick={() => step(-1)} style={navBtn}>
            ‹
          </div>
          <div
            className="rbc-today"
            onClick={() => setSelected(today)}
            style={{
              minWidth: 104,
              padding: "0 14px",
              height: 28,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              fontFamily: SILK,
              fontSize: 9.5,
              letterSpacing: ".06em",
              color: "var(--rb-green-deep)",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {navLabel()}
          </div>
          <div className="rbc-btn" onClick={() => step(1)} style={navBtn}>
            ›
          </div>
        </div>
        <div data-tour="cal-views" style={PILL_GROUP}>
          {VIEWS.map((v) => (
            <div
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "0 14px",
                height: 28,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                fontFamily: SILK,
                fontSize: 9.5,
                letterSpacing: ".06em",
                cursor: "pointer",
                color: view === v ? "#0b7a45" : "#5d6f67",
                background: view === v ? "rgba(215,244,229,.95)" : "transparent",
                border: `1px solid ${view === v ? "rgba(23,184,102,.28)" : "transparent"}`,
              }}
            >
              {t(v)}
            </div>
          ))}
        </div>
        <div data-tour="cal-new" className="rbc-primary" onClick={() => create(selected)} style={PRIMARY_BTN}>
          <PlusIcon />
          {t("NEW EVENT")}
        </div>
      </PageHeader>

      <div data-tour="cal-grid" style={{ flex: 1, display: "flex", gap: 26, alignItems: "stretch", minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 706, display: "flex", flexDirection: "column" }}>
          {view === "MONTH" && (
            <MonthView
              days={days}
              byDay={byDay}
              selected={selected}
              today={today}
              month={selM}
              ws={ws}
              tf={tf}
              onSelect={(d, toDay) => {
                setSelected(d);
                if (toDay) setView("DAY");
              }}
              onCreate={create}
              onOpen={openItem}
            />
          )}
          {(view === "WEEK" || view === "DAY") && (
            <TimeGrid
              mode={view === "WEEK" ? "week" : "day"}
              days={days}
              byDay={byDay}
              selected={selected}
              today={today}
              tf={tf}
              onSelect={setSelected}
              onCreate={create}
              onOpen={openItem}
            />
          )}
          {view === "YEAR" && (
            <YearView
              year={selY}
              selected={selected}
              today={today}
              ws={ws}
              byDay={byDay}
              counts={yearCounts}
              onMonth={(m) => {
                setSelected(m === today.slice(0, 7) ? today : `${m}-01`);
                setView("MONTH");
              }}
              onDay={(d) => {
                setSelected(d);
                setView("DAY");
              }}
            />
          )}
        </div>

        <div style={{ width: 314, flex: "none", display: "flex", flexDirection: "column", gap: 16, contain: "size" }}>
          <div style={{ flex: "none" }}>
            <Terminal name="rabit@calendar" greeting={greeting} line={line} />
          </div>

          <div style={{ ...SIDE_CARD, padding: 22, flex: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={SILK_LABEL}>{t("SELECTED DAY")}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--rb-green-deep)", padding: "4px 10px", borderRadius: 999, background: "rgba(23,184,102,.14)" }}>
                {selected === today ? t("Today") : t("Selected")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 64, lineHeight: 0.9, color: "var(--rb-ink)" }}>{sel.getDate()}</div>
              <div style={{ paddingBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1d2a24" }}>{WEEKDAYS[sel.getDay()]}</div>
                <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginTop: 3 }}>
                  {MONTHS[selM]} {selY} · {tn(n, "item", "items")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...SIDE_CARD, flex: 1, minHeight: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", padding: 22 }}>
            <div style={{ ...SILK_LABEL, marginBottom: 16 }}>{t("DAY AGENDA")}</div>
            {n > 0 ? (
              <div className="rb-noscroll" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6, padding: "2px 4px 8px", margin: "0 -4px" }}>
                {agenda.map((a) => (
                  <div
                    key={a.key}
                    className="rbc-lift"
                    {...swipeProps(a)}
                    onClick={() => openItem(a)}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,.9)",
                      boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)",
                      opacity: a.done ? 0.6 : 1,
                    }}
                  >
                    <div
                      style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: tf === "12h" ? 11.5 : 15, color: "#121a16", width: tf === "12h" ? 58 : 48, flex: "none" }}
                    >
                      {a.allDay ? t("ALL") : fmtTime(a.start, tf)}
                    </div>
                    <div style={{ width: 3, height: 28, flex: "none", borderRadius: 3, background: a.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "var(--rb-ink)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textDecoration: a.done ? "line-through" : "none",
                          }}
                        >
                          {a.title}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: a.important ? "var(--rb-danger)" : "var(--rb-muted)" }}>
                          {a.important ? t("! Important") : a.recurring ? "↻" : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--rb-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.meta || rangeLabel(a, tf)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#5d6f67", flex: "none" }}>{a.kind === "task" ? t("Task") : t("Event")}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "6px 0 14px" }}>
                <img
                  src="/rabit.png"
                  alt="RaBit"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    filter: "contrast(.86) brightness(1.06) saturate(.92) hue-rotate(-8deg) drop-shadow(0 0 14px rgba(61,220,132,.35))",
                    animation: "rb-float 5.4s ease-in-out infinite",
                  }}
                />
                <div style={{ fontFamily: SILK, fontSize: 11, letterSpacing: ".08em", color: "var(--rb-ink)", marginTop: 8 }}>{t("NOTHING PLANNED")}</div>
                <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginTop: 6 }}>{t("Your day is clear.")}</div>
              </div>
            )}
            <div style={{ flex: n > 0 ? "none" : 1 }} />
            <div
              className="rbc-scale"
              onClick={() => create(selected)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
                padding: 11,
                borderRadius: 999,
                background: "linear-gradient(145deg,rgba(255,255,255,.85),rgba(255,255,255,.55))",
                border: "1px solid rgba(255,255,255,.9)",
                boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.35)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--rb-green-deep)",
                cursor: "pointer",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#17b866" strokeWidth="2.2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              {t("Add event")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn = { width: 30, height: 28, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--rb-body)", fontSize: 13 } as const;
