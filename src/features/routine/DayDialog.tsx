/**
 * Routine: ventana «Tu día» para ajustar la hora de despertar y de dormir.
 */
import { fmtTime, fromMin } from "../../domain/dates";
import { t } from "../../i18n";
import type { DaySettings } from "./model";
import { modalBox, Stepper } from "./parts";

export interface DayDraft {
  wake: number;
  bed: number;
}

interface Props {
  dayDraft: DayDraft;
  setDayDraft: (d: DayDraft | null) => void;
  tf: "12h" | "24h";
  onSave: (d: DaySettings) => void;
}

export function DayDialog({ dayDraft, setDayDraft, tf, onSave }: Props): JSX.Element {
  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 36, display: "grid", placeItems: "center", background: "rgba(16,32,25,.3)", backdropFilter: "blur(6px)" }}
      onClick={() => setDayDraft(null)}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 400, borderRadius: 30, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", color: "var(--rb-ink)" }}>{t("Your day")}</div>
          <div
            className="rbc-close"
            onClick={() => setDayDraft(null)}
            style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--rb-muted)", fontSize: 16 }}
          >
            ×
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginBottom: 16 }}>{t("RaBit builds your routine grid between these two times.")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Stepper
            label={t("✦ Wake up")}
            value={fmtTime(fromMin(dayDraft.wake), tf)}
            onMinus={() => setDayDraft({ ...dayDraft, wake: Math.max(240, dayDraft.wake - 30) })}
            onPlus={() => setDayDraft({ ...dayDraft, wake: Math.min(dayDraft.bed - 360, dayDraft.wake + 30) })}
          />
          <Stepper
            label={t("☾ Bedtime")}
            value={fmtTime(fromMin(dayDraft.bed), tf)}
            onMinus={() => setDayDraft({ ...dayDraft, bed: Math.max(dayDraft.wake + 360, dayDraft.bed - 30) })}
            onPlus={() => setDayDraft({ ...dayDraft, bed: Math.min(1439, dayDraft.bed + 30) })}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <div
            onClick={() => setDayDraft(null)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 12,
              borderRadius: 999,
              background: "rgba(255,255,255,.75)",
              boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.35)",
              fontSize: 13,
              fontWeight: 600,
              color: "#2b3a34",
              cursor: "pointer",
            }}
          >
            {t("Cancel")}
          </div>
          <div
            onClick={() => {
              const nd = { wake: fromMin(dayDraft.wake), bed: fromMin(dayDraft.bed) };
              onSave(nd);
            }}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 12,
              borderRadius: 999,
              background: "var(--rb-green-grad)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 14px 26px -14px rgba(23,184,102,1)",
            }}
          >
            {t("Save")}
          </div>
        </div>
      </div>
    </div>
  );
}
