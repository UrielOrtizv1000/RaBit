/**
 * Detalle de una tarea con autoguardado: título, fecha, hora opcional, importancia y descripción.
 */
import { useMemo, useRef, useState } from "react";
import { fmtDay, relDay, todayISO } from "../../domain/dates";
import { TITLE_MAX, type HHMM, type ISODate } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { t } from "../../i18n";
import { DateField } from "./DatePicker";
import type { PaneProps } from "./NotePane";
import { EASE, FAINT, GREEN, Ico, INK, Pill, RED, Seg, silk, useAutosave, CheckBox, reset } from "./ui";

export function TaskPane({ id, seed, onStatus, onCreated, onDelete }: PaneProps & { seed?: { date?: ISODate; time?: string } }) {
  const task = useData((s) => (id ? (s.tasks.find((t) => t.id === id) ?? null) : null));
  const tasks = useData((s) => s.tasks);
  const events = useData((s) => s.events);
  const calendarOn = useData((s) => s.settings.modules.calendar);
  const addTask = useData((s) => s.addTask);
  const updateTask = useData((s) => s.updateTask);
  const toggleTask = useData((s) => s.toggleTask);
  const { setPage, closePanel } = useUi.getState();

  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.description ?? "");
  const [date, setDate] = useState<ISODate>(task?.date ?? seed?.date ?? todayISO());
  const [time, setTime] = useState<HHMM | null>(task?.time ?? seed?.time ?? null);
  const [important, setImportant] = useState(task?.important ?? false);
  const [localDone, setLocalDone] = useState(false);
  const idRef = useRef<string | null>(id);
  const titleRef = useRef<HTMLInputElement>(null);
  const done = task ? task.done : localDone;
  const busy = useMemo(() => new Set<ISODate>([...tasks.map((t) => t.date), ...events.map((e) => e.date)]), [tasks, events]);

  const schedule = useAutosave(async () => {
    const patch = { title, description: desc, date, time, important };
    if (idRef.current) {
      await updateTask(idRef.current, patch);
      return;
    }
    if (!title.trim() && !desc.trim()) return;
    const t = await addTask({ ...patch, done: localDone, doneAt: localDone ? Date.now() : null });
    idRef.current = t.id;
    onCreated(t.id);
  }, onStatus);

  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      schedule();
    };
  const toggleDone = () => {
    if (idRef.current) void toggleTask(idRef.current);
    else {
      setLocalDone((d) => !d);
      schedule();
    }
  };

  const meta = !task ? t("New task") : `${done ? t("Completed") + " · " : ""}${relDay(task.date)}${task.time ? ` · ${task.time}` : ""}`;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        scrollbarWidth: "none",
        padding: "14px 34px 26px 30px",
        animation: `rb-toast .35s ${EASE} both`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <CheckBox on={done} size={28} radius={10} label={done ? t("Mark task as not done") : t("Mark task as done")} onToggle={toggleDone} border="rgba(18,38,30,.2)" />
        <input
          ref={titleRef}
          className="ip-bare"
          maxLength={TITLE_MAX}
          aria-label={t("Task title")}
          autoFocus={!task}
          value={title}
          onChange={(e) => edit(setTitle)(e.target.value)}
          placeholder={t("Untitled task")}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            background: "transparent",
            fontFamily: "inherit",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-.02em",
            color: done ? "#6d7b75" : INK,
            textDecoration: done ? "line-through" : "none",
          }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 20 }}>
        <DateField variant="chip" value={date} onChange={edit(setDate)} busy={busy} />
        <input
          type="time"
          aria-label={t("Time (optional)")}
          value={time ?? ""}
          onChange={(e) => edit(setTime)(e.target.value || null)}
          style={{
            width: 112,
            border: 0,
            borderRadius: 999,
            background: "rgba(18,38,30,.05)",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            color: "#41504a",
            boxSizing: "border-box",
            padding: "8px 12px",
          }}
        />
        {time && (
          <button
            type="button"
            aria-label={t("Clear time")}
            className="ip-h-ghost2"
            onClick={() => edit(setTime)(null)}
            style={{ ...reset, width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", color: FAINT, fontSize: 14 }}
          >
            ×
          </button>
        )}
        <Seg
          label={t("Priority")}
          value={important ? "important" : "normal"}
          onChange={(v) => edit(setImportant)(v === "important")}
          redId="important"
          stretch={false}
          pad="7px 13px"
          options={[
            ["normal", t("Normal")],
            ["important", t("! Important")],
          ]}
        />
        <div style={{ flex: 1 }} />
        {calendarOn && (
          <button
            type="button"
            onClick={() => {
              setPage("calendar");
              closePanel();
            }}
            style={{ ...reset, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: GREEN, padding: "6px 4px", borderRadius: 8 }}
          >
            {t("View in Calendar")} {Ico.chev}
          </button>
        )}
      </div>

      <div style={{ height: 1, background: "rgba(18,38,30,.07)", margin: "22px 0 18px" }} />
      <label htmlFor="ip-task-desc" style={{ ...silk(9.5), display: "block", marginBottom: 10 }}>
        {t("Description").toUpperCase()}
      </label>
      <textarea
        id="ip-task-desc"
        className="ip-bare"
        value={desc}
        onChange={(e) => edit(setDesc)(e.target.value)}
        placeholder={t("Add details, links, steps…")}
        style={{ flex: 1, minHeight: 110, resize: "none", border: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, color: "#1d2a24" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(18,38,30,.07)" }}>
        <div style={{ fontSize: 12, color: FAINT }}>
          {meta}
          {task ? "" : ` · ${fmtDay(date)}`}
        </div>
        {task && (
          <Pill className="ip-h-red" onClick={onDelete} style={{ padding: "8px 14px", color: RED }}>
            {Ico.trash()}
            {t("Delete")}
          </Pill>
        )}
      </div>
    </div>
  );
}
