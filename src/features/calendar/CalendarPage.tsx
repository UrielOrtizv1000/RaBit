/**
 * Página Calendario: vistas Mes / Semana / Día / Año, agenda del día y gesto de eliminar.
 * Los bloques solapados usan `layoutOverlap` (máx. 3 columnas + contador «+N»).
 */
import { useMemo, useState } from "react";
import { addDays, daysInMonth, fmtTime, fromISO, MONTHS, startOfWeek, toISO, todayISO, WEEKDAYS } from "../../domain/dates";
import { eventsOn } from "../../domain/logic";
import { t, tn } from "../../i18n";
import type { HHMM, ISODate } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { compactTime, layoutOverlap, minutesRange } from "../../domain/timegrid";
import { GLASS_CARD, PILL_GROUP, PRIMARY_BTN, SIDE_CARD, SILK_LABEL } from "../../components/ui/cardStyles";
import { MoreBadge } from "../../components/ui/MoreBadge";
import { PageHeader } from "../../components/ui/PageHeader";
import { PlusIcon } from "../../components/ui/PlusIcon";
import { ROW, SHARED_CSS, TASK_COLOR } from "./gridKit";
import { swipeProps } from "../../lib/swipe";
import { Terminal } from "../../components/ui/Terminal";

type View = "MONTH" | "WEEK" | "DAY" | "YEAR";
const VIEWS: View[] = ["MONTH", "WEEK", "DAY", "YEAR"];

interface Item {
  key: string;
  kind: "event" | "task";
  id: string;
  title: string;
  color: string;
  allDay: boolean;
  start: HHMM;
  end: HHMM;
  important: boolean;
  recurring: boolean;
  done: boolean;
  meta: string;
}

const SILK = "Silkscreen,monospace";
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: ISODate) => d.slice(0, 7);

function shiftMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  t.setDate(Math.min(d.getDate(), daysInMonth(t.getFullYear(), t.getMonth())));
  return toISO(t);
}

const dowHeaders = (ws: 0 | 1): string[] => {
  const base = WEEKDAYS.map((w) => w.slice(0, 3).toUpperCase());
  return ws === 1 ? [...base.slice(1), base[0]] : base;
};

const rangeLabel = (it: Item, tf: "12h" | "24h"): string => {
  if (it.allDay) return t("All day");
  if (it.kind === "task") return fmtTime(it.start, tf);
  return `${fmtTime(it.start, tf)} — ${fmtTime(it.end, tf)}`;
};

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
        <div style={PILL_GROUP}>
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
              color: "#0b7a45",
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
        <div style={PILL_GROUP}>
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
        <div className="rbc-primary" onClick={() => create(selected)} style={PRIMARY_BTN}>
          <PlusIcon />
          {t("NEW EVENT")}
        </div>
      </PageHeader>

      <div style={{ flex: 1, display: "flex", gap: 26, alignItems: "stretch", minWidth: 0 }}>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0b7a45", padding: "4px 10px", borderRadius: 999, background: "rgba(23,184,102,.14)" }}>
                {selected === today ? t("Today") : t("Selected")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 64, lineHeight: 0.9, color: "#121a16" }}>{sel.getDate()}</div>
              <div style={{ paddingBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1d2a24" }}>{WEEKDAYS[sel.getDay()]}</div>
                <div style={{ fontSize: 12.5, color: "#5d6f67", marginTop: 3 }}>
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
                            color: "#121a16",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textDecoration: a.done ? "line-through" : "none",
                          }}
                        >
                          {a.title}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: a.important ? "#a8443a" : "#5d6f67" }}>{a.important ? t("! Important") : a.recurring ? "↻" : ""}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#5d6f67", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                <div style={{ fontFamily: SILK, fontSize: 11, letterSpacing: ".08em", color: "#121a16", marginTop: 8 }}>{t("NOTHING PLANNED")}</div>
                <div style={{ fontSize: 12.5, color: "#5d6f67", marginTop: 6 }}>{t("Your day is clear.")}</div>
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
                color: "#0b7a45",
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

const navBtn = { width: 30, height: 28, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "#41504a", fontSize: 13 } as const;

