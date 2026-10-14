/**
 * Una fila de la lista del panel (tarea, evento o nota): casilla/fecha/acento, título, vencimiento y extracto. Soporta deslizar para borrar.
 */
import { swipeProps } from "../../lib/swipe";
import { t } from "../../i18n";
import type { Row } from "./lists";
import { CheckBox, EASE, FAINT, GREEN, Ico, INK, MUTED, reset } from "./ui";

export function RowView({ row, selected, leaving, onSelect, onToggle }: { row: Row; selected: boolean; leaving: boolean; onSelect: () => void; onToggle: () => void }) {
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
