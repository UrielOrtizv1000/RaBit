/**
 * Routine: confirmación para quitar un bloque recurrente de todas las semanas.
 */
import { fmtTime } from "../../domain/dates";
import { t } from "../../i18n";
import type { RoutineBlock } from "../../domain/types";
import { SILK } from "./model";
import { ghostBtn, modalBox } from "./parts";

interface Props {
  block: RoutineBlock;
  days: string;
  tf: "12h" | "24h";
  onCancel: () => void;
  onRemove: () => void;
}

export function RemoveDialog({ block, days, tf, onCancel, onRemove }: Props): JSX.Element {
  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 35, display: "grid", placeItems: "center", background: "rgba(16,32,25,.36)", backdropFilter: "blur(6px)" }}
      onClick={() => onCancel()}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 380, padding: 24 }}>
        <div style={{ fontFamily: SILK, fontSize: 12, letterSpacing: ".06em", color: "#16211c", marginBottom: 12 }}>{t("REMOVE ROUTINE?")}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#16211c" }}>{block.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginTop: 4 }}>
          {days} · {fmtTime(block.start, tf)} — {fmtTime(block.end, tf)}
        </div>
        <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 12, lineHeight: 1.5 }}>{t("This will remove the recurring routine from every week.")}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <div className="rbc-ghost" onClick={() => onCancel()} style={ghostBtn}>
            {t("Cancel")}
          </div>
          <div
            onClick={() => onRemove()}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 11,
              borderRadius: 11,
              background: "var(--rb-danger)",
              color: "#fff",
              fontFamily: SILK,
              fontSize: 10,
              letterSpacing: ".05em",
              cursor: "pointer",
            }}
          >
            {t("REMOVE")}
          </div>
        </div>
      </div>
    </div>
  );
}
