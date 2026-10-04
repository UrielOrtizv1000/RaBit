/**
 * Página de inicio: terminal de RaBit con el próximo evento, próximos, tareas pendientes (con animación FLIP
 * al completarlas), notas rápidas y columna lateral con el calendario de hoy.
 *
 * La columna derecha usa `contain: size` para no influir en la altura natural de la página: así una lista larga
 * hace scroll dentro de su tarjeta en vez de estirar (y encoger) toda la interfaz.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { scaleOf } from "../../lib/zoom";
import { PageHeader } from "../../components/ui/PageHeader";
import { swipeProps, type SwipeProps } from "../../lib/swipe";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { addDays, diffDays, fmtTime, fromISO, MONTHS, relDay, startOfWeek, todayISO, toMin, WEEKDAYS } from "../../domain/dates";
import { eventsOn, overlapMin, routineOccursOn, sortTasks } from "../../domain/logic";
import type { CalEvent, ISODate, Note, Task } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { t, tn } from "../../i18n";

const ROUTINE_ANCHOR: ISODate = "2024-01-01";
const EASE = "cubic-bezier(.22,1,.36,1)";

/* ---------- shared style tokens (copied from the design) ---------- */
/** Recorta un título largo para mostrarlo en espacios reducidos. */
const clip = (t: string, n: number): string => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

const label10: CSSProperties = silk(12, { letterSpacing: ".14em", color: "#6b7a73" });
const cardBase: CSSProperties = {
  position: "relative",
  padding: "24px 24px 18px",
  borderRadius: 30,
  background: "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
  backdropFilter: "blur(24px) saturate(170%)",
  WebkitBackdropFilter: "blur(24px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.8)",
  boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.3)",
  transition: "transform .25s ease-out,box-shadow .25s ease-out",
};
const cardHover: CSSProperties = { transform: "translateY(-2px)", boxShadow: "inset 0 1px 1px #fff,0 30px 54px -28px rgba(20,48,34,.36)" };
const glassBtn: CSSProperties = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 999,
  background: "linear-gradient(145deg,rgba(255,255,255,.8),rgba(255,255,255,.46))",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,.9)",
  boxShadow: "inset 0 1px 1px #fff,0 12px 24px -18px rgba(20,48,34,.5)",
  color: "#1d2a24",
  fontSize: 13,
  fontWeight: 600,
  transition: "transform .15s ease-out",
};
const circleBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  background: "rgba(255,255,255,.75)",
  boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
  transition: "transform .15s ease-out",
};

interface HvProps {
  style: CSSProperties;
  hover?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  title?: string;
  children?: ReactNode;
  tid?: string;
  swipe?: SwipeProps;
}
/** div con estilo de hover (el diseño usa style-hover). */
function Hv({ style, hover, onClick, title, children, tid, swipe }: HvProps) {
  const [on, setOn] = useState(false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLDivElement>);
    }
  };
  return (
    <div
      data-tid={tid}
      title={title}
      {...swipe}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? onKey : undefined}
      onClick={onClick}
      onMouseEnter={() => {
        if (!document.documentElement.dataset.swiping) setOn(true);
      }}
      onMouseLeave={() => {
        if (!document.documentElement.dataset.swiping) setOn(false);
      }}
      style={on && hover ? { ...style, ...hover } : style}
    >
      {children}
    </div>
  );
}

