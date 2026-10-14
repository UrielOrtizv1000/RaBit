/**
 * Detalle de una nota con autoguardado, etiquetas (CRUD), fijado, papelera de 30 días y «Añadir a tareas».
 */
import { useRef, useState } from "react";
import { TAG_COLORS, TITLE_MAX, type Tag } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { t } from "../../i18n";
import { ago } from "./lists";
import { dragScroll } from "../../lib/dragScroll";
import { trashDaysLeft } from "../../domain/logic";
import { TagEditor, type TagEd } from "./TagEditor";
import { TagPicker } from "./TagPicker";
import { EASE, FAINT, GREEN, Ico, INK, MUTED, Pill, RED, reset, silk, useAutosave, type SaveStatus } from "./ui";

export interface PaneProps {
  id: string | null;
  onStatus: (s: SaveStatus) => void;
  onCreated: (id: string) => void;
  onDelete: () => void;
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
  const [drag] = useState(dragScroll);
  const [tagQ, setTagQ] = useState<string | null>(null); // null = búsqueda cerrada
  const idRef = useRef<string | null>(id);
  const titleRef = useRef<HTMLInputElement>(null);
  const trashed = !!note && note.deletedAt !== null;
  const shownTags = tagQ?.trim() ? tags.filter((tg) => tg.name.toLowerCase().includes(tagQ.trim().toLowerCase())) : tags;
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

  const openEd = (t: Tag | null, name = "") => setEd(t ? { orig: t, name: t.name, color: t.color } : { orig: null, name, color: TAG_COLORS[tags.length % TAG_COLORS.length] });
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

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
        <TagPicker
          shownTags={shownTags}
          tagCount={tags.length}
          validTag={validTag}
          trashed={trashed}
          onPick={edit(setTagId)}
          onEditTag={openEd}
          onCreateTag={(name) => openEd(null, name)}
          drag={drag}
          tagQ={tagQ}
          setTagQ={setTagQ}
        />
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
          {ed && <TagEditor ed={ed} setEd={setEd} nameTaken={nameTaken} saveTag={saveTag} delTag={delTag} />}
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
            style={{
              ...reset,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              flex: "none",
              fontSize: 12.5,
              fontWeight: 600,
              color: GREEN,
              padding: "6px 4px",
              borderRadius: 8,
            }}
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
