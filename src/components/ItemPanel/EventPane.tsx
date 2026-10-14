/**
 * Detalle de un evento: vista de lectura, edición con borrador (Guardar/Cancelar) y creación.
 * A diferencia de notas y tareas, NO autoguarda: el evento se escribe al pulsar Guardar.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fmtDay, fmtTime } from "../../domain/dates";
import { EVENT_COLORS, TITLE_MAX, type CalEvent, type ISODate, type Remind, type RepeatKind } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { t } from "../../i18n";
import { DateField } from "./DatePicker";
import type { PaneProps } from "./NotePane";
import { EventReadView } from "./EventReadView";
import { FlagButton } from "./FlagButton";
import { ReminderEditor } from "./ReminderEditor";
import { eventChips, fromEvent, MUTEDC, sectionLabel, type Form } from "./eventModel";
import { EASE, FAINT, GREEN, Ico, INK, Pill, SPRING, Seg, Toggle, fieldCard, greenGrad, reset, silk } from "./ui";

export function EventPane({
  id,
  seed,
  onStatus,
  onCreated,
  onDelete,
  onCancelNew,
  onEditing,
}: PaneProps & { onCancelNew: () => void; onEditing: (b: boolean) => void; seed?: { date?: ISODate; time?: string } }) {
  const ev = useData((s) => (id ? (s.events.find((e) => e.id === id) ?? null) : null));
  const events = useData((s) => s.events);
  const tasks = useData((s) => s.tasks);
  const tf = useData((s) => s.settings.timeFormat);
  const calendarOn = useData((s) => s.settings.modules.calendar);
  const addEvent = useData((s) => s.addEvent);
  const updateEvent = useData((s) => s.updateEvent);
  const showToast = useUi((s) => s.showToast);

  const [editing, setEditing] = useState(!ev);
  const init = useMemo(() => fromEvent(ev, seed), [ev, seed]);
  const [f, setF] = useState<Form>(init.f);
  const [rem, setRem] = useState<Remind>(init.rem);
  const [remOn, setRemOn] = useState(init.remOn);
  const [remText, setRemText] = useState(String(init.rem.n));
  const titleRef = useRef<HTMLInputElement>(null);
  const busy = useMemo(() => new Set<ISODate>([...events.map((e) => e.date), ...tasks.map((t) => t.date)]), [events, tasks]);

  useEffect(() => {
    onEditing(editing);
    return () => onEditing(false);
  }, [editing, onEditing]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const startEdit = () => {
    const i = fromEvent(ev, seed);
    setF(i.f);
    setRem(i.rem);
    setRemOn(i.remOn);
    setRemText(String(i.rem.n));
    setEditing(true);
    window.setTimeout(() => titleRef.current?.focus(), 30);
  };
  const cancel = () => {
    if (!ev) {
      onCancelNew();
      return;
    }
    setEditing(false);
  };
  const canSave = f.title.trim().length > 0;

  const save = async () => {
    if (!canSave) {
      titleRef.current?.focus();
      return;
    }
    const remind: Remind | null = remOn ? rem : null;
    const data = { ...f, title: f.title.trim(), repeat: f.recurring ? (f.repeat ?? "weekly") : null, remind };
    onStatus("saving");
    if (ev) await updateEvent(ev.id, data);
    else {
      const n = await addEvent(data);
      onCreated(n.id);
    }
    onStatus("saved");
    showToast(ev ? t("Event saved") : t("Event created"));
    setEditing(false);
  };

  const accent = f.color;
  const cur = ev ?? null;
  const when = (e: Pick<CalEvent, "date" | "allDay" | "start" | "end">) => {
    return `${fmtDay(e.date)} · ${e.allDay ? t("All day") : `${fmtTime(e.start, tf)} – ${fmtTime(e.end, tf)}`}`;
  };

  const chips = cur ? eventChips(cur, when) : [];

  const calLink = calendarOn && (
    <button
      type="button"
      onClick={() => {
        const u = useUi.getState();
        u.setPage("calendar");
        u.closePanel();
      }}
      style={{ ...reset, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: GREEN, padding: "6px 4px", borderRadius: 8 }}
    >
      {t("View in Calendar")} {Ico.chev}
    </button>
  );

  const titleBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div aria-hidden="true" style={{ width: 12, height: 28, flex: "none", borderRadius: 6, background: accent, transition: "background .4s ease" }} />
      {editing ? (
        <input
          ref={titleRef}
          className="ip-bare"
          maxLength={TITLE_MAX}
          aria-label={t("Event title")}
          autoFocus={!ev}
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={t("Untitled event")}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", color: INK }}
        />
      ) : (
        <h2
          style={{
            flex: 1,
            minWidth: 0,
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-.02em",
            color: INK,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cur?.title || t("Untitled event")}
        </h2>
      )}
    </div>
  );

  const wrap: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    scrollbarWidth: "none",
    padding: "14px 34px 26px 30px",
    animation: `rb-toast .35s ${EASE} both`,
  };

  if (!editing && cur) {
    return <EventReadView wrap={wrap} titleBar={titleBar} chips={chips} calLink={calLink} cur={cur} when={when} onEdit={startEdit} onDelete={onDelete} />;
  }

  const flag = (key: "important" | "allDay" | "recurring", label: string) => (
    <FlagButton
      key={key}
      on={f[key]}
      label={label}
      onToggle={() => {
        set(key, !f[key]);
        if (key === "recurring" && !f[key] && !f.repeat) set("repeat", "weekly");
      }}
    />
  );

  const timeBox: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 0",
    border: 0,
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    color: INK,
    boxSizing: "border-box",
  };

  return (
    <div style={wrap}>
      {titleBar}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, minHeight: 20 }}>{ev && calLink}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr) minmax(0,1.2fr)", gap: 12 }}>
          <div>
            <div style={sectionLabel}>{t("Date")}</div>
            <DateField variant="field" value={f.date} onChange={(d) => set("date", d)} busy={busy} />
          </div>
          <div>
            <div style={sectionLabel}>{t("Time")}</div>
            <div
              className="ip-focus-within"
              style={{ ...fieldCard, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", opacity: f.allDay ? 0.4 : 1, transition: "opacity .35s ease" }}
            >
              <input type="time" aria-label={t("Start time")} disabled={f.allDay} value={f.start} onChange={(e) => set("start", e.target.value)} style={timeBox} />
              <span aria-hidden="true" style={{ color: FAINT, fontWeight: 600 }}>
                —
              </span>
              <input type="time" aria-label={t("End time")} disabled={f.allDay} value={f.end} onChange={(e) => set("end", e.target.value)} style={timeBox} />
            </div>
          </div>
          <div>
            <div style={sectionLabel}>{t("Color")}</div>
            <div
              role="radiogroup"
              aria-label={t("Event color")}
              style={{ ...fieldCard, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px" }}
            >
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={f.color === c}
                  aria-label={t("Color {c}", { c })}
                  onClick={() => set("color", c)}
                  style={{
                    ...reset,
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: c,
                    boxShadow: f.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : "none",
                    transform: `scale(${f.color === c ? 1.15 : 1})`,
                    transition: `transform .35s ${SPRING},box-shadow .3s ease`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {flag("important", t("Important"))}
          {flag("allDay", t("All day"))}
          {flag("recurring", t("Recurring"))}
        </div>
        {f.recurring && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, animation: `rb-toast .35s ${EASE} both` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MUTEDC }}>{t("Repeats")}</div>
            <Seg<RepeatKind>
              label={t("Repeat frequency")}
              value={f.repeat ?? "weekly"}
              onChange={(v) => set("repeat", v)}
              stretch={false}
              pad="6px 13px"
              options={[
                ["weekly", t("Weekly")],
                ["monthly", t("Monthly")],
                ["yearly", t("Yearly")],
              ]}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", ...fieldCard }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="ip-autodel" style={{ fontSize: 14, fontWeight: 700, color: INK }}>
              {t("Delete after event")}
            </div>
            <div style={{ fontSize: 12, color: MUTEDC, marginTop: 3 }}>{t("Automatically remove this event after its scheduled time has passed.")}</div>
          </div>
          <Toggle on={f.autoDeleteAfter} onChange={(v) => set("autoDeleteAfter", v)} label={t("Delete after event")} />
        </div>

        <ReminderEditor rem={rem} setRem={setRem} remOn={remOn} setRemOn={setRemOn} remText={remText} setRemText={setRemText} />

        <div>
          <label htmlFor="ip-ev-desc" style={{ ...silk(9.5), display: "block", marginBottom: 8 }}>
            {t("Description").toUpperCase()}
          </label>
          <textarea
            id="ip-ev-desc"
            className="ip-bare"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={t("Location, agenda, links…")}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 70,
              resize: "vertical",
              border: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#1d2a24",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 8, borderTop: "1px solid rgba(18,38,30,.07)" }}>
        <div style={{ fontSize: 12, color: FAINT }}>
          {ev ? t("Editing event") : t("New event")} · {fmtDay(f.date)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill
            onClick={cancel}
            className="ip-h-scale4"
            style={{
              padding: "11px 22px",
              fontSize: 13,
              color: "#1d2a24",
              background: "rgba(255,255,255,.85)",
              boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.4)",
            }}
          >
            {t("Cancel")}
          </Pill>
          <Pill
            onClick={() => void save()}
            className="ip-h-scale4"
            style={{
              padding: "11px 24px",
              fontFamily: "Silkscreen,monospace",
              fontSize: 11,
              letterSpacing: ".12em",
              color: "#fff",
              background: greenGrad,
              opacity: canSave ? 1 : 0.6,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 12px 22px -12px rgba(23,184,102,.95)",
            }}
          >
            {ev ? t("Save changes").toUpperCase() : t("Save event").toUpperCase()}
          </Pill>
        </div>
      </div>
    </div>
  );
}
