/**
 * Ventana flotante para crear, renombrar, recolorear o borrar una etiqueta.
 */
import { TAG_COLORS, type Tag } from "../../domain/types";
import { t } from "../../i18n";
import { EASE, INK, MUTED, Pill, popCard, reset, RED, silk } from "./ui";

export interface TagEd {
  orig: Tag | null;
  name: string;
  color: string;
}

export function TagEditor({
  ed,
  setEd,
  nameTaken,
  saveTag,
  delTag,
}: {
  ed: TagEd;
  setEd: (e: TagEd | null) => void;
  nameTaken: boolean;
  saveTag: () => Promise<void>;
  delTag: () => Promise<void>;
}) {
  return (
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
  );
}
