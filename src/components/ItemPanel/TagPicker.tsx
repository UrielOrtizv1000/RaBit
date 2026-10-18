/**
 * Selector de etiquetas de una nota: tira horizontal arrastrable (clic elige, doble clic edita) y búsqueda de etiquetas.
 */
import type { Tag } from "../../domain/types";
import type { dragScroll } from "../../lib/dragScroll";
import { t } from "../../i18n";
import { EASE, FAINT, GREEN, Ico, INK, MUTED, reset } from "./ui";

export function TagPicker({
  shownTags,
  tagCount,
  validTag,
  trashed,
  onPick,
  onEditTag,
  onCreateTag,
  drag,
  tagQ,
  setTagQ,
}: {
  shownTags: Tag[];
  tagCount: number;
  validTag: string | null;
  trashed: boolean;
  onPick: (id: string | null) => void;
  onEditTag: (tag: Tag) => void;
  onCreateTag: (name: string) => void;
  drag: ReturnType<typeof dragScroll>;
  tagQ: string | null;
  setTagQ: (q: string | null) => void;
}) {
  return (
    <>
      <div
        role="radiogroup"
        data-tour="note-tags"
        aria-label={t("Tag")}
        className="rb-noscroll"
        onWheel={(e) => {
          if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
        }}
        {...drag}
        style={{
          display: "flex",
          flexWrap: "nowrap",
          flex: "0 1 auto",
          minWidth: 0,
          maxWidth: 400,
          overflowX: "auto",
          cursor: "grab",
          touchAction: "pan-x",
          userSelect: "none",
          gap: 2,
          padding: 3,
          borderRadius: 22,
          background: "rgba(18,38,30,.05)",
        }}
      >
        {tagCount === 0 && <span style={{ padding: "7px 13px", fontSize: 12, color: FAINT, whiteSpace: "nowrap" }}>{t("No tags yet")}</span>}
        {shownTags.length === 0 && tagCount > 0 && <span style={{ padding: "7px 13px", fontSize: 12, color: FAINT, whiteSpace: "nowrap" }}>{t("No matching tags")}</span>}
        {shownTags.map((tg) => {
          const on = tg.id === validTag;
          return (
            <button
              key={tg.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={trashed}
              title={t("Double-click to edit")}
              onClick={() => onPick(on ? null : tg.id)}
              onDoubleClick={() => !trashed && onEditTag(tg)}
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
                flex: "none",
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
      {tagQ !== null ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none", padding: "0 6px 0 12px", height: 32, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
          <input
            autoFocus
            aria-label={t("Search tags")}
            placeholder={t("Search tags")}
            value={tagQ}
            disabled={trashed}
            onChange={(e) => setTagQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setTagQ(null);
              }
            }}
            style={{ ...reset, width: 90, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 11.5, color: INK, cursor: "text" }}
          />
          {tagQ.trim() && shownTags.length === 0 && !trashed && (
            <button
              type="button"
              aria-label={t("Create tag “{name}”", { name: tagQ.trim() })}
              title={t("Create tag “{name}”", { name: tagQ.trim() })}
              className="ip-h-green"
              onClick={() => {
                onCreateTag(tagQ.trim().slice(0, 24));
                setTagQ(null);
              }}
              style={{ ...reset, width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", color: GREEN, background: "#fff" }}
            >
              {Ico.plus(10, 2)}
            </button>
          )}
          <button
            type="button"
            aria-label={t("Close")}
            onClick={() => setTagQ(null)}
            style={{ ...reset, width: 22, height: 22, borderRadius: "50%", fontSize: 14, lineHeight: 1, color: MUTED }}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={t("Search tags")}
          title={t("Search tags")}
          className="ip-h-green"
          onClick={() => setTagQ("")}
          style={{
            ...reset,
            flex: "none",
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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.5 10.5 14 14" />
          </svg>
        </button>
      )}
    </>
  );
}
