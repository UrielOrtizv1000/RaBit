/**
 * Panel compartido de Eventos · Notas · Tareas (lista + detalle).
 * Modo overlay (ventana centrada) o `inline` (Quick Notes). Una sola implementación para los tres tipos:
 * el tipo activo decide qué panel de detalle se renderiza (EventPane / NotePane / TaskPane).
 * Se abre con `useUi().openPanel(kind, id?, seed?)`.
 */
import { useCallback, useMemo, useState } from "react";
import { todayISO } from "../../domain/dates";
import { t, tn } from "../../i18n";
import { useData } from "../../store/data";
import { useUi, type PanelKind } from "../../store/ui";
import { EventPane } from "./EventPane";
import { ListColumn } from "./ListColumn";
import { eventRows, FILTERS, isPastEvent, noteRows, taskRows, type Ctx, type Group } from "./lists";
import { NotePane } from "./NotePane";
import { fromPanel, labelsFor, type Sel } from "./panelModel";
import { TaskPane } from "./TaskPane";
import { EASE, FAINT, GREEN, MUTED, PanelStyles, reset, type SaveStatus } from "./ui";

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
  const [applied, setApplied] = useState(panel); // último panel externo ya aplicado

  // Follow external openPanel()/setPanelKind() calls (overlay mode only). Se ajusta en el render, no en un efecto.
  if (!inline && panel !== applied) {
    setApplied(panel);
    if (panel) {
      setKind(panel.kind);
      setSel(fromPanel(panel));
      setFilter("all");
      setLocalQ("");
      setListHidden(false);
    }
  }

  // si el ítem abierto se elimina (p. ej. deslizando su fila), cierra su edición
  if (sel && sel.id !== null) {
    const list = kind === "task" ? tasks : kind === "event" ? events : notes;
    if (!list.some((x) => x.id === sel.id)) setSel(null);
  }

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
      setApplied(useUi.getState().panel);
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

      <ListColumn
        inline={inline}
        listHidden={listHidden}
        kind={kind}
        pickKind={pickKind}
        startNew={startNew}
        labels={L}
        headline={headline}
        localQ={localQ}
        setLocalQ={setLocalQ}
        filter={filter}
        setFilter={setFilter}
        filterOptions={filterOptions}
        groups={groups}
        hasQuery={q.length > 0}
        sel={sel}
        leaving={leaving}
        select={select}
        toggleTask={(id) => void D().toggleTask(id)}
        showBulk={showBulk}
        bulk={bulk}
        bulkCount={bulkCount}
      />

      {/* RIGHT: detail */}
      <div data-tour="panel-detail" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
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
