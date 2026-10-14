/**
 * Página Rutina: bloques que se repiten cada semana, enlazados al calendario real (el calendario siempre gana los choques).
 * Aquí viven el estado y las acciones; el modelo está en model.ts y cada tarjeta o ventana en su propio archivo.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, fmtTime, fromISO, fromMin, MONTHS, startOfWeek, todayISO, toMin, WEEKDAYS } from "../../domain/dates";
import { routineOccursOn } from "../../domain/logic";
import { t } from "../../i18n";
import { ROUTINE_COLORS, routineColor, type RoutineBlock } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { PILL_GROUP, PRIMARY_BTN } from "../../components/ui/cardStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { PlusIcon } from "../../components/ui/PlusIcon";
import { Terminal } from "../../components/ui/Terminal";
import { ROW, SHARED_CSS, TASK_COLOR } from "../calendar/gridKit";
import { BlockDetails } from "./BlockDetails";
import { DayDialog, type DayDraft } from "./DayDialog";
import { RemoveDialog } from "./RemoveDialog";
import { RoutineGrid } from "./RoutineGrid";
import { RoutineModal } from "./RoutineModal";
import { TodayCard } from "./TodayCard";
import { Legend, navBtn } from "./parts";
import { ANCHOR, clashesOf, dayOfRoutine, groupOf, itemsFor, loadDay, routineDays, saveDay, shortDate, SILK, type Draft, type DaySettings } from "./model";

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
  const [dayDraft, setDayDraft] = useState<DayDraft | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraft(null);
        setRemoving(false);
        setDayDraft(null);
        setSelId(null);
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
    setDraft({
      mode: "add",
      ids: [],
      title: "",
      start: fromMin(s),
      end: fromMin(Math.min(s + 60, 1439)),
      color: ROUTINE_COLORS[0],
      days: [dayIdx ?? dayOfRoutine(today)],
      every: 1,
    });
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
      color: routineColor(selBlock.color),
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

  const editDay = (): void => setDayDraft({ wake: WAKE, bed: BED });
  const saveDayDraft = (nd: DaySettings): void => {
    setDay(nd);
    saveDay(nd);
    setDayDraft(null);
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
      <style>{SHARED_CSS}</style>
      <PageHeader eyebrow={eyebrow} title={t("Routine")}>
        <div data-tour="rt-nav" style={PILL_GROUP}>
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
              color: "var(--rb-green-deep)",
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
        <div data-tour="rt-add" className="rbc-primary" onClick={() => openDraftNew()} style={PRIMARY_BTN}>
          <PlusIcon />
          {t("ADD ROUTINE")}
        </div>
      </PageHeader>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, minHeight: 706 }}>
        <div data-tour="rt-grid" style={{ flex: 1, display: "flex", gap: 26, minWidth: 0, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <RoutineGrid
              cols={cols}
              today={today}
              day={day}
              tf={tf}
              WAKE={WAKE}
              BED={BED}
              hourRows={hourRows}
              gridH={gridH}
              yOf={yOf}
              selGroup={selGroup}
              routine={routine}
              daysLabel={daysLabel}
              openDraftNew={openDraftNew}
              setSelId={setSelId}
              openPanel={openPanel}
              onEditDay={editDay}
            />
          </div>

          {/* right column: height follows the scheduler, Today list scrolls inside */}
          <div style={{ width: 314, flex: "none", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ flex: "none" }}>
                <Terminal name="rabit@routine" greeting={greeting} line={botLine} />
              </div>

              {selBlock ? (
                <BlockDetails
                  block={selBlock}
                  days={daysLabel(selGroup)}
                  next={nextOf(selGroup, 3)}
                  clashes={selClashes}
                  tf={tf}
                  onBack={() => setSelId(null)}
                  onEdit={openEdit}
                  onRemove={() => setRemoving(true)}
                />
              ) : (
                <TodayCard todayDate={td} list={todayList} clashes={todayClashes} day={day} tf={tf} setSelId={setSelId} openPanel={openPanel} onEditDay={editDay} />
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

      {dayDraft && <DayDialog dayDraft={dayDraft} setDayDraft={setDayDraft} tf={tf} onSave={saveDayDraft} />}

      {removing && selBlock && <RemoveDialog block={selBlock} days={daysLabel(selGroup)} tf={tf} onCancel={() => setRemoving(false)} onRemove={() => void remove()} />}
    </div>
  );
}
