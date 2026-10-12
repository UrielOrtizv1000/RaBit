/**
 * Panel compartido de Eventos · Notas · Tareas (lista + detalle).
 * Modo overlay (ventana centrada) o `inline` (Quick Notes). Una sola implementación para los tres tipos:
 * el tipo activo decide qué panel de detalle se renderiza (EventPane / NotePane / TaskPane).
 * Se abre con `useUi().openPanel(kind, id?, seed?)`.
 */
import { swipeProps } from "../../lib/swipe";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { todayISO } from "../../domain/dates";
import { t, tn } from "../../i18n";
import { useData } from "../../store/data";
import { useUi, type PanelKind, type PanelState } from "../../store/ui";
import { EventPane } from "./EventPane";
import { eventRows, FILTERS, isPastEvent, noteRows, taskRows, type Ctx, type Group, type Row } from "./lists";
import { NotePane } from "./NotePane";
import { TaskPane } from "./TaskPane";
import { CheckBox, EASE, FAINT, GREEN, greenGrad, Ico, INK, MUTED, PanelStyles, Pill, RED, reset, Seg, silk, type SaveStatus } from "./ui";

type Sel = { id: string | null; key: string; seed?: PanelState["seed"] } | null;

const kindOptions = () =>
  [
    ["event", t("EVENTS")],
    ["note", t("NOTES")],
    ["task", t("TASKS")],
  ] as const;
const labelsFor = (k: PanelKind): { newLabel: string; search: string; bulk: string } =>
  k === "task"
    ? { newLabel: t("New task"), search: t("Search tasks…"), bulk: t("Delete done tasks") }
    : k === "event"
      ? { newLabel: t("New event"), search: t("Search events…"), bulk: t("Delete past events") }
      : { newLabel: t("New note"), search: t("Search notes…"), bulk: t("Empty trash") };

const fromPanel = (p: PanelState | null): Sel => (p ? (p.id ? { id: p.id, key: p.id } : { id: null, key: `new-${Date.now()}`, seed: p.seed }) : null);

