/**
 * Detalle de una nota con autoguardado, etiquetas (CRUD), fijado, papelera de 30 días y «Añadir a tareas».
 */
import { useRef, useState } from "react";
import { TAG_COLORS, TITLE_MAX, type Tag } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { t } from "../../i18n";
import { ago } from "./lists";
import { trashDaysLeft } from "../../domain/logic";
import { EASE, FAINT, GREEN, Ico, INK, MUTED, Pill, RED, popCard, reset, silk, useAutosave, type SaveStatus } from "./ui";

export interface PaneProps {
  id: string | null;
  onStatus: (s: SaveStatus) => void;
  onCreated: (id: string) => void;
  onDelete: () => void;
}

interface TagEd {
  orig: Tag | null;
  name: string;
  color: string;
}

export function NotePane({ id, onStatus, onCreated, onDelete, onRestore, onPurge }: PaneProps & { onRestore: () => void; onPurge: () => void }) {
  const note = useData((s) => (id ? (s.notes.find((n) => n.id === id) ?? null) : null));
  const tags = useData((s) => s.tags);
  const addNote = useData((s) => s.addNote);
  const updateNote = useData((s) => s.updateNote);
  const addTask = useData((s) => s.addTask);
  const addTag = useData((s) => s.addTag);
  const editTag = useData((s) => s.editTag);
  const deleteTag = useData((s) => s.deleteTag);
  const showToast = useUi((s) => s.showToast);

  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tagId, setTagId] = useState<string | null>(note?.tagId ?? null);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [flash, setFlash] = useState(false);
  const [ed, setEd] = useState<TagEd | null>(null);
  const idRef = useRef<string | null>(id);
  const titleRef = useRef<HTMLInputElement>(null);
  const trashed = !!note && note.deletedAt !== null;
  const validTag = tags.some((t) => t.id === tagId) ? tagId : null;
  const tag = tags.find((t) => t.id === validTag) ?? null;

  const schedule = useAutosave(async () => {
    const patch = { title, body, tagId: validTag, pinned };
    if (idRef.current) {
      await updateNote(idRef.current, patch);
      return;
    }
    if (!title.trim() && !body.trim()) return;
    const n = await addNote(patch);
    idRef.current = n.id;
    onCreated(n.id);
  }, onStatus);

  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      if (trashed) return;
      set(v);
      schedule();
    };

  const toTask = async () => {
    const ttl = title.trim() || body.trim().split("\n")[0]?.slice(0, 80) || "";
    if (!ttl) {
      titleRef.current?.focus();
      return;
    }
    await addTask({ title: ttl, description: title.trim() ? body : "" });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 2200);
    showToast(t("Added to tasks"));
  };

  const openEd = (t: Tag | null) => setEd(t ? { orig: t, name: t.name, color: t.color } : { orig: null, name: "", color: TAG_COLORS[tags.length % TAG_COLORS.length] });
  const nameTaken = ed ? tags.some((t) => t.name.toLowerCase() === ed.name.trim().toLowerCase() && t.id !== ed.orig?.id) : false;
  const saveTag = async () => {
    if (!ed || !ed.name.trim() || nameTaken) return;
    const name = ed.name.trim();
    if (ed.orig) await editTag(ed.orig.id, { name, color: ed.color });
    else {
      const t = await addTag(name, ed.color);
      setTagId(t.id);
      schedule();
    }
    setEd(null);
  };
  const delTag = async () => {
    if (!ed?.orig) return;
    const gone = ed.orig.id;
    setEd(null);
    await deleteTag(gone);
    if (tagId === gone) setTagId(null);
    showToast(t("Tag deleted"));
  };

  const accent = tag?.color ?? "#17b866";
  const meta = trashed && note ? t("In trash · deletes in {n} days", { n: trashDaysLeft(note) }) : note ? t("Edited {when}", { when: ago(note.updatedAt) }) : t("New note");

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
        <div aria-hidden="true" style={{ width: 12, height: 28, flex: "none", borderRadius: 6, background: accent, transition: "background .4s ease" }} />
        <input
          ref={titleRef}
          className="ip-bare"
          maxLength={TITLE_MAX}
          aria-label={t("Note title")}
          autoFocus={!note}
          readOnly={trashed}
          value={title}
          onChange={(e) => edit(setTitle)(e.target.value)}
          placeholder={t("Untitled note")}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", color: INK }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 20 }}>
        <div role="radiogroup" aria-label={t("Tag")} style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: 3, borderRadius: 22, background: "rgba(18,38,30,.05)" }}>
          {tags.length === 0 && <span style={{ padding: "7px 13px", fontSize: 12, color: FAINT }}>{t("No tags yet")}</span>}
          {tags.map((tg) => {
            const on = tg.id === validTag;
            return (
              <button
                key={tg.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={trashed}
                title={t("Double-click to edit")}
                onClick={() => edit(setTagId)(on ? null : tg.id)}
                onDoubleClick={() => !trashed && openEd(tg)}
                style={{
                  ...reset,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 13px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  color: on ? "#1d2a24" : MUTED,
                  background: on ? "#fff" : "transparent",
                  boxShadow: on ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
                  transition: `background .3s ${EASE},color .3s ease`,
                  cursor: trashed ? "default" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: tg.color }} />
                {tg.name}
              </button>
            );
          })}
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label={t("New tag")}
            title={t("New tag")}
            aria-expanded={!!ed}
            disabled={trashed}
            className="ip-h-green"
            onClick={() => (ed ? setEd(null) : openEd(null))}
            style={{
              ...reset,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: MUTED,
              background: "rgba(18,38,30,.05)",
              transition: `background .3s ease,color .3s ease,transform .35s ${EASE}`,
            }}
          >
            {Ico.plus(12, 1.9)}
          </button>
          {ed && (
            <div
              role="dialog"
              aria-label={ed.orig ? t("Edit tag") : t("New tag")}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setEd(null);
                }
              }}
              style={{ position: "absolute", left: -150, top: 42, zIndex: 30, width: 300, padding: 16, borderRadius: 22, ...popCard, animation: `rb-in .4s ${EASE} both` }}
            >
              <div style={{ ...silk(9.5), marginBottom: 10 }}>{(ed.orig ? t("Edit tag") : t("New tag")).toUpperCase()}</div>
              <input
                autoFocus
                aria-label={t("Tag name")}
                value={ed.name}
                placeholder={t("Tag name")}
                maxLength={24}
                onChange={(e) => setEd({ ...ed, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveTag();
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 14px",
                  borderRadius: 14,
                  border: 0,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  color: INK,
                  background: "rgba(18,38,30,.05)",
                }}
              />
              {nameTaken && (
                <div role="alert" style={{ fontSize: 11.5, color: RED, marginTop: 6 }}>
                  {t("A tag with that name already exists.")}
                </div>
              )}
              <div role="radiogroup" aria-label={t("Tag color")} style={{ display: "flex", flexWrap: "wrap", gap: 9, margin: "14px 0 16px" }}>
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={ed.color === c}
                    aria-label={t("Color {c}", { c })}
                    onClick={() => setEd({ ...ed, color: c })}
                    style={{
                      ...reset,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c,
                      boxShadow: ed.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : "none",
                      transform: `scale(${ed.color === c ? 1.15 : 1})`,
                      transition: `transform .3s ${EASE},box-shadow .3s ease`,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ed.orig && (
                  <Pill className="ip-h-red" onClick={() => void delTag()} style={{ padding: "9px 12px", fontSize: 12, color: RED }}>
                    {t("Delete")}
                  </Pill>
                )}
                <div style={{ flex: 1 }} />
                <Pill className="ip-h-ghost" onClick={() => setEd(null)} style={{ padding: "9px 14px", fontSize: 12, color: MUTED }}>
                  {t("Cancel")}
                </Pill>
                <Pill
                  onClick={() => void saveTag()}
                  disabled={!ed.name.trim() || nameTaken}
                  style={{ padding: "9px 16px", fontSize: 12, color: "#fff", background: ed.color, opacity: ed.name.trim() && !nameTaken ? 1 : 0.5 }}
                >
                  {t("Save")}
                </Pill>
              </div>
            </div>
          )}
        </div>
        {tag && !trashed && (
          <button
            type="button"
            aria-label={t("Edit tag")}
            title={t("Edit tag")}
            className="ip-h-green"
            onClick={() => openEd(tag)}
            style={{
              ...reset,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: MUTED,
              background: "rgba(18,38,30,.05)",
              transition: "background .3s ease,color .3s ease",
            }}
          >
            {Ico.edit()}
          </button>
        )}
        <Pill
          pressed={pinned}
          disabled={trashed}
          onClick={() => edit(setPinned)(!pinned)}
          className="ip-h-ghost2"
          style={{ padding: "8px 13px", fontSize: 12, color: pinned ? GREEN : MUTED, background: pinned ? "rgba(23,184,102,.12)" : "rgba(18,38,30,.05)" }}
        >
          {Ico.pin(pinned ? GREEN : MUTED)}
          {pinned ? t("Pinned") : t("Pin")}
        </Pill>
        <div style={{ flex: 1 }} />
        {!trashed && (
          <button
            type="button"
            onClick={() => void toTask()}
            style={{ ...reset, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: GREEN, padding: "6px 4px", borderRadius: 8 }}
          >
            {flash ? t("✓ Added to tasks") : t("+ Add to tasks")}
          </button>
        )}
      </div>

      <div style={{ height: 1, background: "rgba(18,38,30,.07)", margin: "22px 0 18px" }} />
      <label htmlFor="ip-note-body" style={{ ...silk(9.5), display: "block", marginBottom: 10 }}>
        {t("Note").toUpperCase()}
      </label>
      <textarea
        id="ip-note-body"
        readOnly={trashed}
        value={body}
        onChange={(e) => edit(setBody)(e.target.value)}
        placeholder={t("Write anything…")}
        className="ip-bare"
        style={{ flex: 1, minHeight: 110, resize: "none", border: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, color: "#1d2a24" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(18,38,30,.07)" }}>
        <div style={{ fontSize: 12, color: FAINT }}>{meta}</div>
        {trashed ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Pill className="ip-h-green" onClick={onRestore} style={{ padding: "8px 16px", color: GREEN, background: "rgba(23,184,102,.1)" }}>
              {t("Restore")}
            </Pill>
            <Pill className="ip-h-red" onClick={onPurge} style={{ padding: "8px 16px", color: RED }}>
              {t("Delete forever")}
            </Pill>
          </div>
        ) : note ? (
          <Pill className="ip-h-red" onClick={onDelete} style={{ padding: "8px 14px", color: RED }}>
            {Ico.trash()}
            {t("Delete")}
          </Pill>
        ) : null}
      </div>
    </div>
  );
}
