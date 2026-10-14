/**
 * Página de inicio: terminal de RaBit con el próximo evento, próximos, tareas pendientes (con animación FLIP
 * al completarlas), notas rápidas y columna lateral con el calendario de hoy.
 *
 * La columna derecha usa `contain: size` para no influir en la altura natural de la página: así una lista larga
 * hace scroll dentro de su tarjeta en vez de estirar (y encoger) toda la interfaz.
 */
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { addDays, diffDays, fmtTime, fromISO, MONTHS, startOfWeek, todayISO, toMin, WEEKDAYS } from "../../domain/dates";
import { eventsOn, overlapMin, routineOccursOn } from "../../domain/logic";
import type { CalEvent, ISODate } from "../../domain/types";
import { t } from "../../i18n";
import { useUpdatedNotice } from "../../app/useUpdatedNotice";
import { Hero } from "./Hero";
import { QuickNotes } from "./QuickNotes";
import { SideColumn } from "./SideColumn";
import { TasksCard } from "./TasksCard";
import { UpcomingCard } from "./UpcomingCard";
import { colorOf, glassBtn, Hv, Plus } from "./parts";
import { occurrences, ROUTINE_ANCHOR, type Occ } from "./model";
import { useCalAlignment } from "./useCalAlignment";
import { useHomeTasks } from "./useHomeTasks";

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

  const { orderedTasks, listRef, onToggle } = useHomeTasks(tasks, toggleTask, showToast);
  const { leftRef, heroRef, endRef, calTop } = useCalAlignment(tasks.length, events.length, notes.length, routine.length);

  /* ---------- greeting ---------- */
  const hour = now.getHours();
  const notice = useUpdatedNotice();
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
          <div data-tour="create" style={{ display: "flex", gap: 8 }}>
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
              <Hv onClick={() => openPanel("note", null)} hover={{ transform: "scale(1.03)", color: "var(--rb-green-deep)" }} style={glassBtn}>
                <Plus color="#17b866" />
                {t("Note")}
              </Hv>
            )}
            <Hv onClick={() => openPanel("task", null)} hover={{ transform: "scale(1.03)", color: "var(--rb-green-deep)" }} style={glassBtn}>
              <Plus color="#17b866" />
              {t("Task")}
            </Hv>
          </div>
        </PageHeader>

        {/* HERO */}
        <Hero
          heroRef={heroRef}
          notice={notice}
          greet={greet}
          name={name}
          nextOcc={nextOcc}
          nextDate={nextDate}
          deadlineLine={deadlineLine}
          calOn={calOn}
          eventsThisWeek={eventsThisWeek}
          openCount={openCount}
          fmtEvTime={fmtEvTime}
          openPanel={openPanel}
        />

        {/* UPCOMING + TASKS */}
        <div ref={endRef} style={{ display: "flex", gap: 18, flex: "1 1 226px", minHeight: 0 }}>
          {calOn && <UpcomingCard upcoming={upcoming} today={today} fmtEvTime={fmtEvTime} setPage={setPage} openPanel={openPanel} />}

          {/* TASKS */}
          <TasksCard
            orderedTasks={orderedTasks}
            listRef={listRef}
            today={today}
            tf={tf}
            doneCount={doneCount}
            openCount={openCount}
            planeAdding={planeAdding}
            deleteDoneTasks={deleteDoneTasks}
            onToggle={onToggle}
            openPanel={openPanel}
          />
        </div>

        {/* QUICK NOTES */}
        {notesOn && <QuickNotes quickNotes={quickNotes} tags={tags} nowMs={nowMs} today={today} openPanel={openPanel} />}
      </div>

      {/* RIGHT COLUMN */}
      {sideCol && (
        <SideColumn
          calTop={calTop}
          now={now}
          today={today}
          weekDays={weekDays}
          tf={tf}
          calOn={calOn}
          routineOn={routineOn}
          todayCal={todayCal}
          todayRoutine={todayRoutine}
          dayHasItems={dayHasItems}
          setPage={setPage}
          openPanel={openPanel}
        />
      )}
    </div>
  );
}
