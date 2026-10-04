/**
 * Página Rutina: semana con bloques recurrentes superpuestos a los eventos/tareas reales del calendario.
 * Si un evento choca con un bloque de rutina, el evento gana (la rutina se atenúa y se marca «Clash»).
 */
import { useEffect, useMemo, useState } from "react";
import { scaleOf } from "../../lib/zoom";
import type { CSSProperties } from "react";
import { addDays, fmtTime, fromISO, fromMin, MONTHS, startOfWeek, todayISO, toMin, WEEKDAYS } from "../../domain/dates";
import { eventsOn, routineOccursOn } from "../../domain/logic";
import { t, tn } from "../../i18n";
import { EVENT_COLORS, TITLE_MAX, type HHMM, type ISODate, type RoutineBlock } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { compactTime, layoutOverlap, minutesRange } from "../../domain/timegrid";
import { GLASS_CARD, PILL_GROUP, PRIMARY_BTN, SIDE_CARD, SILK_LABEL } from "../../components/ui/cardStyles";
import { MoreBadge } from "../../components/ui/MoreBadge";
import { PageHeader } from "../../components/ui/PageHeader";
import { PlusIcon } from "../../components/ui/PlusIcon";
import { ROW, SHARED_CSS, TASK_COLOR } from "../calendar/gridKit";
import { Terminal } from "../../components/ui/Terminal";
import { logWarn } from "../../lib/log";

/** Routine blocks with everyWeeks > 1 count weeks from this fixed Monday. */
const ANCHOR: ISODate = "2024-01-01";
const DAY_KEY = "rabit.routine.day";
const SILK = "Silkscreen,monospace";
/** Day names are locale-aware (WEEKDAYS is mutated on language change): read them at render time. */
const dow3 = (): string[] => WEEKDAYS.map((w) => w.slice(0, 3).toUpperCase()); // by JS getDay()
const routineDays = (): string[] => [1, 2, 3, 4, 5, 6, 0].map((i) => WEEKDAYS[i].slice(0, 3).toUpperCase()); // RoutineBlock.day 0..6
const routineDayFull = (i: number): string => WEEKDAYS[(i + 1) % 7];

interface DaySettings {
  wake: HHMM;
  bed: HHMM;
}
const DEFAULT_DAY: DaySettings = { wake: "06:30", bed: "23:30" };

function loadDay(): DaySettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DAY_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const r = raw as Partial<DaySettings>;
      const ok = (t: unknown): t is HHMM => typeof t === "string" && /^\d{2}:\d{2}$/.test(t);
      if (ok(r.wake) && ok(r.bed) && toMin(r.bed) > toMin(r.wake)) return { wake: r.wake, bed: r.bed };
    }
  } catch (e) {
    logWarn("routine.day.load", e);
  }
  return DEFAULT_DAY;
}
function saveDay(d: DaySettings): void {
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(d));
  } catch (e) {
    logWarn("routine.day.save", e);
  }
}

interface RItem {
  key: string;
  kind: "routine" | "event" | "task";
  id: string;
  title: string;
  color: string;
  sM: number;
  eM: number;
  block?: RoutineBlock;
}
interface Clash {
  routineId: string;
  routine: string;
  cal: string;
  date: ISODate;
  min: number;
}

const dayOfRoutine = (d: ISODate): number => (fromISO(d).getDay() + 6) % 7;
const shortDate = (d: ISODate): string => {
  const x = fromISO(d);
  return `${MONTHS[x.getMonth()].slice(0, 3).toUpperCase()} ${x.getDate()}`;
};

function itemsFor(date: ISODate, routine: RoutineBlock[], events: ReturnType<typeof useData.getState>["events"], tasks: ReturnType<typeof useData.getState>["tasks"]): RItem[] {
  const out: RItem[] = [];
  for (const r of routine) {
    if (!routineOccursOn(r, date, ANCHOR)) continue;
    const { sM, eM } = minutesRange(r.start, r.end);
    out.push({ key: `r:${r.id}:${date}`, kind: "routine", id: r.id, title: r.title, color: r.color, sM, eM, block: r });
  }
  for (const e of eventsOn(events, date)) {
    if (e.allDay) continue;
    const { sM, eM } = minutesRange(e.start, e.end);
    out.push({ key: `e:${e.id}:${date}`, kind: "event", id: e.id, title: e.title, color: e.color, sM, eM });
  }
  for (const t of tasks) {
    if (t.date !== date || !t.time || t.done) continue;
    const { sM, eM } = minutesRange(t.time, "");
    out.push({ key: `t:${t.id}`, kind: "task", id: t.id, title: t.title, color: TASK_COLOR, sM, eM });
  }
  return out;
}

const overlaps = (a: RItem, b: RItem): number => Math.min(a.eM, b.eM) - Math.max(a.sM, b.sM);

function clashesOf(date: ISODate, list: RItem[]): Clash[] {
  const out: Clash[] = [];
  for (const r of list) {
    if (r.kind !== "routine") continue;
    for (const c of list) {
      if (c.kind === "routine") continue;
      const m = overlaps(r, c);
      if (m > 0) out.push({ routineId: r.id, routine: r.title, cal: c.title, date, min: m });
    }
  }
  return out;
}