function itemsOn(events: ReturnType<typeof useData.getState>["events"], tasks: ReturnType<typeof useData.getState>["tasks"], day: ISODate): Item[] {
  const evs: Item[] = eventsOn(events, day).map((e) => ({
    key: `e:${e.id}:${day}`,
    kind: "event",
    id: e.id,
    title: e.title,
    color: e.color,
    allDay: e.allDay,
    start: e.start,
    end: e.end,
    important: e.important,
    recurring: e.recurring,
    done: false,
    meta: e.description.split("\n")[0] ?? "",
  }));
  const ts: Item[] = tasks
    .filter((t) => t.date === day)
    .map((t) => ({
      key: `t:${t.id}`,
      kind: "task",
      id: t.id,
      title: t.title,
      color: TASK_COLOR,
      allDay: t.time === null,
      start: t.time ?? "",
      end: "",
      important: t.important,
      recurring: false,
      done: t.done,
      meta: t.description.split("\n")[0] ?? "",
    }));
  return [...evs, ...ts].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
}

/* ------------------------------ MONTH ------------------------------ */
function MonthView({
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
          <div key={d} style={{ fontFamily: SILK, fontSize: 9.5, letterSpacing: ".16em", color: "#6b7a73", paddingLeft: 4 }}>
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
                    background: isToday ? "#17b866" : "transparent",
                  }}
                >
                  {dt.getDate()}
                </div>
                <div style={{ fontFamily: SILK, fontSize: 8.5, letterSpacing: ".08em", color: "#0b7a45" }}>{isToday ? t("Today").toUpperCase() : ""}</div>
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
                    <div style={{ fontFamily: SILK, fontSize: 8, color: c.important ? "#a8443a" : "#5d6f67" }}>{c.important ? "!" : c.recurring ? "↻" : ""}</div>
                  </div>
                ))}
                {list.length > 2 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(d, true);
                    }}
                    style={{ fontSize: 10.5, fontWeight: 600, color: "#0b7a45", paddingLeft: 6 }}
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

/* --------------------------- WEEK / DAY GRID --------------------------- */
function TimeGrid({
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
          <div style={{ fontSize: 13, color: "#5d6f67", whiteSpace: "nowrap" }}>
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
                <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".08em", color: "#5d6f67" }}>{dowShort[dt.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: d === today ? "#0b7a45" : "#16211c" }}>{dt.getDate()}</div>
              </div>
            );
          })}
        </div>
      )}

      {hasAllDay && (
        <div style={{ display: "flex", marginBottom: 8, paddingLeft: 0 }}>
          <div style={{ width: 58, flex: "none", paddingRight: 10, paddingTop: 5, textAlign: "right", fontFamily: SILK, fontSize: 7.5, letterSpacing: ".08em", color: "#5d6f67" }}>
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
            <div style={{ width: 58, flex: "none", paddingRight: 10, paddingTop: 3, textAlign: "right", fontSize: 10.5, lineHeight: "14px", color: "#5d6f67" }}>
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
                              <div style={{ flex: "none", fontSize: 11.5, color: "#5d6f67" }}>{rangeLabel(b, tf)}</div>
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
                                <div style={{ fontSize: 9, lineHeight: 1.3, color: "#5d6f67", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

/* ------------------------------- YEAR ------------------------------- */
function YearView({
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
                <div style={{ fontFamily: SILK, fontSize: 10, letterSpacing: ".08em", color: isSel ? "#0b7a45" : "#41504a" }}>{name.slice(0, 3).toUpperCase()}</div>
                <div style={{ fontSize: 10.5, color: "#5d6f67" }}>{counts[mi] > 0 ? counts[mi] : ""}</div>
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
                        color: isT ? "#fff" : has ? "#0b7a45" : inM ? "#41504a" : "transparent",
                        background: isT ? "#17b866" : has ? "rgba(215,244,229,.95)" : "transparent",
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

/** Column index of the 1st of a month given JS getDay() and week start (0 Sun / 1 Mon). */
const startOfWeekOffset = (jsDay: number, ws: 0 | 1): number => (ws === 1 ? (jsDay + 6) % 7 : jsDay);
