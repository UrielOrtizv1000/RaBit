/**
 * Routine: tarjeta de detalle del bloque seleccionado (repetición, próximas fechas, choques, editar y quitar).
 */
import { fmtTime, fromISO, WEEKDAYS } from "../../domain/dates";
import { t } from "../../i18n";
import { routineColor, type RoutineBlock } from "../../domain/types";
import { SIDE_CARD, SILK_LABEL } from "../../components/ui/cardStyles";
import { SILK, type Clash } from "./model";

export interface BlockDetailsProps {
  block: RoutineBlock;
  days: string;
  next: string[];
  clashes: Clash[];
  tf: "12h" | "24h";
  onBack: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function BlockDetails({ block, days, next, clashes, tf, onBack, onEdit, onRemove }: BlockDetailsProps): JSX.Element {
  return (
    <div style={{ ...SIDE_CARD, flex: "none", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label={t("Back")}
            title={t("Back")}
            onClick={() => onBack()}
            className="rbc-scale"
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,.75)",
              boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0b7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <div style={SILK_LABEL}>{t("ROUTINE")}</div>
        </div>
        <div style={{ width: 9, height: 9, borderRadius: 2, border: `2px solid ${routineColor(block.color)}`, boxSizing: "border-box" }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#16211c", marginBottom: 4 }}>{block.title}</div>
      <div style={{ fontSize: 13, color: "var(--rb-muted)" }}>
        {days} · {fmtTime(block.start, tf)} — {fmtTime(block.end, tf)}
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(18,38,30,.08)" }}>
        <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".1em", color: "var(--rb-green-deep)", marginBottom: 8 }}>{t("REPEATS")}</div>
        <div style={{ fontSize: 13, color: "#2b3a34", fontWeight: 600 }}>
          {block.everyWeeks <= 1 ? t("Every week on {days}", { days: days }) : t("Every {n} weeks on {days}", { n: block.everyWeeks, days: days })}
        </div>
      </div>
      {next.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...SILK_LABEL, fontSize: 9, marginBottom: 8 }}>{t("NEXT")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {next.map((n) => (
              <div
                key={n}
                style={{
                  fontFamily: SILK,
                  fontSize: 9,
                  letterSpacing: ".03em",
                  color: "var(--rb-green-deep)",
                  padding: "4px 8px",
                  borderRadius: 7,
                  background: "rgba(215,244,229,.9)",
                  border: "1px solid rgba(23,184,102,.22)",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      )}
      {clashes.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 9,
            padding: "11px 12px",
            borderRadius: 12,
            background: "rgba(201,138,30,.1)",
            border: "1px solid rgba(201,138,30,.3)",
          }}
        >
          <div style={{ fontFamily: SILK, fontSize: 11, color: "#a06810" }}>!</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#7a5210" }}>
            {clashes
              .map((c) =>
                t("{cal} overlaps {routine} on {day} by {min} min. Calendar wins.", {
                  cal: c.cal,
                  routine: c.routine,
                  day: WEEKDAYS[fromISO(c.date).getDay()],
                  min: c.min,
                }),
              )
              .join(" ")}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <div
          onClick={onEdit}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: 10,
            borderRadius: 11,
            background: "#16211c",
            color: "#fff",
            fontFamily: SILK,
            fontSize: 9,
            letterSpacing: ".05em",
            cursor: "pointer",
          }}
        >
          {t("EDIT")}
        </div>
        <div
          onClick={() => onRemove()}
          style={{
            width: 42,
            flex: "none",
            display: "grid",
            placeItems: "center",
            padding: 10,
            borderRadius: 11,
            border: "1px solid rgba(18,38,30,.1)",
            background: "rgba(255,255,255,.7)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#a8443a" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