/** Siblings = blocks created together (same title/time/color/frequency, different days). */
const groupOf = (b: RoutineBlock, all: RoutineBlock[]): RoutineBlock[] =>
  all.filter((x) => x.title === b.title && x.start === b.start && x.end === b.end && x.color === b.color && x.everyWeeks === b.everyWeeks);

const timeOptions = (current: HHMM): HHMM[] => {
  const set = new Set<HHMM>();
  for (let m = 0; m < 1440; m += 15) set.add(fromMin(m));
  set.add("23:59");
  set.add(current);
  return [...set].sort();
};

interface Draft {
  mode: "add" | "edit";
  ids: string[];
  title: string;
  start: HHMM;
  end: HHMM;
  color: string;
  days: number[];
  every: number;
}

export function RoutinePage(): JSX.Element {
  const routine = useData((s) => s.routine);
  const events = useData((s) => s.events);
  const tasks = useData((s) => s.tasks);
  const { weekStart: ws, timeFormat: tf } = useData((s) => s.settings);
  const addRoutine = useData((s) => s.addRoutine);
  const updateRoutine = useData((s) => s.updateRoutine);
  const deleteRoutine = useData((s) => s.deleteRoutine);
  const openPanel = useUi((s) => s.openPanel);
  const showToast = useUi((s) => s.showToast);

  const today = todayISO();
  const [offset, setOffset] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState(false);
  const [day, setDay] = useState<DaySettings>(loadDay);
  const [dayDraft, setDayDraft] = useState<{ wake: number; bed: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraft(null);
        setRemoving(false);
        setDayDraft(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const WAKE = toMin(day.wake),
    BED = toMin(day.bed);
  const weekStartDate = addDays(startOfWeek(today, ws), 7 * offset);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)), [weekStartDate]);

  const cols = useMemo(
    () =>
      dates.map((d) => {
        const list = itemsFor(d, routine, events, tasks);
        return { date: d, list, clashes: clashesOf(d, list) };
      }),
    [dates, routine, events, tasks],
  );
  const allClashes = cols.flatMap((c) => c.clashes);

  const todayList = useMemo(() => {
    const list = itemsFor(today, routine, events, tasks).sort((a, b) => a.sM - b.sM);
    return list;
  }, [today, routine, events, tasks]);
  const todayClashes = clashesOf(today, todayList);

  const selBlock = selId ? (routine.find((r) => r.id === selId) ?? null) : null;
  const selGroup = selBlock ? groupOf(selBlock, routine) : [];

  const yOf = (min: number) => ((min - WAKE) / 60) * ROW;
  const H1 = Math.ceil(BED / 60);
  const firstPartial = ((Math.ceil(WAKE / 60) * 60 - WAKE) / 60) * ROW;
  const hourRows: { label: string; h: number }[] = [];
  if (firstPartial > 0) hourRows.push({ label: fmtTime(day.wake, tf), h: firstPartial });
  for (let h = Math.ceil(WAKE / 60); h < H1; h++) hourRows.push({ label: fmtTime(`${String(h).padStart(2, "0")}:00`, tf), h: ROW });
  const gridH = hourRows.reduce((a, r) => a + r.h, 0);

  const weekLabel = (): string => {
    if (offset === 0) return t("THIS WEEK");
    if (Math.abs(offset) === 1) {
      const a = fromISO(dates[0]),
        b = fromISO(dates[6]);
      const am = MONTHS[a.getMonth()].slice(0, 3).toUpperCase(),
        bm = MONTHS[b.getMonth()].slice(0, 3).toUpperCase();
      return a.getMonth() === b.getMonth() ? `${am} ${a.getDate()}–${b.getDate()}` : `${am} ${a.getDate()}–${bm} ${b.getDate()}`;
    }
    return t("WEEK {n}", { n: `${offset > 0 ? "+" : ""}${offset}` });
  };

  const openDraftNew = (dayIdx?: number, startMin?: number): void => {
    const s = startMin === undefined ? 9 * 60 : Math.max(0, Math.min(startMin, 22 * 60 + 30));
    setDraft({ mode: "add", ids: [], title: "", start: fromMin(s), end: fromMin(Math.min(s + 60, 1439)), color: EVENT_COLORS[0], days: [dayIdx ?? dayOfRoutine(today)], every: 1 });
  };

  const openEdit = (): void => {
    if (!selBlock) return;
    const g = selGroup;
    setDraft({
      mode: "edit",
      ids: g.map((x) => x.id),
      title: selBlock.title,
      start: selBlock.start,
      end: selBlock.end,
      color: selBlock.color,
      days: g.map((x) => x.day),
      every: Math.max(1, selBlock.everyWeeks),
    });
  };

  const submit = async (): Promise<void> => {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title || draft.days.length === 0 || toMin(draft.end) <= toMin(draft.start)) return;
    const common = { title, start: draft.start, end: draft.end, color: draft.color, everyWeeks: draft.every };
    if (draft.mode === "add") {
      for (const d of [...draft.days].sort((a, b) => a - b)) await addRoutine({ ...common, day: d });
      showToast(t('Routine "{title}" saved', { title }));
    } else {
      const existing = routine.filter((r) => draft.ids.includes(r.id));
      for (const r of existing) {
        if (draft.days.includes(r.day)) await updateRoutine(r.id, common);
        else await deleteRoutine(r.id);
      }
      for (const d of draft.days) if (!existing.some((r) => r.day === d)) await addRoutine({ ...common, day: d });
      showToast(t('Routine "{title}" updated', { title }));
      setSelId(null);
    }
    setDraft(null);
  };

  const remove = async (): Promise<void> => {
    const g = selGroup;
    const title = selBlock?.title ?? t("Routine");
    for (const r of g) await deleteRoutine(r.id);
    setRemoving(false);
    setSelId(null);
    showToast(t('Routine "{title}" removed', { title }));
  };

  // ---- derived text
  const td = fromISO(today);
  const eyebrow = `${WEEKDAYS[td.getDay()].toUpperCase()} · ${MONTHS[td.getMonth()].toUpperCase()} ${td.getDate()}`;
  const first = allClashes[0];
  const greeting = first ? t("HEADS UP!") : t("HEY!");
  const botLine = first
    ? t("{cal} overlaps your {routine} on {day} by {min} min.", {
        cal: first.cal,
        routine: first.routine,
        day: WEEKDAYS[fromISO(first.date).getDay()],
        min: first.min,
      }).toUpperCase()
    : t("Your {day} starts at {time}.", { day: WEEKDAYS[td.getDay()], time: fmtTime(day.wake, tf) }).toUpperCase();

  const nextOf = (blocks: RoutineBlock[], n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < 400 && out.length < n; i++) {
      const d = addDays(today, i);
      if (blocks.some((b) => routineOccursOn(b, d, ANCHOR))) out.push(shortDate(d));
    }
    return out;
  };

  const selClashes = selBlock ? allClashes.filter((c) => selGroup.some((g) => g.id === c.routineId)) : [];
  const daysLabel = (blocks: RoutineBlock[]): string =>
    [...new Set(blocks.map((b) => b.day))]
      .sort((a, b) => a - b)
      .map((d) => routineDays()[d])
      .join(" · ");

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
      <style>{SHARED_CSS}</style>
      <PageHeader eyebrow={eyebrow} title={t("Routine")}>
        <div style={PILL_GROUP}>
          <div className="rbc-btn" onClick={() => setOffset(offset - 1)} style={navBtn}>
            ‹
          </div>
          <div
            className="rbc-today"
            onClick={() => setOffset(0)}
            style={{
              minWidth: 96,
              padding: "0 12px",
              height: 28,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              fontFamily: SILK,
              fontSize: 9,
              letterSpacing: ".05em",
              color: "#0b7a45",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {weekLabel()}
          </div>
          <div className="rbc-btn" onClick={() => setOffset(offset + 1)} style={navBtn}>
            ›
          </div>
        </div>
        <div className="rbc-primary" onClick={() => openDraftNew()} style={PRIMARY_BTN}>
          <PlusIcon />
          {t("ADD ROUTINE")}
        </div>
      </PageHeader>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, minHeight: 706 }}>
        <div style={{ flex: 1, display: "flex", gap: 26, minWidth: 0, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...GLASS_CARD, flex: 1, padding: "18px 20px 20px" }}>
              <div style={{ display: "flex", paddingLeft: 58, marginBottom: 8 }}>
                {cols.map(({ date }) => {
                  const d = fromISO(date),
                    isToday = date === today,
                    wk = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={date}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 7,
                        padding: "5px 9px",
                        borderRadius: 9,
                        background: isToday ? "rgba(215,244,229,.7)" : wk ? "rgba(18,38,30,.025)" : "transparent",
                      }}
                    >
                      <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".08em", color: "#5d6f67" }}>{dow3()[d.getDay()]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#0b7a45" : "#16211c" }}>{d.getDate()}</div>
                      <div style={{ fontFamily: SILK, fontSize: 7.5, letterSpacing: ".06em", color: "#0b7a45" }}>{isToday ? t("Today").toUpperCase() : ""}</div>
                    </div>
                  );
                })}
              </div>
              <Rule
                label={t("✦ WAKE UP {time}", { time: fmtTime(day.wake, tf) })}
                title={t("Set wake-up time")}
                color="#0b7a45"
                line="rgba(23,184,102,.35)"
                hover="rgba(23,184,102,.12)"
                padding="0 0 7px 58px"
                onClick={() => setDayDraft({ wake: WAKE, bed: BED })}
              />
              <div
                className="rb-scroll"
                style={{ position: "relative", maxHeight: 610, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "thin", scrollbarColor: "rgba(23,184,102,.45) transparent" }}
              >
                {hourRows.map((h, i) => (
                  <div key={i} style={{ display: "flex", height: h.h, boxSizing: "border-box", borderTop: "1px solid rgba(18,38,30,.06)" }}>
                    <div
                      style={{
                        width: 58,
                        flex: "none",
                        boxSizing: "border-box",
                        paddingRight: 10,
                        paddingTop: 3,
                        textAlign: "right",
                        fontSize: 10.5,
                        lineHeight: "14px",
                        color: "#5d6f67",
                        overflow: "hidden",
                      }}
                    >
                      {h.label}
                    </div>
                    {cols.map(({ date }) => {
                      const isToday = date === today,
                        wk = [0, 6].includes(fromISO(date).getDay());
                      return (
                        <div
                          key={date}
                          style={{
                            flex: 1,
                            borderLeft: "1px solid rgba(18,38,30,.06)",
                            background: isToday ? "rgba(215,244,229,.16)" : wk ? "rgba(18,38,30,.015)" : "transparent",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(18,38,30,.06)" }} />
                <div style={{ position: "absolute", left: 58, right: 0, top: 0, height: gridH, display: "flex" }}>
                  {cols.map(({ date, list }) => {
                    const laid = layoutOverlap(list.filter((b) => b.eM > WAKE && b.sM < BED));
                    return (
                      <div
                        key={date}
                        style={{ position: "relative", flex: 1, minWidth: 0, cursor: "pointer" }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const min = WAKE + ((e.clientY - rect.top) / scaleOf(e.currentTarget) / ROW) * 60;
                          openDraftNew(dayOfRoutine(date), Math.floor(min / 30) * 30);
                        }}
                      >
                        {laid
                          .filter((b) => !b.hidden)
                          .map((b) => {
                            const isCal = b.kind !== "routine";
                            const hit = laid.filter((x) => !x.hidden).some((o) => o !== b && (o.kind === "routine") !== isCal && o.sM < b.eM && b.sM < o.eM);
                            const selc = !isCal && selGroup.some((g) => g.id === b.id);
                            const cs = Math.max(b.sM, WAKE),
                              ce = Math.min(b.eM, BED);
                            const top = yOf(cs),
                              h = Math.max(18, yOf(ce) - yOf(cs));
                            const GAP = 3;
                            const amber = isCal && hit && !selc;
                            const every = b.block?.everyWeeks ?? 1;
                            const rep = b.block
                              ? every > 1
                                ? `↻${every}`
                                : routine.some((x) => x.id !== b.id && groupOf(b.block as RoutineBlock, routine).some((g) => g.id === x.id))
                                  ? "↻"
                                  : ""
                              : "";
                            const hh = Math.max(24, h - GAP * 2);
                            const bg = amber
                              ? "linear-gradient(145deg,#fff3dc,#ffe2b8)"
                              : selc
                                ? "linear-gradient(145deg,#e6f8ee,#d3f1e1)"
                                : isCal
                                  ? "linear-gradient(145deg,#ffffff,#f3f6f8)"
                                  : "linear-gradient(145deg,#ffffff,#f5f8f6)";
                            const border = amber ? "#d9952a" : selc ? "rgba(23,184,102,.5)" : isCal ? `${b.color}66` : "rgba(255,255,255,.95)";
                            const shadow = amber
                              ? "inset 0 1px 1px #fff,0 0 0 3px rgba(217,149,42,.18),0 10px 18px -10px rgba(160,100,10,.55)"
                              : selc
                                ? "inset 0 1px 1px #fff,0 8px 18px -12px rgba(23,184,102,.8)"
                                : isCal
                                  ? `inset 0 1px 1px #fff,inset 0 0 0 1px ${b.color}26,0 8px 16px -10px rgba(18,60,40,.45)`
                                  : "inset 0 1px 1px #fff,0 4px 10px -7px rgba(20,48,34,.28)";
                            const pad = hh < 30 ? "0 8px" : b.n > 1 ? (hh < 40 ? "2px 4px" : "4px") : hh < 40 ? "2px 8px" : "6px 8px";
                            const style: CSSProperties = {
                              position: "absolute",
                              left: `calc(${(b.idx * 100) / b.n}% + ${GAP}px)`,
                              width: `calc(${100 / b.n}% - ${GAP * 2}px)`,
                              top: top + GAP,
                              height: hh,
                              padding: pad,
                              boxSizing: "border-box",
                              borderRadius: 12,
                              background: bg,
                              backdropFilter: "blur(14px) saturate(170%)",
                              WebkitBackdropFilter: "blur(14px) saturate(170%)",
                              border: `1px solid ${border}`,
                              borderLeft: `3px solid ${b.color}`,
                              boxShadow: shadow,
                              zIndex: isCal ? (hit ? 4 : 3) : 1,
                              opacity: !isCal && hit && !selc ? 0.42 : 1,
                              cursor: "pointer",
                              overflow: "hidden",
                            };
                            const label = `${b.kind === "task" ? "□ " : ""}${amber ? "! " : ""}${b.title}`;
                            const timeTxt = `${compactTime(fromMin(b.sM), tf)}–${compactTime(fromMin(b.eM % 1440), tf)}`;
                            return (
                              <div
                                key={b.key}
                                className="rbc-lift"
                                style={style}
                                title={`${b.title}  ${fmtTime(fromMin(b.sM), tf)}–${fmtTime(fromMin(b.eM % 1440), tf)}${isCal ? `\n${b.kind === "task" ? t("Calendar task") : t("Calendar event")}` : `\n${t("Routine · {days}", { days: daysLabel(b.block ? groupOf(b.block, routine) : []) })}`}${amber ? `\n${t("Clash · Calendar wins")}` : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (b.kind === "routine") setSelId(selc ? null : b.id);
                                  else openPanel(b.kind, b.id);
                                }}
                              >
                                {b.more > 0 && <MoreBadge n={b.more} />}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                    height: "100%",
                                    overflow: "hidden",
                                    textAlign: "center",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, minWidth: 0, maxWidth: "100%" }}>
                                    <div
                                      style={{
                                        minWidth: 0,
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        lineHeight: 1.15,
                                        color: "#121a16",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {label}
                                    </div>
                                    {b.n === 1 && rep && <div style={{ fontFamily: SILK, fontSize: 7, color: "#0b7a45" }}>{rep}</div>}
                                  </div>
                                  {!((b.n > 1 && hh < 34) || hh < 30) && (
                                    <div
                                      style={{
                                        fontSize: 9,
                                        lineHeight: 1.15,
                                        color: "#5d6f67",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      {timeTxt}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Rule
                label={t("☾ BEDTIME {time}", { time: fmtTime(day.bed, tf) })}
                title={t("Set bedtime")}
                color="#5d6f67"
                line="rgba(18,38,30,.16)"
                hover="rgba(18,38,30,.06)"
                padding="8px 0 0 58px"
                onClick={() => setDayDraft({ wake: WAKE, bed: BED })}
              />
            </div>
          </div>

          {/* right column: height follows the scheduler, Today list scrolls inside */}
          <div style={{ width: 314, flex: "none", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ flex: "none" }}>
                <Terminal name="rabit@routine" greeting={greeting} line={botLine} />
              </div>

              {selBlock ? (
                <div style={{ ...SIDE_CARD, flex: "none", padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={SILK_LABEL}>{t("ROUTINE")}</div>
                    <div style={{ width: 9, height: 9, borderRadius: 2, border: `2px solid ${selBlock.color}`, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#16211c", marginBottom: 4 }}>{selBlock.title}</div>
                  <div style={{ fontSize: 13, color: "#5d6f67" }}>
                    {daysLabel(selGroup)} · {fmtTime(selBlock.start, tf)} — {fmtTime(selBlock.end, tf)}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(18,38,30,.08)" }}>
                    <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".1em", color: "#0b7a45", marginBottom: 8 }}>{t("REPEATS")}</div>
                    <div style={{ fontSize: 13, color: "#2b3a34", fontWeight: 600 }}>
                      {selBlock.everyWeeks <= 1
                        ? t("Every week on {days}", { days: daysLabel(selGroup) })
                        : t("Every {n} weeks on {days}", { n: selBlock.everyWeeks, days: daysLabel(selGroup) })}
                    </div>
                  </div>
                  {nextOf(selGroup, 3).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ ...SILK_LABEL, fontSize: 9, marginBottom: 8 }}>{t("NEXT")}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {nextOf(selGroup, 3).map((n) => (
                          <div
                            key={n}
                            style={{
                              fontFamily: SILK,
                              fontSize: 9,
                              letterSpacing: ".03em",
                              color: "#0b7a45",
                              padding: "4px 8px",
                              borderRadius: 7,
                              background: "rgba(215,244,229,.9)",
                              border: "1px solid rgba(23,184,102,.22)",
                            }}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selClashes.length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 9,
                        padding: "11px 12px",
                        borderRadius: 12,
                        background: "rgba(201,138,30,.1)",
                        border: "1px solid rgba(201,138,30,.3)",
                      }}
                    >
                      <div style={{ fontFamily: SILK, fontSize: 11, color: "#a06810" }}>!</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#7a5210" }}>
                        {selClashes
                          .map((c) =>
                            t("{cal} overlaps {routine} on {day} by {min} min. Calendar wins.", {
                              cal: c.cal,
                              routine: c.routine,
                              day: WEEKDAYS[fromISO(c.date).getDay()],
                              min: c.min,
                            }),
                          )
                          .join(" ")}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <div
                      onClick={openEdit}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        padding: 10,
                        borderRadius: 11,
                        background: "#16211c",
                        color: "#fff",
                        fontFamily: SILK,
                        fontSize: 9,
                        letterSpacing: ".05em",
                        cursor: "pointer",
                      }}
                    >
                      {t("EDIT")}
                    </div>
                    <div
                      onClick={() => setRemoving(true)}
                      style={{
                        width: 42,
                        flex: "none",
                        display: "grid",
                        placeItems: "center",
                        padding: 10,
                        borderRadius: 11,
                        border: "1px solid rgba(18,38,30,.1)",
                        background: "rgba(255,255,255,.7)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#a8443a" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ ...SIDE_CARD, flex: 1, minHeight: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", padding: "22px 24px", borderRadius: 30 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={SILK_LABEL}>{t("TODAY")}</div>
                    <div
                      onClick={() => setDayDraft({ wake: WAKE, bed: BED })}
                      title={t("Day settings")}
                      className="rbc-scale"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        background: "rgba(255,255,255,.75)",
                        boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0b7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3Z" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 6 }}>
                    <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 62, lineHeight: 0.9, color: "#121a16", letterSpacing: "-.02em" }}>{td.getDate()}</div>
                    <div style={{ paddingBottom: 8 }}>
                      <div
                        style={{
                          display: "inline-block",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#0b7a45",
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "rgba(23,184,102,.14)",
                        }}
                      >
                        {WEEKDAYS[td.getDay()]}
                      </div>
                      <div style={{ fontSize: 13, color: "#5d6f67", marginTop: 6 }}>
                        {tn(todayList.length, "item", "items")} · {tn(new Set(todayClashes.map((c) => c.cal)).size, "clash", "clashes")}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setDayDraft({ wake: WAKE, bed: BED })}
                    style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, padding: "8px 14px", borderRadius: 16, cursor: "pointer" }}
                    className="rbc-cell"
                  >
                    <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: tf === "12h" ? 12 : 17, color: "#0b7a45", width: 56 }}>{fmtTime(day.wake, tf)}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("✦ Wake up")}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8b9a93" }}>{t("Edit")}</div>
                  </div>

                  <div style={{ height: 1, background: "rgba(18,38,30,.08)", margin: "12px 0 10px", flex: "none" }} />
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      margin: "0 -4px",
                      padding: "0 4px 2px",
                      scrollbarWidth: "thin",
                      scrollbarColor: "rgba(18,38,30,.16) transparent",
                    }}
                  >
                    {todayList.length === 0 && <div style={{ fontSize: 12.5, color: "#8b9a93", padding: "6px 14px" }}>{t("Nothing scheduled today.")}</div>}
                    {todayList.map((it) => {
                      const cal = it.kind !== "routine";
                      const clash = todayList.some((o) => o !== it && (o.kind === "routine") !== cal && overlaps(it, o) > 0);
                      const amber = clash && cal,
                        dim = clash && !cal;
                      return (
                        <div
                          key={it.key}
                          onClick={() => {
                            if (cal) openPanel(it.kind as "event" | "task", it.id);
                            else setSelId(it.id);
                          }}
                          style={{
                            flex: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "9px 14px",
                            borderRadius: 16,
                            cursor: "pointer",
                            background: amber ? "linear-gradient(145deg,#fff3dc,#ffe7c4)" : cal ? "rgba(255,255,255,.9)" : "transparent",
                            boxShadow: amber ? "inset 0 0 0 1px rgba(217,149,42,.4)" : cal ? "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)" : "none",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "Doto,monospace",
                              fontWeight: 900,
                              fontSize: tf === "12h" ? 11 : 16,
                              color: amber ? "#b07414" : cal ? "#121a16" : "#a3b0aa",
                              width: 52,
                            }}
                          >
                            {fmtTime(fromMin(it.sM), tf)}
                          </div>
                          <div style={{ width: 3, height: 16, flex: "none", borderRadius: 3, background: cal ? it.color : "transparent" }} />
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 13.5,
                              fontWeight: cal ? 700 : 500,
                              color: dim ? "#a3b0aa" : cal ? "#121a16" : "#5d6f67",
                              textDecoration: dim ? "line-through" : "none",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {it.title}
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: amber ? "#b07414" : dim ? "#8f9d97" : cal ? "#41504a" : "#0b7a45" }}>
                            {amber ? t("! Clash") : cal ? (it.kind === "task" ? t("Task") : t("Event")) : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    onClick={() => setDayDraft({ wake: WAKE, bed: BED })}
                    style={{ flex: "none", marginTop: 12, display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderRadius: 16, cursor: "pointer" }}
                    className="rbc-cell"
                  >
                    <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: tf === "12h" ? 12 : 17, color: "#41504a", width: 56 }}>{fmtTime(day.bed, tf)}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("☾ Bedtime")}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8b9a93" }}>{t("Edit")}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 14, display: "flex", alignItems: "center", gap: 20, paddingLeft: 4 }}>
          <Legend mark={<div style={{ width: 9, height: 9, borderRadius: 2, border: "1.5px solid #17b866", boxSizing: "border-box" }} />} text={t("Routine")} />
          <Legend mark={<div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4b7fd6" }} />} text={t("Calendar event")} />
          <Legend mark={<div style={{ width: 9, height: 9, borderRadius: 2, border: `1.5px solid ${TASK_COLOR}`, boxSizing: "border-box" }} />} text={t("Task")} />
          <div style={{ fontSize: 11.5, color: "#8b9a93" }}>{t("Calendar items always sit on top of your routine.")}</div>
        </div>
      </div>

      {draft && <RoutineModal draft={draft} setDraft={setDraft} tf={tf} today={today} onSave={submit} />}

      {dayDraft && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 36, display: "grid", placeItems: "center", background: "rgba(16,32,25,.3)", backdropFilter: "blur(6px)" }}
          onClick={() => setDayDraft(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 400, borderRadius: 30, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", color: "#121a16" }}>{t("Your day")}</div>
              <div
                className="rbc-close"
                onClick={() => setDayDraft(null)}
                style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", color: "#5d6f67", fontSize: 16 }}
              >
                ×
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "#5d6f67", marginBottom: 16 }}>{t("RaBit builds your routine grid between these two times.")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Stepper
                label={t("✦ Wake up")}
                value={fmtTime(fromMin(dayDraft.wake), tf)}
                onMinus={() => setDayDraft({ ...dayDraft, wake: Math.max(240, dayDraft.wake - 30) })}
                onPlus={() => setDayDraft({ ...dayDraft, wake: Math.min(dayDraft.bed - 360, dayDraft.wake + 30) })}
              />
              <Stepper
                label={t("☾ Bedtime")}
                value={fmtTime(fromMin(dayDraft.bed), tf)}
                onMinus={() => setDayDraft({ ...dayDraft, bed: Math.max(dayDraft.wake + 360, dayDraft.bed - 30) })}
                onPlus={() => setDayDraft({ ...dayDraft, bed: Math.min(1439, dayDraft.bed + 30) })}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <div
                onClick={() => setDayDraft(null)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: 12,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.75)",
                  boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.35)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2b3a34",
                  cursor: "pointer",
                }}
              >
                {t("Cancel")}
              </div>
              <div
                onClick={() => {
                  const nd = { wake: fromMin(dayDraft.wake), bed: fromMin(dayDraft.bed) };
                  setDay(nd);
                  saveDay(nd);
                  setDayDraft(null);
                }}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: 12,
                  borderRadius: 999,
                  background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 14px 26px -14px rgba(23,184,102,1)",
                }}
              >
                {t("Save")}
              </div>
            </div>
          </div>
        </div>
      )}

      {removing && selBlock && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 35, display: "grid", placeItems: "center", background: "rgba(16,32,25,.36)", backdropFilter: "blur(6px)" }}
          onClick={() => setRemoving(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 380, padding: 24 }}>
            <div style={{ fontFamily: SILK, fontSize: 12, letterSpacing: ".06em", color: "#16211c", marginBottom: 12 }}>{t("REMOVE ROUTINE?")}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#16211c" }}>{selBlock.title}</div>
            <div style={{ fontSize: 12.5, color: "#5d6f67", marginTop: 4 }}>
              {daysLabel(selGroup)} · {fmtTime(selBlock.start, tf)} — {fmtTime(selBlock.end, tf)}
            </div>
            <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 12, lineHeight: 1.5 }}>{t("This will remove the recurring routine from every week.")}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <div className="rbc-ghost" onClick={() => setRemoving(false)} style={ghostBtn}>
                {t("Cancel")}
              </div>
              <div
                onClick={() => void remove()}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: 11,
                  borderRadius: 11,
                  background: "#a8443a",
                  color: "#fff",
                  fontFamily: SILK,
                  fontSize: 10,
                  letterSpacing: ".05em",
                  cursor: "pointer",
                }}
              >
                {t("REMOVE")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = { width: 30, height: 28, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "#41504a", fontSize: 13 } as const;

const modalBox: CSSProperties = {
  borderRadius: 28,
  background: "linear-gradient(150deg,rgba(255,255,255,.9),rgba(245,250,247,.78))",
  backdropFilter: "blur(30px) saturate(170%)",
  WebkitBackdropFilter: "blur(30px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.9)",
  boxShadow: "inset 0 1px 1px #fff,0 40px 90px -30px rgba(12,40,26,.55)",
  animation: "rb-fade .18s ease-out",
};
const ghostBtn: CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: 11,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.9)",
  background: "linear-gradient(145deg,rgba(255,255,255,.85),rgba(255,255,255,.55))",
  boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.35)",
  fontSize: 13,
  fontWeight: 600,
  color: "#2b3a34",
  cursor: "pointer",
};

function Legend({ mark, text }: { mark: JSX.Element; text: string }): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {mark}
      <div style={{ fontSize: 11.5, color: "#5d6f67" }}>{text}</div>
    </div>
  );
}

function Rule({
  label,
  title,
  color,
  line,
  hover,
  padding,
  onClick,
}: {
  label: string;
  title: string;
  color: string;
  line: string;
  hover: string;
  padding: string;
  onClick: () => void;
}): JSX.Element {
  const [h, setH] = useState(false);
  const dash = `repeating-linear-gradient(90deg,${line} 0 5px,transparent 5px 10px)`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding }}>
      <div style={{ flex: 1, height: 1, background: dash }} />
      <div
        onClick={onClick}
        title={title}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: SILK,
          fontSize: 7.5,
          letterSpacing: ".12em",
          color,
          background: h ? hover : "transparent",
          transition: "background .2s ease-out",
        }}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3Z" />
        </svg>
      </div>
      <div style={{ flex: 1, height: 1, background: dash }} />
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }): JSX.Element {
  const btn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: "#fff",
    boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
    fontSize: 18,
    color: "#1d2a24",
    userSelect: "none",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderRadius: 20,
        background: "rgba(255,255,255,.7)",
        boxShadow: "inset 0 1px 1px #fff",
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#5d6f67" }}>{label}</div>
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 32, lineHeight: 1.1, color: "#121a16" }}>{value}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="rbc-scale" onClick={onMinus} style={btn}>
          −
        </div>
        <div className="rbc-scale" onClick={onPlus} style={btn}>
          +
        </div>
      </div>
    </div>
  );
}

function RoutineModal({
  draft,
  setDraft,
  tf,
  today,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  tf: "12h" | "24h";
  today: ISODate;
  onSave: () => Promise<void>;
}): JSX.Element {
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const valid = draft.title.trim().length > 0 && draft.days.length > 0 && toMin(draft.end) > toMin(draft.start);
  const sortedDays = [...draft.days].sort((a, b) => a - b);
  const selDays = sortedDays.map((d) => routineDays()[d]).join(" · ") || "—";
  const every = draft.every;

  const nextDates: string[] = [];
  for (let i = 0; i < 400 && nextDates.length < 4 && sortedDays.length > 0; i++) {
    const d = addDays(today, i);
    const hit = sortedDays.some((day) => routineOccursOn({ id: "", title: "", day, start: draft.start, end: draft.end, color: draft.color, everyWeeks: every }, d, ANCHOR));
    if (hit) nextDates.push(`${shortDate(d).replace(/^(\w)(\w+)/, (_m, a: string, b: string) => a + b.toLowerCase())} · ${routineDayFull(dayOfRoutine(d))}`);
  }

  const field: CSSProperties = {
    padding: "11px 13px",
    borderRadius: 14,
    background: "rgba(255,255,255,.8)",
    border: "1px solid rgba(18,38,30,.09)",
    fontSize: 13,
    color: "#16211c",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const lbl: CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "#5d6f67", marginBottom: 6 };

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 30, display: "grid", placeItems: "center", background: "rgba(16,32,25,.36)", backdropFilter: "blur(6px)" }}
      onClick={() => setDraft(null)}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 660, maxHeight: "88%", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(18,38,30,.07)" }}>
          <div style={{ fontFamily: SILK, fontSize: 13, letterSpacing: ".06em", color: "#16211c" }}>{draft.mode === "add" ? t("ADD ROUTINE") : t("EDIT ROUTINE")}</div>
          <div
            className="rbc-close"
            onClick={() => setDraft(null)}
            style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: "#5d6f67", fontSize: 15, cursor: "pointer" }}
          >
            ×
          </div>
        </div>
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={lbl}>{t("Title")}</div>
            <input
              autoFocus
              maxLength={TITLE_MAX}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSave();
              }}
              placeholder={t("Gym")}
              style={{ ...field, background: "#fff", border: "1px solid rgba(23,184,102,.4)", boxShadow: "0 0 0 3px rgba(23,184,102,.1)", fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
            <div>
              <div style={lbl}>{t("Start time")}</div>
              <select value={draft.start} onChange={(e) => set({ start: e.target.value })} style={field}>
                {timeOptions(draft.start).map((o) => (
                  <option key={o} value={o}>
                    {fmtTime(o, tf)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={lbl}>{t("End time")}</div>
              <select value={draft.end} onChange={(e) => set({ end: e.target.value })} style={field}>
                {timeOptions(draft.end).map((o) => (
                  <option key={o} value={o}>
                    {fmtTime(o, tf)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={lbl}>{t("Color")}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 13px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.8)",
                  border: "1px solid rgba(18,38,30,.09)",
                }}
              >
                {EVENT_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => set({ color: c })}
                    style={{ width: 16, height: 16, borderRadius: 5, cursor: "pointer", background: c, boxShadow: draft.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ ...lbl, marginBottom: 8 }}>{t("Repeat on")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {routineDays().map((label, i) => {
                const on = draft.days.includes(i);
                return (
                  <div
                    key={label}
                    onClick={() => set({ days: on ? draft.days.filter((x) => x !== i) : [...draft.days, i] })}
                    style={{
                      flex: 1,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 10,
                      fontFamily: SILK,
                      fontSize: 11,
                      cursor: "pointer",
                      color: on ? "#fff" : "#5d6f67",
                      background: on ? "linear-gradient(150deg,#1fc172,#0f9a56)" : "rgba(255,255,255,.7)",
                      border: `1px solid ${on ? "#17b866" : "rgba(18,38,30,.09)"}`,
                      boxShadow: on ? "0 8px 16px -10px rgba(23,184,102,.9)" : "none",
                    }}
                  >
                    {label[0]}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ ...lbl, marginBottom: 8 }}>{t("Repeat frequency")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: 1, label: t("Every week") },
                { id: 2, label: t("2 weeks") },
                { id: 3, label: t("3 weeks") },
                { id: 4, label: t("4 weeks") },
              ].map((iv) => (
                <div
                  key={iv.id}
                  onClick={() => set({ every: iv.id })}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    textAlign: "center",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: every === iv.id ? "#0b7a45" : "#5d6f67",
                    background: every === iv.id ? "rgba(215,244,229,.95)" : "rgba(255,255,255,.7)",
                    border: `1px solid ${every === iv.id ? "rgba(23,184,102,.35)" : "rgba(18,38,30,.09)"}`,
                  }}
                >
                  {iv.label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 240px",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(238,250,243,.7)",
              border: "1px solid rgba(23,184,102,.2)",
            }}
          >
            <div>
              <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".1em", color: "#0b7a45", marginBottom: 9 }}>{t("REPEATS")}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#16211c", lineHeight: 1.5 }}>
                {every === 1 ? t("Every week on {days}", { days: selDays }) : t("Every {n} weeks on {days}", { n: every, days: selDays })}
              </div>
              <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 6 }}>{draft.days.length === 1 ? t("1 day selected") : t("{n} days selected", { n: draft.days.length })}</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(23,184,102,.2)", paddingLeft: 14 }}>
              <div style={{ ...SILK_LABEL, fontSize: 9, marginBottom: 9 }}>{t("NEXT")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {nextDates.map((n) => (
                  <div key={n} style={{ fontSize: 12.5, color: "#2b3a34", fontWeight: 600 }}>
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!valid && draft.title.trim().length > 0 && (
            <div style={{ fontSize: 12, color: "#a8443a" }}>{draft.days.length === 0 ? t("Pick at least one day.") : t("End time must be after start time.")}</div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 2 }}>
            <div className="rbc-ghost" onClick={() => setDraft(null)} style={{ ...ghostBtn, flex: "none", padding: "11px 18px" }}>
              {t("Cancel")}
            </div>
            <div
              className="rbc-primary"
              onClick={() => void onSave()}
              style={{ ...PRIMARY_BTN, padding: "11px 20px", opacity: valid ? 1 : 0.5, pointerEvents: valid ? "auto" : "none" }}
            >
              {draft.mode === "add" ? t("SAVE ROUTINE") : t("SAVE CHANGES")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
