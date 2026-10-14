/**
 * Evento: vista de lectura (chips, descripción, editar y eliminar).
 */
import type { CSSProperties, ReactNode } from "react";
import type { CalEvent } from "../../domain/types";
import { t } from "../../i18n";
import type { Chip } from "./eventModel";
import { EASE, FAINT, Ico, Pill, RED, reset, silk } from "./ui";

interface Props {
  wrap: CSSProperties;
  titleBar: ReactNode;
  chips: Chip[];
  calLink: ReactNode;
  cur: CalEvent;
  when: (e: Pick<CalEvent, "date" | "allDay" | "start" | "end">) => string;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventReadView({ wrap, titleBar, chips, calLink, cur, when, onEdit: startEdit, onDelete }: Props) {
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