const Plus = ({ color, size = 12, style }: { color: string; size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" style={style}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);
const Chevron = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3l5 5-5 5" />
  </svg>
);

/* ---------- helpers ---------- */
interface Occ {
  ev: CalEvent;
  date: ISODate;
}
function occurrences(events: CalEvent[], from: ISODate, days: number): Occ[] {
  const out: Occ[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    for (const ev of eventsOn(events, d)) out.push({ ev, date: d });
  }
  return out;
}
function ago(ms: number, now: number): string {
  const m = Math.max(0, Math.floor((now - ms) / 60000));
  if (m < 1) return t("Just now");
  if (m < 60) return t("{n} min ago", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("{n} h ago", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("1 day ago") : t("{n} days ago", { n: d });
}
const hasDigit = (s: string) => /\d/.test(s);
const colorOf = (c: string) => (c ? c : "#17b866");

export function HomePage() {
  const user = useData((s) => s.user);
  const settings = useData((s) => s.settings);
  const tasks = useData((s) => s.tasks);
  const events = useData((s) => s.events);
  const notes = useData((s) => s.notes);
  const tags = useData((s) => s.tags);
  const routine = useData((s) => s.routine);
  const toggleTask = useData((s) => s.toggleTask);
  const deleteDoneTasks = useData((s) => s.deleteDoneTasks);
  const openPanel = useUi((s) => s.openPanel);
  const setPage = useUi((s) => s.setPage);
  const showToast = useUi((s) => s.showToast);
  const panel = useUi((s) => s.panel);

  const { calendar: calOn, routine: routineOn, notes: notesOn } = settings.modules;
  const tf = settings.timeFormat;

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const today = todayISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  /* ---------- derived data ---------- */
  const weekStartISO = startOfWeek(today, settings.weekStart);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStartISO, i)), [weekStartISO]);
  const eventsThisWeek = useMemo(() => weekDays.reduce((n, d) => n + eventsOn(events, d).length, 0), [weekDays, events]);
  const openCount = tasks.filter((t) => !t.done).length;

  const nextOcc = useMemo<Occ | null>(() => {
    const list = occurrences(events, today, 120).filter((o) => o.date !== today || o.ev.allDay || toMin(o.ev.end) >= nowMin);
    return list.find((o) => o.ev.important) ?? list[0] ?? null;
  }, [events, today, nowMin]);
  const upcoming = useMemo(() => occurrences(events, addDays(today, 1), 120).slice(0, 3), [events, today]);

  const todayEvents = useMemo(() => eventsOn(events, today), [events, today]);
  const todayCal = useMemo(() => {
    type Row = { k: "event" | "task"; id: string; time: string; sortKey: number; title: string; kind: string; color: string };
    const rows: Row[] = [
      ...todayEvents.map<Row>((e) => ({
        k: "event",
        id: e.id,
        time: e.allDay ? "—" : e.start,
        sortKey: e.allDay ? -1 : toMin(e.start),
        title: e.title || t("Untitled event"),
        kind: "Event",
        color: colorOf(e.color),
      })),
      ...tasks
        .filter((tk) => tk.date === today && tk.time && !tk.done)
        .map<Row>((tk) => ({
          k: "task",
          id: tk.id,
          time: tk.time ?? "",
          sortKey: toMin(tk.time ?? "00:00"),
          title: tk.title || t("Untitled task"),
          kind: "Task",
          color: "#8a6fd6",
        })),
    ];
    return rows.sort((a, b) => a.sortKey - b.sortKey);
  }, [todayEvents, tasks, today]);

  const todayRoutine = useMemo(
    () =>
      routine
        .filter((r) => routineOccursOn(r, today, ROUTINE_ANCHOR))
        .sort((a, b) => toMin(a.start) - toMin(b.start))
        .map((r) => {
          const hit = todayEvents.find((e) => !e.allDay && overlapMin(r.start, r.end, e.start, e.end) > 0);
          return {
            id: r.id,
            time: r.start,
            title: r.title,
            note: hit ? (hit.title ? t("Overlaps {title} · calendar wins", { title: hit.title }) : t("Overlaps an event · calendar wins")) : "",
          };
        }),
    [routine, today, todayEvents],
  );

  const dayHasItems = (d: ISODate) => eventsOn(events, d).length > 0 || tasks.some((t) => t.date === d && !t.done);

  const quickNotes = useMemo(
    () =>
      notes
        .filter((n) => n.deletedAt === null)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
        .slice(0, 3),
    [notes],
  );

  /* ---------- tasks: strike, settle, FLIP ---------- */
  const [unsettled, setUnsettled] = useState<Set<string>>(() => new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const m = timers.current;
    return () => {
      m.forEach(clearTimeout);
    };
  }, []);

  const orderedTasks = useMemo<Task[]>(() => {
    const virt = tasks.map((t) => (unsettled.has(t.id) ? { ...t, done: false } : t));
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return sortTasks(virt).map((t) => byId.get(t.id) ?? t);
  }, [tasks, unsettled]);

  const listRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<Map<string, number>>(new Map());
  const seen = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-tid]"));
    const zf = scaleOf(el);
    const base = el.getBoundingClientRect().top - el.scrollTop * zf;
    const cur = new Map<string, number>();
    rows.forEach((r) => cur.set(r.dataset.tid ?? "", (r.getBoundingClientRect().top - base) / zf));
    const flipped: HTMLElement[] = [];
    rows.forEach((r) => {
      const id = r.dataset.tid ?? "";
      const old = lastPos.current.get(id);
      const nu = cur.get(id) ?? 0;
      if (old === undefined) {
        if (seen.current && !seen.current.has(id)) {
          r.animate(
            [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 500, delay: 250, easing: EASE, fill: "backwards" },
          );
        }
        return;
      }
      const d = old - nu;
      if (Math.abs(d) < 1) return;
      r.style.transition = "none";
      r.style.transform = `translateY(${d}px)`;
      flipped.push(r);
    });
    if (flipped.length) {
      void el.offsetHeight;
      requestAnimationFrame(() =>
        flipped.forEach((r) => {
          r.style.transition = `transform .65s ${EASE}, opacity .3s ease-out, background .2s ease-out`;
          r.style.transform = "";
          setTimeout(() => {
            r.style.transition = "";
          }, 700);
        }),
      );
    }
    lastPos.current = cur;
    seen.current = new Set(rows.map((r) => r.dataset.tid ?? ""));
  });

  const onToggle = (tk: Task) => (e: MouseEvent) => {
    e.stopPropagation();
    const id = tk.id;
    const clear = () => {
      const h = timers.current.get(id);
      if (h) clearTimeout(h);
      timers.current.delete(id);
    };
    clear();
    if (!tk.done) {
      setUnsettled((s) => new Set(s).add(id));
      void toggleTask(id);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setUnsettled((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
        }, 450),
      );
      showToast(t("Task completed"), () => {
        clear();
        setUnsettled((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        void toggleTask(id);
      });
    } else {
      setUnsettled((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      void toggleTask(id);
    }
  };

  /* ---------- right column alignment (hero top → end of last row) ---------- */
  const leftRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [cal, setCal] = useState<{ top: number; h: number }>({ top: 0, h: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const l = leftRef.current,
        h = heroRef.current,
        e = endRef.current;
      if (!l || !h || !e) return;
      // offsetTop = medida de layout: no la afectan ni la escala de la página ni las animaciones de entrada
      void l;
      void e;
      const top = h.offsetTop;
      const height = 0;
      setCal((c) => (c.top === top && c.h === height ? c : { top, h: height }));
    };
    measure();
    const t1 = setTimeout(measure, 120),
      t2 = setTimeout(measure, 600); // tras el ajuste de escala de la página
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (leftRef.current) ro.observe(leftRef.current);
    if (document.fonts) void document.fonts.ready.then(measure);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
    };
  }, [tasks.length, events.length, notes.length, routine.length]);

  /* ---------- greeting ---------- */
  const hour = now.getHours();
  const greet = hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");
  const name = user?.name?.trim() || t("there");
  const dayLabel = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`.toUpperCase();
  const planeAdding = panel?.kind === "task" && panel.id === null;

  const doneCount = tasks.filter((t) => t.done).length;
  const daysLeft = nextOcc ? diffDays(nextOcc.date, today) : 0;
  const deadlineLine = !nextOcc ? null : daysLeft === 0 ? t("IS TODAY") : daysLeft === 1 ? t("IS IN 1 DAY") : t("IS IN {n} DAYS", { n: daysLeft });
  const nextDate = nextOcc ? fromISO(nextOcc.date) : null;
  const sideCol = calOn || routineOn;

  const fmtEvTime = (e: CalEvent) => (e.allDay ? t("All day") : fmtTime(e.start, tf));

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 26, minHeight: "100%" }}>
      {/* LEFT / MAIN */}
      <div ref={leftRef} style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <PageHeader eyebrow={dayLabel}>
          <div style={{ display: "flex", gap: 8 }}>
            {calOn && (
              <Hv
                onClick={() => openPanel("event", null)}
                hover={{ transform: "scale(1.03)", color: "#fff" }}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 999,
                  background: "linear-gradient(150deg,#1c2a23,#121a16)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.14),0 14px 26px -16px rgba(12,24,18,.9)",
                  transition: "transform .15s ease-out",
                }}
              >
                <Plus color="#7add9f" />
                {t("Event")}
              </Hv>
            )}
            {notesOn && (
              <Hv onClick={() => openPanel("note", null)} hover={{ transform: "scale(1.03)", color: "#0b7a45" }} style={glassBtn}>
                <Plus color="#17b866" />
                {t("Note")}
              </Hv>
            )}
            <Hv onClick={() => openPanel("task", null)} hover={{ transform: "scale(1.03)", color: "#0b7a45" }} style={glassBtn}>
              <Plus color="#17b866" />
              {t("Task")}
            </Hv>
          </div>
        </PageHeader>

        {/* HERO */}
        <div
          ref={heroRef}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 270px",
            gap: 14,
            alignItems: "center",
            padding: "14px 26px",
            borderRadius: 34,
            background: "linear-gradient(130deg,rgba(255,255,255,.74) 0%,rgba(236,250,242,.5) 55%,rgba(206,240,222,.42) 100%)",
            backdropFilter: "blur(26px) saturate(175%)",
            WebkitBackdropFilter: "blur(26px) saturate(175%)",
            border: "1px solid rgba(255,255,255,.85)",
            boxShadow: "inset 0 1px 1px #fff,inset 0 -18px 40px -26px rgba(255,255,255,.8),0 30px 60px -34px rgba(18,60,40,.36)",
            animation: "rb-rise .45s ease-out .05s both",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "6%",
              right: "6%",
              top: 0,
              height: "46%",
              borderRadius: "34px 34px 50% 50%",
              background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.75),rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* terminal */}
            <div
              style={{
                position: "relative",
                borderRadius: 28,
                background: "linear-gradient(150deg,rgba(12,24,18,.9),rgba(16,40,29,.82))",
                backdropFilter: "blur(24px) saturate(160%)",
                border: "1px solid rgba(255,255,255,.12)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(61,220,132,.08),0 30px 60px -30px rgba(10,30,20,.75)",
                animation: "rb-slide .5s cubic-bezier(.2,.8,.3,1) .35s both",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "8%",
                  right: "8%",
                  top: 0,
                  height: "40%",
                  borderRadius: "28px 28px 50% 50%",
                  background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.1),rgba(255,255,255,0) 70%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -34,
                  top: 96,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "linear-gradient(150deg,rgba(12,24,18,.88),rgba(16,40,29,.8))",
                  border: "1px solid rgba(255,255,255,.12)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -58,
                  top: 130,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "linear-gradient(150deg,rgba(12,24,18,.88),rgba(16,40,29,.8))",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, padding: "14px 20px 0" }}>
                <div style={{ width: 6, height: 6, background: "#3ddc84" }} />
                <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.45)" }} />
                <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.2)" }} />
                <div style={{ marginLeft: 6, ...silk(9, { letterSpacing: ".12em", color: "rgba(110,230,164,.75)" }) }}>rabit@home ~ reminder</div>
              </div>
              <div style={{ position: "relative", padding: "8px 24px 12px" }}>
                <div style={{ ...silk(12, { color: "#6ee6a4", letterSpacing: ".08em" }), marginBottom: 8 }}>&gt; {`${greet}, ${name}`.toUpperCase()}!</div>
                <div
                  style={{
                    fontFamily: "Doto,monospace",
                    fontWeight: 900,
                    fontSize: 30,
                    lineHeight: 1.12,
                    letterSpacing: ".01em",
                    color: "#3ddc84",
                    textShadow: "0 0 14px rgba(61,220,132,.55)",
                  }}
                >
                  {nextOcc && deadlineLine ? (
                    <>
                      {t("NEXT EVENT: {title}", { title: clip(nextOcc.ev.title || t("Untitled event"), 14).toUpperCase() })}
                      <br />
                      {deadlineLine}
                    </>
                  ) : (
                    <>{t("NO DEADLINES IN SIGHT")}</>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 26,
                      marginLeft: 10,
                      verticalAlign: -3,
                      background: "#3ddc84",
                      boxShadow: "0 0 10px rgba(61,220,132,.8)",
                      animation: "rb-cursor 1.1s steps(1) infinite",
                    }}
                  />
                </div>
                <div style={{ marginTop: 12, fontSize: 13.5, color: "#a9c6b8", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>
                  {`${calOn ? (eventsThisWeek === 1 ? t("1 event this week") : t("{n} events this week", { n: eventsThisWeek })) + " · " : ""}${openCount === 1 ? t("1 task open") : t("{n} tasks open", { n: openCount })}`}
                </div>
              </div>
            </div>

            {/* next event pill */}
            {calOn && (
              <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                {nextOcc && nextDate ? (
                  <>
                    <Hv
                      onClick={() => openPanel("event", nextOcc.ev.id)}
                      hover={{ transform: "translateY(-2px)", boxShadow: "inset 0 1px 1px #fff,0 22px 36px -20px rgba(18,60,40,.55)" }}
                      style={{
                        cursor: "pointer",
                        position: "relative",
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 14px 12px 20px",
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "linear-gradient(145deg,rgba(255,255,255,.88),rgba(255,255,255,.5))",
                        backdropFilter: "blur(20px) saturate(170%)",
                        border: "1px solid rgba(255,255,255,.95)",
                        boxShadow: "inset 0 1px 1px #fff,inset 0 -6px 14px -10px rgba(255,255,255,.9),0 16px 32px -20px rgba(18,60,40,.5)",
                        transition: "transform .2s ease-out,box-shadow .2s ease-out",
                      }}
                    >
                      <div style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: colorOf(nextOcc.ev.color), animation: "rb-pulse 2.4s infinite" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#121a16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {nextOcc.ev.title || t("Untitled event")}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#5d6f67", marginTop: 2 }}>
                          {WEEKDAYS[nextDate.getDay()]}, {MONTHS[nextDate.getMonth()].slice(0, 3)} {nextDate.getDate()} · {fmtEvTime(nextOcc.ev)}
                        </div>
                      </div>
                      {nextOcc.ev.important && (
                        <div style={{ flex: "none", padding: "6px 11px", borderRadius: 999, background: "rgba(192,74,66,.1)", fontSize: 11.5, fontWeight: 600, color: "#a8443a" }}>
                          ! {t("Important")}
                        </div>
                      )}
                    </Hv>
                    <Hv
                      onClick={() => openPanel("event", nextOcc.ev.id)}
                      hover={{ transform: "scale(1.03)", color: "#fff" }}
                      style={{
                        cursor: "pointer",
                        flex: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 24px",
                        borderRadius: 999,
                        background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                        color: "#fff",
                        fontSize: 13.5,
                        fontWeight: 600,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                        transition: "transform .15s ease-out",
                      }}
                    >
                      {t("View event")}
                      <Chevron color="#fff" size={12} />
                    </Hv>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 20px",
                        borderRadius: 999,
                        border: "1px dashed rgba(18,38,30,.18)",
                        fontSize: 13.5,
                        color: "#5d6f67",
                      }}
                    >
                      {t("Nothing coming up. Enjoy the quiet.")}
                    </div>
                    <Hv
                      onClick={() => openPanel("event", null)}
                      hover={{ transform: "scale(1.03)", color: "#fff" }}
                      style={{
                        cursor: "pointer",
                        flex: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 24px",
                        borderRadius: 999,
                        background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                        color: "#fff",
                        fontSize: 13.5,
                        fontWeight: 600,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                        transition: "transform .15s ease-out",
                      }}
                    >
                      {t("New event")}
                      <Plus color="#fff" />
                    </Hv>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ position: "relative", display: "grid", placeItems: "center", height: 200 }}>
            <div
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle,rgba(255,255,255,.9),rgba(214,242,227,.3) 62%,rgba(214,242,227,0) 72%)",
              }}
            />
            <div style={{ position: "absolute", bottom: 12, width: 120, height: 16, borderRadius: "50%", background: "rgba(20,60,40,.14)", filter: "blur(10px)" }} />
            <img
              src="/rabit.png"
              alt="RaBit"
              style={{
                position: "relative",
                width: 196,
                height: 196,
                objectFit: "contain",
                imageRendering: "pixelated",
                animation: "rb-pop .8s cubic-bezier(.3,1.3,.5,1) .1s both,rb-float 5.4s ease-in-out .95s infinite",
                filter: "contrast(.86) brightness(1.06) saturate(.92) hue-rotate(-8deg) drop-shadow(0 0 18px rgba(61,220,132,.4)) drop-shadow(0 16px 24px rgba(20,60,40,.22))",
              }}
            />
          </div>
        </div>

        {/* UPCOMING + TASKS */}
        <div ref={endRef} style={{ display: "flex", gap: 18, flex: "1 1 226px", minHeight: 0 }}>
          {calOn && (
            <Hv
              hover={cardHover}
              style={{
                ...cardBase,
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                animation: "rb-rise .45s ease-out .15s both",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={label10}>{t("UPCOMING")}</div>
                <div
                  onClick={() => setPage("calendar")}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#0b7a45" }}
                >
                  {t("Calendar")}
                  <Chevron color="#0b7a45" />
                </div>
              </div>
              <div className="rb-noscroll rb-fade-bottom" style={{ flex: 1, minHeight: 0, margin: "0 -10px", padding: "0 10px 22px" }}>
                {upcoming.length === 0 && (
                  <div style={{ padding: "26px 14px", borderRadius: 18, border: "1px dashed rgba(18,38,30,.14)", fontSize: 13, color: "#5d6f67", textAlign: "center" }}>
                    {t("Nothing on the horizon.")}{" "}
                    <span onClick={() => openPanel("event", null)} style={{ color: "#0b7a45", fontWeight: 600, cursor: "pointer" }}>
                      {t("Plan something")}
                    </span>
                  </div>
                )}
                {upcoming.map(({ ev, date }) => {
                  const d = fromISO(date);
                  const left = diffDays(date, today);
                  return (
                    <Hv
                      key={`${ev.id}-${date}`}
                      swipe={swipeProps({ kind: "event", id: ev.id, title: ev.title })}
                      onClick={() => openPanel("event", ev.id)}
                      hover={{ background: "rgba(255,255,255,.7)" }}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 14px",
                        margin: "0 -10px",
                        borderRadius: 18,
                        transition: "background .2s ease-out",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          flex: "none",
                          borderRadius: 12,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,.75)",
                          boxShadow: "inset 0 1px 1px #fff,0 4px 10px -6px rgba(20,48,34,.3)",
                        }}
                      >
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".06em", color: colorOf(ev.color) }}>{MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}</div>
                        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, lineHeight: 1, color: "#121a16" }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: "#121a16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ev.title || t("Untitled event")}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#5d6f67", marginTop: 2 }}>
                          {WEEKDAYS[d.getDay()]} · {fmtEvTime(ev)}
                          {ev.important ? ` · ${t("Important")}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#41504a", padding: "6px 11px", borderRadius: 999, background: "rgba(18,38,30,.05)", flex: "none" }}>
                        {tn(left, "day", "days")}
                      </div>
                    </Hv>
                  );
                })}
              </div>
            </Hv>
          )}

          {/* TASKS */}
          <Hv
            hover={cardHover}
            style={{
              ...cardBase,
              flex: 1,
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "rb-rise .45s ease-out .2s both",
            }}
          >
            <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={label10}>{t("PENDING TASKS")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {doneCount > 0 && (
                  <Hv
                    onClick={() => {
                      void deleteDoneTasks();
                    }}
                    hover={{ background: "rgba(18,38,30,.08)", color: "#a8443a" }}
                    style={{
                      cursor: "pointer",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#5d6f67",
                      padding: "5px 11px",
                      borderRadius: 999,
                      background: "rgba(18,38,30,.05)",
                      transition: "background .2s ease-out,color .2s ease-out",
                    }}
                  >
                    {t("Delete done tasks")}
                  </Hv>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0b7a45", padding: "5px 11px", borderRadius: 999, background: "rgba(23,184,102,.12)" }}>
                  {t("{n} open", { n: openCount })}
                </div>
                <Hv onClick={() => openPanel("task", null)} title={t("New task")} hover={{ transform: "scale(1.08)" }} style={circleBtn}>
                  <Plus color="#0b7a45" style={{ transform: `rotate(${planeAdding ? 45 : 0}deg)`, transition: `transform .5s ${EASE}` }} />
                </Hv>
              </div>
            </div>
            <div ref={listRef} className="rb-noscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "0 -12px", padding: "0 12px 4px", scrollbarWidth: "none" }}>
              {orderedTasks.length === 0 && (
                <div style={{ padding: "26px 14px", borderRadius: 18, border: "1px dashed rgba(18,38,30,.14)", fontSize: 13, color: "#5d6f67", textAlign: "center" }}>
                  {t("Nothing to do.")}{" "}
                  <span onClick={() => openPanel("task", null)} style={{ color: "#0b7a45", fontWeight: 600, cursor: "pointer" }}>
                    {t("Add a task")}
                  </span>
                </div>
              )}
              {orderedTasks.map((tk) => {
                const done = tk.done;
                const due = `${relDay(tk.date, today)}${tk.time ? ` · ${fmtTime(tk.time, tf)}` : ""}`;
                return (
                  <Hv
                    key={tk.id}
                    tid={tk.id}
                    swipe={swipeProps({ kind: "task", id: tk.id, title: tk.title })}
                    onClick={() => openPanel("task", tk.id)}
                    hover={{ background: "rgba(255,255,255,.7)" }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                      padding: "11px 14px",
                      margin: "0 -10px",
                      borderRadius: 18,
                      cursor: "pointer",
                      opacity: done ? 0.55 : 1,
                      transition: "opacity .3s ease-out,background .2s ease-out",
                    }}
                  >
                    <div
                      role="checkbox"
                      aria-checked={done}
                      aria-label={t("Complete task")}
                      onClick={onToggle(tk)}
                      style={{
                        width: 22,
                        height: 22,
                        flex: "none",
                        boxSizing: "border-box",
                        borderRadius: 8,
                        display: "grid",
                        placeItems: "center",
                        border: `1.6px solid ${done ? "transparent" : "rgba(18,38,30,.16)"}`,
                        background: done ? "linear-gradient(150deg,#1fc172,#0f9a56)" : "rgba(255,255,255,.75)",
                        boxShadow: done ? "0 0 0 4px rgba(23,184,102,.14)" : "inset 0 1px 1px #fff",
                        transition: "background .15s ease-out,border-color .15s ease-out,box-shadow .25s ease-out",
                      }}
                    >
                      {done && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animation: "rb-tick .22s ease-out both" }}
                        >
                          <path d="M2.4 6.2 4.8 8.6 9.6 3.6" strokeDasharray="14" style={{ animation: "rb-draw .2s ease-out .05s both" }} />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          fontSize: 14.5,
                          fontWeight: 500,
                          color: done ? "#8f9d97" : "#121a16",
                          transition: "color .35s ease",
                        }}
                      >
                        {tk.title || t("Untitled task")}
                        <div
                          style={{
                            position: "absolute",
                            left: -2,
                            top: "52%",
                            height: 1.6,
                            borderRadius: 2,
                            background: "#8f9d97",
                            width: done ? "calc(100% + 4px)" : "0%",
                            transition: `width .4s ${EASE}`,
                          }}
                        />
                      </div>
                      {tk.description.trim() && (
                        <div style={{ fontSize: 12, color: "#8b9a93", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tk.description}</div>
                      )}
                    </div>
                    {tk.important && !done && (
                      <div style={{ flex: "none", padding: "3px 8px", borderRadius: 999, background: "rgba(192,74,66,.1)", fontSize: 11, fontWeight: 700, color: "#a8443a" }}>
                        !
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#6b7a73", flex: "none" }}>{due}</div>
                  </Hv>
                );
              })}
            </div>
          </Hv>
        </div>

        {/* QUICK NOTES */}
        {notesOn && (
          <div style={{ flex: "none", animation: "rb-rise .45s ease-out .25s both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px" }}>
              <div style={label10}>{t("QUICK NOTES")}</div>
              <Hv
                onClick={() => openPanel("note", null)}
                hover={{ transform: "scale(1.03)" }}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: 999,
                  background: "linear-gradient(145deg,rgba(255,255,255,.8),rgba(255,255,255,.46))",
                  border: "1px solid rgba(255,255,255,.9)",
                  boxShadow: "inset 0 1px 1px #fff",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1d2a24",
                }}
              >
                <Plus color="#17b866" size={11} />
                {t("New note")}
              </Hv>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>
              {quickNotes.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "22px 14px",
                    borderRadius: 26,
                    border: "1px dashed rgba(18,38,30,.14)",
                    fontSize: 13,
                    color: "#5d6f67",
                    textAlign: "center",
                  }}
                >
                  {t("No notes yet.")}{" "}
                  <span onClick={() => openPanel("note", null)} style={{ color: "#0b7a45", fontWeight: 600, cursor: "pointer" }}>
                    {t("Jot something down")}
                  </span>
                </div>
              )}
              {quickNotes.slice(0, 3).map((n) => (
                <NoteCard
                  key={n.id}
                  swipe={swipeProps({ kind: "note", id: n.id, title: n.title })}
                  n={n}
                  tagName={tags.find((x) => x.id === n.tagId)?.name}
                  tagColor={tags.find((x) => x.id === n.tagId)?.color}
                  nowMs={nowMs}
                  onOpen={() => openPanel("note", n.id)}
                  onCal={(e) => {
                    e.stopPropagation();
                    openPanel("task", null, { date: today });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      {sideCol && (
        <div style={{ width: 318, flex: "none", display: "flex", flexDirection: "column", contain: "size" }}>
          <div
            style={{
              position: "relative",
              marginTop: cal.top,
              flex: 1,
              minHeight: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 30,
              background: "linear-gradient(150deg,rgba(255,255,255,.8),rgba(240,250,245,.46))",
              backdropFilter: "blur(24px) saturate(170%)",
              WebkitBackdropFilter: "blur(24px) saturate(170%)",
              border: "1px solid rgba(255,255,255,.85)",
              boxShadow: "inset 0 1px 1px #fff,inset 0 -12px 26px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.34)",
              animation: "rb-rise .45s ease-out .1s both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={label10}>{MONTHS[now.getMonth()].toUpperCase()}</div>
              {calOn && (
                <Hv onClick={() => setPage("calendar")} hover={{ transform: "scale(1.08)" }} style={circleBtn}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#0b7a45" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 11 11 5M6 5h5v5" />
                  </svg>
                </Hv>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 6 }}>
              <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 76, lineHeight: 0.9, color: "#121a16", letterSpacing: "-.02em" }}>{now.getDate()}</div>
              <div style={{ paddingBottom: 8 }}>
                <div
                  style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#0b7a45", padding: "4px 10px", borderRadius: 999, background: "rgba(23,184,102,.14)" }}
                >
                  {t("Today")}
                </div>
                <div style={{ fontSize: 13, color: "#5d6f67", marginTop: 6 }}>{WEEKDAYS[now.getDay()]}</div>
              </div>
            </div>
            <div style={{ height: 20 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={silk(9, { letterSpacing: ".14em", color: "#8b9a93" })}>{t("THIS WEEK")}</div>
              {calOn && (
                <div style={{ fontSize: 11.5, color: "#5d6f67" }}>
                  <span style={{ fontWeight: 700, color: "#121a16" }}>{todayCal.length}</span> {todayCal.length === 1 ? t("item today") : t("items today")}
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, padding: 4, borderRadius: 20, background: "rgba(18,38,30,.04)" }}>
              {weekDays.map((d) => {
                const isToday = d === today;
                const dt = fromISO(d);
                const items = calOn && dayHasItems(d);
                return (
                  <Hv
                    key={d}
                    onClick={() => setPage("calendar")}
                    hover={isToday ? undefined : { background: "rgba(255,255,255,.7)" }}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                      padding: "10px 0 9px",
                      borderRadius: 16,
                      background: isToday ? "#fff" : "transparent",
                      boxShadow: isToday ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
                      transition: "background .2s ease-out",
                    }}
                  >
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: isToday ? "#0b7a45" : "#8b9a93" }}>{WEEKDAYS[dt.getDay()].charAt(0).toUpperCase()}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#0b7a45" : "#2b3a34" }}>{dt.getDate()}</div>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: items ? (isToday ? "#17b866" : "rgba(18,38,30,.22)") : "transparent" }} />
                  </Hv>
                );
              })}
            </div>

            <div style={{ height: 1, background: "rgba(18,38,30,.08)", margin: "20px 0 16px" }} />
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "0 -4px", padding: "0 4px", scrollbarWidth: "thin", scrollbarColor: "rgba(18,38,30,.16) transparent" }}>
              {calOn && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4b7fd6" }} />
                      <div style={label10}>{t("CALENDAR TODAY")}</div>
                    </div>
                    <div onClick={() => setPage("calendar")} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#0b7a45" }}>
                      {t("Open")}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {todayCal.length === 0 && (
                      <div style={{ padding: "12px 14px", borderRadius: 16, border: "1px dashed rgba(18,38,30,.14)", fontSize: 12.5, color: "#5d6f67" }}>
                        {t("Nothing scheduled today.")}
                      </div>
                    )}
                    {todayCal.map((c) => (
                      <Hv
                        key={`${c.k}-${c.id}`}
                        swipe={swipeProps({ kind: c.k, id: c.id, title: c.title })}
                        onClick={() => openPanel(c.k, c.id)}
                        hover={{ transform: "translateY(-1px)" }}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 16,
                          background: "rgba(255,255,255,.9)",
                          boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)",
                          transition: "transform .15s ease-out",
                        }}
                      >
                        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, color: "#121a16", minWidth: 48 }}>
                          {c.time === "—" || tf === "24h" || !hasDigit(c.time) ? c.time : fmtTime(c.time, tf)}
                        </div>
                        <div style={{ width: 3, height: 16, flex: "none", borderRadius: 3, background: c.color }} />
                        <div
                          style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "#121a16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {c.title}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#5d6f67" }}>{t(c.kind)}</div>
                      </Hv>
                    ))}
                  </div>
                </>
              )}

              {routineOn && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: calOn ? "20px 0 8px" : "0 0 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, border: "1.5px solid #17b866", boxSizing: "border-box" }} />
                      <div style={label10}>{t("MY ROUTINE")}</div>
                    </div>
                    <div onClick={() => setPage("routine")} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#0b7a45" }}>
                      {t("Open")}
                    </div>
                  </div>
                  {todayRoutine.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {todayRoutine.map((r) => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px" }}>
                          <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, color: "#a3b0aa", minWidth: 48 }}>{fmtTime(r.time, tf)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: "#5d6f67" }}>{r.title}</div>
                            {r.note && <div style={{ fontSize: 11, fontWeight: 600, color: "#b07414", marginTop: 1 }}>{r.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => setPage("routine")}
                      style={{
                        cursor: "pointer",
                        display: "block",
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px dashed rgba(18,38,30,.14)",
                        fontSize: 12.5,
                        color: "#5d6f67",
                      }}
                    >
                      {t("No routine today")} · <span style={{ color: "#0b7a45", fontWeight: 600 }}>{t("Set one up")}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {routineOn && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "14px 4px 0", fontSize: 12, color: "#6b7a73" }}>
                <div onClick={() => setPage("routine")} style={{ cursor: "pointer", fontWeight: 600, color: "#0b7a45" }}>
                  {t("Full week")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  n: Note;
  tagName?: string;
  tagColor?: string;
  nowMs: number;
  swipe?: SwipeProps;
  onOpen: () => void;
  onCal: (e: MouseEvent<HTMLElement>) => void;
}

function NoteCard({ n, tagName, tagColor, nowMs, onOpen, onCal, swipe }: NoteCardProps) {
  const color = tagColor ?? "#17b866";
  return (
    <Hv
      swipe={swipe}
      onClick={onOpen}
      hover={{ transform: "translateY(-3px)", boxShadow: "inset 0 1px 1px #fff,0 28px 48px -26px rgba(20,48,34,.38)" }}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "20px 22px 16px",
        borderRadius: 26,
        background: "linear-gradient(145deg,rgba(255,255,255,.74),rgba(255,255,255,.38))",
        backdropFilter: "blur(24px) saturate(170%)",
        WebkitBackdropFilter: "blur(24px) saturate(170%)",
        border: "1px solid rgba(255,255,255,.85)",
        boxShadow: "inset 0 1px 1px #fff,0 24px 48px -30px rgba(20,48,34,.3)",
        transition: "transform .2s ease-out,box-shadow .2s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color, padding: "4px 10px", borderRadius: 999, background: `${color}1f` }}>{tagName ?? t("Note")}</div>
        <div style={{ fontSize: 11.5, color: "#8b9a93" }}>{ago(n.updatedAt, nowMs)}</div>
      </div>
      <div
        style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", color: "#121a16", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {n.title || t("Untitled note")}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "#5d6f67", minHeight: 42, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {n.body}
      </div>
      <Hv
        onClick={onCal}
        hover={{ opacity: 0.75 }}
        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#0b7a45", alignSelf: "flex-start" }}
      >
        <Plus color="#17b866" size={11} />
        {t("Add to calendar")}
      </Hv>
    </Hv>
  );
}
