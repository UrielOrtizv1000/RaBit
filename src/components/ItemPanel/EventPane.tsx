/**
 * Detalle de un evento: vista de lectura, edición con borrador (Guardar/Cancelar) y creación.
 * A diferencia de notas y tareas, NO autoguarda: el evento se escribe al pulsar Guardar.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fmtDay, fmtTime, fromMin, toMin, todayISO } from "../../domain/dates";
import { EVENT_COLORS, TITLE_MAX, type CalEvent, type ISODate, type Remind, type RepeatKind } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { t, tn } from "../../i18n";
import { DateField } from "./DatePicker";
import type { PaneProps } from "./NotePane";
import { EASE, FAINT, GREEN, Ico, INK, Pill, RED, SPRING, Seg, Toggle, fieldCard, greenGrad, reset, silk } from "./ui";

type Form = Omit<CalEvent, "id" | "remind">;
const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";
const unitSpan = (n: number, u: Remind["unit"]) => (u === "days" ? tn(n, "day", "days") : tn(n, "hour", "hours"));

function fromEvent(e: CalEvent | null, seed?: { date?: ISODate; time?: string }): { f: Form; rem: Remind; remOn: boolean } {
  if (e) {
    const { id: _id, remind, ...f } = e;
    void _id;
    return { f, rem: remind ?? { n: 1, unit: "days", freq: "once" }, remOn: remind !== null };
  }
  const start = seed?.time ?? "09:00";
  return {
    f: {
      title: "",
      description: "",
      date: seed?.date ?? todayISO(),
      start,
      end: fromMin(Math.min(toMin(start) + 60, 1439)),
      allDay: false,
      color: EVENT_COLORS[0],
      important: false,
      recurring: false,
      repeat: null,
      autoDeleteAfter: false,
    },
    rem: { n: 1, unit: "days", freq: "once" },
    remOn: true,
  };
}

const MUTEDC = "#5d6f67";
const sectionLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTEDC, marginBottom: 7 };

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

  const chips = !cur
    ? []
    : (() => {
        const out: { text: string; color: string; bg: string; dot: string; mono?: boolean; square?: boolean }[] = [];
        out.push({ text: when(cur), color: GREEN, bg: "rgba(23,184,102,.12)", dot: cur.color });
        if (cur.important) out.push({ text: t("Important"), color: RED, bg: "rgba(192,74,66,.1)", dot: "#c0503f" });
        if (cur.recurring)
          out.push({
            text: cur.repeat === "monthly" ? t("Repeats monthly") : cur.repeat === "yearly" ? t("Repeats yearly") : t("Repeats weekly"),
            color: "#3d63a8",
            bg: "rgba(75,127,214,.1)",
            dot: "#4b7fd6",
          });
        if (cur.autoDeleteAfter) out.push({ text: t("Deletes after event"), color: "#8a5d0e", bg: "rgba(201,138,30,.12)", dot: "#c98a1e" });
        if (cur.remind) {
          const r = cur.remind;
          out.push({
            mono: true,
            square: true,
            text: (r.freq === "daily"
              ? r.unit === "days"
                ? t("Daily from {span} before", { span: unitSpan(r.n, r.unit) })
                : t("Hourly from {span} before", { span: unitSpan(r.n, r.unit) })
              : t("{span} before", { span: unitSpan(r.n, r.unit) })
            ).toUpperCase(),
            color: "#3ddc84",
            bg: "linear-gradient(150deg,#14261d,#10241a)",
            dot: "#3ddc84",
          });
        }
        return out;
      })();

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
    return (
      <div style={wrap}>
        {titleBar}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: 20, animation: `rb-toast .4s ${EASE} both` }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {chips.map((c) => (
              <div
                key={c.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontFamily: c.mono ? "Silkscreen,monospace" : "inherit",
                  fontSize: c.mono ? 10 : 12,
                  letterSpacing: c.mono ? ".08em" : 0,
                  fontWeight: 600,
                  color: c.color,
                  background: c.bg,
                }}
              >
                <span aria-hidden="true" style={{ width: 6, height: 6, flex: "none", borderRadius: c.square ? 0 : "50%", background: c.dot }} />
                {c.text}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            {calLink}
            <Pill
              onClick={startEdit}
              className="ip-h-scale"
              style={{
                padding: "9px 18px",
                fontSize: 13,
                color: "#fff",
                background: "linear-gradient(150deg,#1c2a23,#121a16)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.14),0 12px 22px -14px rgba(12,24,18,.9)",
              }}
            >
              {Ico.edit("#7add9f")}
              {t("Edit")}
            </Pill>
          </div>
          <div style={{ height: 1, background: "rgba(18,38,30,.07)", margin: "24px 0 20px" }} />
          <div style={{ ...silk(9.5), marginBottom: 14 }}>{t("Description").toUpperCase()}</div>
          {cur.description.trim() ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "none",
                fontSize: 21,
                lineHeight: 1.6,
                fontWeight: 500,
                letterSpacing: "-.01em",
                color: "#1d2a24",
                whiteSpace: "pre-wrap",
                textWrap: "pretty",
              }}
            >
              {cur.description}
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="ip-h-dash"
              style={{
                ...reset,
                padding: 22,
                borderRadius: 20,
                border: "1.5px dashed rgba(18,38,30,.14)",
                fontSize: 14,
                color: FAINT,
                transition: "border-color .25s ease,color .25s ease",
              }}
            >
              {t("No description yet — tap Edit to add one.")}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(18,38,30,.07)" }}>
          <div style={{ fontSize: 12, color: FAINT }}>{when(cur)}</div>
          <Pill className="ip-h-red" onClick={onDelete} style={{ padding: "8px 14px", color: RED }}>
            {Ico.trash()}
            {t("Delete")}
          </Pill>
        </div>
      </div>
    );
  }

  const flag = (key: "important" | "allDay" | "recurring", label: string) => {
    const on = f[key];
    return (
      <button
        key={key}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => {
          set(key, !on);
          if (key === "recurring" && !on && !f.repeat) set("repeat", "weekly");
        }}
        style={{
          ...reset,
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "13px 16px",
          borderRadius: 16,
          background: on ? "rgba(215,244,229,.95)" : "rgba(255,255,255,.85)",
          boxShadow: on ? "inset 0 0 0 1.5px rgba(23,184,102,.45)" : fieldCard.boxShadow,
          transition: `background .35s ${EASE},box-shadow .35s ease`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            flex: "none",
            boxSizing: "border-box",
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            border: `1.6px solid ${on ? "transparent" : "rgba(18,38,30,.3)"}`,
            background: on ? greenGrad : "#fff",
            transition: "background .3s ease,border-color .3s ease",
          }}
        >
          {on && Ico.check(10, 2.4)}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1d2a24" }}>{label}</span>
      </button>
    );
  };

  const n = rem.n,
    u = rem.unit;
  const prevSub = (() => {
    if (rem.freq !== "daily") return t("RaBit reminds you once, {span} before.", { span: unitSpan(n, u) });
    if (u === "hours") return t("RaBit reminds you every hour for the last {n} hours.", { n });
    const seq: number[] = [];
    for (let k = n; k >= 2; k--) seq.push(k);
    return seq.length ? t("RaBit reminds you every day: {list}, tomorrow and today.", { list: seq.join(", ") }) : t("RaBit reminds you every day: tomorrow and today.");
  })();
  const green = "#3ddc84",
    dim = "#a9c6b8";
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

        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            background: "linear-gradient(150deg,rgba(12,24,18,.92),rgba(16,40,29,.86))",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 24px 44px -26px rgba(10,30,20,.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(61,220,132,.12)" }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, background: green, boxShadow: "0 0 8px rgba(61,220,132,.8)", animation: "rb-pulse 2s infinite" }} />
            <div style={{ ...silk(10, ".14em", "#6ee6a4"), flex: 1 }}>{t("RABIT REMINDER")}</div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: dim }}>{remOn ? t("On") : t("Off")}</span>
            <Toggle on={remOn} onChange={setRemOn} label={t("Reminder")} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 16,
              padding: "14px 18px 18px",
              opacity: remOn ? 1 : 0.4,
              pointerEvents: remOn ? "auto" : "none",
              transition: "opacity .35s ease",
            }}
            aria-disabled={!remOn}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <label htmlFor="ip-rem-n" style={{ fontFamily: MONO, fontSize: 12, color: dim }}>
                {t("Remind me")}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="ip-rem-n"
                  inputMode="numeric"
                  maxLength={2}
                  value={remText}
                  onChange={(e) => {
                    const t = e.target.value.replace(/\D/g, "");
                    setRemText(t);
                    const v = parseInt(t, 10);
                    if (v >= 1) setRem((r) => ({ ...r, n: Math.min(30, v) }));
                  }}
                  onBlur={() => setRemText(String(rem.n))}
                  style={{
                    width: 60,
                    flex: "none",
                    boxSizing: "border-box",
                    padding: "9px 6px",
                    borderRadius: 12,
                    border: "1px solid rgba(61,220,132,.25)",
                    background: "rgba(61,220,132,.06)",
                    fontFamily: "Silkscreen,monospace",
                    fontSize: 13,
                    color: green,
                    textAlign: "center",
                  }}
                />
                <div
                  role="radiogroup"
                  aria-label={t("Reminder unit")}
                  style={{ flex: 1, display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(61,220,132,.18)" }}
                >
                  {(
                    [
                      ["days", t("days before")],
                      ["hours", t("hours before")],
                    ] as const
                  ).map(([k, l]) => {
                    const on = rem.unit === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setRem((r) => ({ ...r, unit: k }))}
                        style={{
                          ...reset,
                          flex: 1,
                          textAlign: "center",
                          padding: "7px 0",
                          borderRadius: 9,
                          fontSize: 12,
                          fontWeight: 600,
                          color: on ? "#06150e" : dim,
                          background: on ? green : "transparent",
                          transition: "background .3s ease,color .3s ease",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: dim, marginTop: 4 }} id="ip-rem-freq">
                {t("Reminder frequency")}
              </div>
              <div role="radiogroup" aria-labelledby="ip-rem-freq" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {(
                  [
                    ["once", t("Once — {span} before", { span: unitSpan(n, u) })],
                    ["daily", u === "days" ? t("Every day until event") : t("Every hour until event")],
                  ] as const
                ).map(([k, l]) => {
                  const on = rem.freq === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setRem((r) => ({ ...r, freq: k }))}
                      style={{
                        ...reset,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: on ? "rgba(61,220,132,.12)" : "rgba(255,255,255,.03)",
                        border: `1px solid ${on ? "rgba(61,220,132,.4)" : "rgba(255,255,255,.08)"}`,
                        transition: "background .35s ease,border-color .35s ease",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 14,
                          height: 14,
                          flex: "none",
                          boxSizing: "border-box",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          border: `1.5px solid ${on ? green : "rgba(255,255,255,.4)"}`,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: green,
                            boxShadow: "0 0 8px rgba(61,220,132,.8)",
                            transform: `scale(${on ? 1 : 0})`,
                            transition: `transform .45s ${SPRING}`,
                          }}
                        />
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? "#eef7f2" : dim, transition: "color .3s ease" }}>{l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              aria-label={t("Reminder preview")}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(0,0,0,.25)",
                boxShadow: "inset 0 0 0 1px rgba(61,220,132,.1)",
              }}
            >
              <div style={silk(9, ".14em", "#6ee6a4")}>{t("PREVIEW")}</div>
              <div style={{ ...silk(10.5, "0", "#6ee6a4"), marginTop: 10 }}>&gt; {t("HEY!")}</div>
              <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 21, lineHeight: 1.2, color: green, textShadow: "0 0 10px rgba(61,220,132,.5)", marginTop: 6 }}>
                {t("Your event is").toUpperCase()}
                <br />
                {t("In {span}", { span: unitSpan(n, u) }).toUpperCase()}
                <span
                  aria-hidden="true"
                  style={{ display: "inline-block", width: 8, height: 16, marginLeft: 6, verticalAlign: -2, background: green, animation: "rb-cursor 1.1s steps(1) infinite" }}
                />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.55, color: dim, marginTop: "auto", paddingTop: 12 }}>{prevSub}</div>
            </div>
          </div>
        </div>

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