export function ItemPanel({ inline = false }: { inline?: boolean }) {
  const panel = useUi((s) => s.panel);
  const globalQ = useUi((s) => s.search);
  const closePanel = useUi((s) => s.closePanel);
  const showToast = useUi((s) => s.showToast);

  const tasks = useData((s) => s.tasks);
  const events = useData((s) => s.events);
  const notes = useData((s) => s.notes);
  const tags = useData((s) => s.tags);
  const timeFormat = useData((s) => s.settings.timeFormat);
  const D = useData.getState;

  const [kind, setKind] = useState<PanelKind>(inline ? "note" : (panel?.kind ?? "event"));
  const [sel, setSel] = useState<Sel>(inline ? null : fromPanel(panel));
  const [filter, setFilter] = useState("all");
  const [localQ, setLocalQ] = useState("");
  const [listHidden, setListHidden] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [tall, setTall] = useState(false);
  const applied = useRef(panel);

  // Follow external openPanel()/setPanelKind() calls (overlay mode only).
  useEffect(() => {
    if (inline || panel === applied.current) return;
    applied.current = panel;
    if (!panel) return;
    setKind(panel.kind);
    setSel(fromPanel(panel));
    setFilter("all");
    setLocalQ("");
    setListHidden(false);
  }, [panel, inline]);

  // si el ítem abierto se elimina (p. ej. deslizando su fila), cierra su edición
  useEffect(() => {
    if (!sel || sel.id === null) return;
    const list = kind === "task" ? tasks : kind === "event" ? events : notes;
    if (!list.some((x) => x.id === sel.id)) setSel(null);
  }, [tasks, events, notes, kind, sel]);

  const today = todayISO();
  const groupsFor = useCallback(
    (k: PanelKind, flt: string, q: string[]): Group[] => {
      const c: Ctx = { today: todayISO(), q, filter: flt, timeFormat, tags };
      return k === "task" ? taskRows(tasks, c) : k === "event" ? eventRows(events, c) : noteRows(notes, c);
    },
    [tasks, events, notes, tags, timeFormat],
  );

  const q = useMemo(() => [localQ, globalQ].map((x) => x.trim().toLowerCase()).filter(Boolean), [localQ, globalQ]);
  const groups = useMemo(() => groupsFor(kind, filter, q), [groupsFor, kind, filter, q]);
  const flat = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.id)), [groups]);

  const doneTasks = tasks.filter((t) => t.done);
  const pastEvents = events.filter((e) => isPastEvent(e, today));
  const trashNotes = notes.filter((n) => n.deletedAt !== null);
  const bulkCount = kind === "task" ? doneTasks.length : kind === "event" ? pastEvents.length : trashNotes.length;
  const showBulk = bulkCount > 0 && (kind !== "note" || filter === "deleted");
  const headline =
    kind === "task"
      ? (() => {
          const n = tasks.filter((x) => !x.done).length;
          return tn(n, "open task", "open tasks");
        })()
      : kind === "event"
        ? (() => {
            const n = events.filter((e) => !isPastEvent(e, today)).length;
            return tn(n, "upcoming event", "upcoming events");
          })()
        : filter === "deleted"
          ? t("{n} in trash", { n: trashNotes.length })
          : tn(notes.length - trashNotes.length, "note", "notes");

  const L = labelsFor(kind);
  const filterOptions = FILTERS[kind].map(([id, l]) => [id, t(l)] as const);
  const select = (id: string) => setSel({ id, key: id });
  const startNew = () => {
    setFilter("all");
    setLocalQ("");
    setSel({ id: null, key: `new-${Date.now()}` });
  };
  const pickKind = (k: PanelKind) => {
    if (k === kind) return;
    setKind(k);
    setFilter("all");
    setLocalQ("");
    const first = groupsFor(k, "all", [])[0]?.rows[0]?.id;
    setSel(first ? { id: first, key: first } : null);
    if (!inline) {
      useUi.getState().setPanelKind(k);
      applied.current = useUi.getState().panel;
    }
  };
  const close = () => closePanel();

  /** Animate rows out, then run the action; selection moves to a neighbour. */
  const leave = (ids: string[], run: () => Promise<void>, toast?: { text: string; undo?: () => void }) => {
    const at = sel?.id ? flat.indexOf(sel.id) : -1;
    const survivors = flat.filter((x) => !ids.includes(x));
    const hit = sel?.id ? ids.includes(sel.id) : false;
    setLeaving((p) => new Set([...p, ...ids]));
    window.setTimeout(() => {
      void run().then(() => {
        setLeaving((p) => {
          const n = new Set(p);
          ids.forEach((i) => n.delete(i));
          return n;
        });
        if (hit) {
          const nx = survivors[Math.min(Math.max(at, 0), survivors.length - 1)];
          setSel(nx ? { id: nx, key: nx } : null);
        }
        if (toast) showToast(toast.text, toast.undo);
      });
    }, 240);
  };

  const deleteSel = () => {
    const id = sel?.id;
    if (!id) return;
    if (kind === "task") {
      const tk = tasks.find((x) => x.id === id);
      if (tk) leave([id], () => D().deleteTask(id), { text: t("Task deleted"), undo: () => void D().addTask(tk) });
    } else if (kind === "event") {
      const e = events.find((x) => x.id === id);
      if (e) leave([id], () => D().deleteEvent(id), { text: t("Event deleted"), undo: () => void D().addEvent(e) });
    } else leave([id], () => D().trashNote(id), { text: t("Note moved to trash"), undo: () => void D().restoreNote(id) });
  };
  const restoreSel = () => {
    const id = sel?.id;
    if (id) leave([id], () => D().restoreNote(id), { text: t("Note restored"), undo: () => void D().trashNote(id) });
  };
  const purgeSel = () => {
    const id = sel?.id;
    const n = notes.find((x) => x.id === id);
    if (!id || !n) return;
    leave([id], () => D().purgeNote(id), { text: t("Note deleted forever"), undo: () => void D().addNote(n) });
  };
  const bulk = () => {
    if (kind === "task") {
      const snap = doneTasks;
      leave(
        snap.map((x) => x.id),
        () => D().deleteDoneTasks(),
        { text: snap.length === 1 ? t("Deleted 1 done task") : t("Deleted {n} done tasks", { n: snap.length }), undo: () => void Promise.all(snap.map((x) => D().addTask(x))) },
      );
    } else if (kind === "event") {
      const snap = pastEvents;
      leave(
        snap.map((e) => e.id),
        () => D().deletePastEvents(),
        { text: snap.length === 1 ? t("Deleted 1 past event") : t("Deleted {n} past events", { n: snap.length }), undo: () => void Promise.all(snap.map((e) => D().addEvent(e))) },
      );
    } else {
      const snap = trashNotes;
      leave(
        snap.map((n) => n.id),
        () => D().emptyTrash(),
        { text: t("Trash emptied"), undo: () => void Promise.all(snap.map((n) => D().addNote(n))) },
      );
    }
  };

  const onCreated = useCallback((id: string) => setSel((s) => (s ? { ...s, id } : s)), []);
  const onEditing = useCallback((b: boolean) => setTall(b), []);
  const cancelNew = useCallback(() => setSel(null), []);

  const statusText = status === "saving" ? t("Saving…") : status === "saved" ? t("Saved") : t("Auto-saves as you type");

  const win = (
    <div
      role={inline ? "region" : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label={inline ? t("Quick notes") : t("Events, notes and tasks")}
      className="ip-root"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        display: "flex",
        overflow: "hidden",
        borderRadius: 32,
        width: inline ? "100%" : 1120,
        maxWidth: inline ? undefined : "calc(100% - 32px)",
        height: inline ? "100%" : tall ? 860 : 700,
        maxHeight: inline ? undefined : "100%",
        transition: `height .6s ${EASE}`,
        background: "linear-gradient(150deg,rgba(255,255,255,.9),rgba(245,250,247,.78))",
        backdropFilter: "blur(30px) saturate(170%)",
        WebkitBackdropFilter: "blur(30px) saturate(170%)",
        border: "1px solid rgba(255,255,255,.9)",
        boxShadow: inline ? "inset 0 1px 1px #fff,0 24px 50px -30px rgba(12,40,26,.35)" : "inset 0 1px 1px #fff,0 50px 100px -40px rgba(12,40,26,.6)",
        animation: `rb-in .55s ${EASE} both`,
      }}
    >
      <PanelStyles />

      {/* LEFT: list */}
      <div
        style={{
          width: listHidden ? 0 : 380,
          opacity: listHidden ? 0 : 1,
          flex: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${listHidden ? "transparent" : "rgba(18,38,30,.07)"}`,
          background: "rgba(255,255,255,.35)",
          visibility: listHidden ? "hidden" : "visible",
          transition: `width .6s ${EASE},opacity .4s ease,border-color .4s ease,visibility 0s linear ${listHidden ? ".6s" : "0s"}`,
        }}
      >
        <div style={{ width: 380, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "20px 22px 14px" }}>
            {inline ? (
              <div style={silk(10, ".16em")}>{t("YOUR NOTES")}</div>
            ) : (
              <Seg<PanelKind>
                role="tablist"
                label={t("Item type")}
                options={kindOptions()}
                value={kind}
                onChange={pickKind}
                size={9.5}
                pad="7px 10px"
                font={{ fontFamily: "Silkscreen,monospace", letterSpacing: ".07em", fontWeight: 400 }}
                stretch={false}
              />
            )}
            <Pill
              onClick={startNew}
              className="ip-h-scale"
              style={{
                padding: "9px 13px",
                whiteSpace: "nowrap",
                color: "#fff",
                background: greenGrad,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 10px 20px -12px rgba(23,184,102,.95)",
                flex: "none",
              }}
            >
              {Ico.plus()}
              {L.newLabel}
            </Pill>
          </div>
          <div style={{ padding: "0 22px 4px", fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: INK }} aria-live="polite">
            {headline}
          </div>
          <div style={{ padding: "10px 22px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              className="ip-focus-within"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,.8)",
                boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)",
                transition: "box-shadow .25s ease",
              }}
            >
              {Ico.search}
              <input
                aria-label={L.search}
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                placeholder={L.search}
                style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, color: INK }}
              />
            </label>
            <Seg label={t("Filter")} options={filterOptions} value={filter} onChange={setFilter} pad="7px 0" />
          </div>

          <div className="rb-noscroll" style={{ flex: 1, minHeight: 0, padding: "0 14px 16px" }}>
            {groups.map((g) => (
              <section key={g.label} aria-label={t(g.label)}>
                <div style={{ ...silk(9, ".14em", g.color), padding: "12px 10px 6px" }}>{t(g.label)}</div>
                {g.rows.map((r) => (
                  <RowView key={r.id} row={r} selected={sel?.id === r.id} leaving={leaving.has(r.id)} onSelect={() => select(r.id)} onToggle={() => void D().toggleTask(r.id)} />
                ))}
              </section>
            ))}
            {groups.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: FAINT }}>{q.length ? t("No matches.") : t("Nothing here yet.")}</div>
            )}
          </div>

          {showBulk && (
            <div style={{ flex: "none", padding: "12px 22px 18px", borderTop: "1px solid rgba(18,38,30,.07)", animation: `rb-toast .35s ${EASE} both` }}>
              <Pill
                onClick={bulk}
                className="ip-h-red2"
                style={{ width: "100%", justifyContent: "center", gap: 8, padding: "10px 14px", color: RED, background: "rgba(192,74,66,.06)" }}
              >
                {Ico.trash()}
                {L.bulk} · {bulkCount}
              </Pill>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: detail */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px 0 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              onClick={() => setListHidden((h) => !h)}
              aria-label={listHidden ? t("Show list") : t("Hide list")}
              aria-pressed={listHidden}
              title={listHidden ? t("Show list") : t("Hide list")}
              className="ip-h-ghost"
              style={{
                ...reset,
                width: 32,
                height: 32,
                marginLeft: -8,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                color: MUTED,
                transition: "background .3s ease,color .3s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="1.75" y="2.5" width="12.5" height="11" rx="2.5" />
                <path d="M6 2.5v11" />
                <path d={listHidden ? "M9 6.5 10.5 8 9 9.5" : "M10.5 6.5 9 8 10.5 9.5"} strokeWidth="1.6" />
              </svg>
            </button>
            <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: GREEN }}>
              <span
                aria-hidden="true"
                style={{ width: 6, height: 6, borderRadius: "50%", background: status === "saving" ? "#c98a1e" : "#17b866", transition: "background .3s ease" }}
              />
              {statusText}
            </div>
          </div>
          {!inline && (
            <button
              type="button"
              onClick={close}
              aria-label={t("Close")}
              className="ip-h-ghost"
              style={{ ...reset, width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: MUTED, fontSize: 17 }}
            >
              ×
            </button>
          )}
        </div>

        {sel ? (
          kind === "event" ? (
            <EventPane
              key={`e-${sel.key}`}
              id={sel.id}
              seed={sel.seed}
              onStatus={setStatus}
              onCreated={onCreated}
              onDelete={deleteSel}
              onCancelNew={cancelNew}
              onEditing={onEditing}
            />
          ) : kind === "task" ? (
            <TaskPane key={`t-${sel.key}`} id={sel.id} seed={sel.seed} onStatus={setStatus} onCreated={onCreated} onDelete={deleteSel} />
          ) : (
            <NotePane key={`n-${sel.key}`} id={sel.id} onStatus={setStatus} onCreated={onCreated} onDelete={deleteSel} onRestore={restoreSel} onPurge={purgeSel} />
          )
        ) : (
          <div style={{ flex: 1, display: "grid", placeItems: "center", fontSize: 14, color: FAINT }}>{t("Select an item or create a new one.")}</div>
        )}
      </div>
    </div>
  );

  if (inline) return <div style={{ position: "absolute", inset: 0 }}>{win}</div>;
  return (
    <div
      onClick={close}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 58,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box",
        padding: "12px 24px 44px",
        background: "rgba(16,32,25,.28)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: `rb-fade .35s ${EASE} both`,
      }}
    >
      {win}
    </div>
  );
}

function RowView({ row, selected, leaving, onSelect, onToggle }: { row: Row; selected: boolean; leaving: boolean; onSelect: () => void; onToggle: () => void }) {
  const isTask = row.kind === "task";
  return (
    <div
      style={{
        maxHeight: leaving ? 0 : 220,
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateX(-14px)" : "none",
        overflow: leaving ? "hidden" : "visible",
        transition: `max-height .26s ${EASE},opacity .2s ease,transform .24s ${EASE}`,
        animation: `rb-toast .3s ${EASE} both`,
      }}
    >
      <div
        onClick={onSelect}
        {...(row.trashed ? {} : swipeProps({ kind: row.kind, id: row.id, title: row.title }))}
        className={selected ? undefined : "ip-h-white"}
        style={{
          display: "flex",
          gap: 12,
          padding: 12,
          borderRadius: 18,
          cursor: "pointer",
          background: selected ? "#fff" : "transparent",
          boxShadow: selected ? "inset 0 1px 1px #fff,0 10px 22px -14px rgba(20,48,34,.45)" : "none",
          opacity: row.kind === "event" && row.done ? 0.7 : 1,
          transition: `background .35s ${EASE},box-shadow .35s ease`,
        }}
      >
        {isTask && (
          <div style={{ marginTop: 1 }}>
            <CheckBox
              on={row.done}
              size={20}
              radius={7}
              label={t("{action}: {title}", { action: row.done ? t("Mark not done") : t("Mark done"), title: row.title })}
              onToggle={onToggle}
              off="rgba(255,255,255,.8)"
              border="rgba(18,38,30,.28)"
            />
          </div>
        )}
        {row.kind === "event" && (
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 38,
              flex: "none",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,.85)",
              boxShadow: "inset 0 1px 1px #fff,0 4px 10px -6px rgba(20,48,34,.3)",
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".06em", color: row.accent }}>{row.mon}</div>
            <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, lineHeight: 1, color: INK }}>{row.day}</div>
          </div>
        )}
        {row.kind === "note" && <div aria-hidden="true" style={{ width: 4, flex: "none", alignSelf: "stretch", borderRadius: 3, background: row.accent }} />}
        <button
          type="button"
          className="ip-select-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-current={selected ? "true" : undefined}
          style={{ ...reset, flex: 1, minWidth: 0, display: "block" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                fontWeight: 600,
                color: isTask && row.done ? "#6d7b75" : INK,
                textDecoration: isTask && row.done ? "line-through" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {row.title}
            </span>
            {row.important && <span role="img" aria-label={t("Important")} style={{ flex: "none", width: 7, height: 7, borderRadius: "50%", background: "#c0503f" }} />}
            {row.pinned && (
              <span role="img" aria-label={t("Pinned")} style={{ display: "grid" }}>
                {Ico.pin(GREEN)}
              </span>
            )}
          </span>
          <span style={{ display: "block", fontSize: 12, color: FAINT, marginTop: 3 }}>{row.due}</span>
          {row.snippet.trim() && (
            <span
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5, lineHeight: 1.45, color: MUTED, marginTop: 5 }}
            >
              {row.snippet}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
