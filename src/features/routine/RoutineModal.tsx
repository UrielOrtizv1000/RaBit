/**
 * Routine: ventana para agregar o editar un bloque (título, horas, color, días y frecuencia).
 */
import type { CSSProperties } from "react";
import { addDays, fmtTime, toMin } from "../../domain/dates";
import { PRIMARY_BTN, SILK_LABEL } from "../../components/ui/cardStyles";
import { routineOccursOn } from "../../domain/logic";
import { t } from "../../i18n";
import { ROUTINE_COLORS, TITLE_MAX, type ISODate } from "../../domain/types";
import { ANCHOR, dayOfRoutine, routineDayFull, routineDays, shortDate, SILK, timeOptions, type Draft } from "./model";
import { ghostBtn, modalBox } from "./parts";

export function RoutineModal({
  draft,
  setDraft,
  tf,
  today,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  tf: "12h" | "24h";
  today: ISODate;
  onSave: () => Promise<void>;
}): JSX.Element {
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const valid = draft.title.trim().length > 0 && draft.days.length > 0 && toMin(draft.end) > toMin(draft.start);
  const sortedDays = [...draft.days].sort((a, b) => a - b);
  const selDays = sortedDays.map((d) => routineDays()[d]).join(" · ") || "—";
  const every = draft.every;

  const nextDates: string[] = [];
  for (let i = 0; i < 400 && nextDates.length < 4 && sortedDays.length > 0; i++) {
    const d = addDays(today, i);
    const hit = sortedDays.some((day) => routineOccursOn({ id: "", title: "", day, start: draft.start, end: draft.end, color: draft.color, everyWeeks: every }, d, ANCHOR));
    if (hit) nextDates.push(`${shortDate(d).replace(/^(\w)(\w+)/, (_m, a: string, b: string) => a + b.toLowerCase())} · ${routineDayFull(dayOfRoutine(d))}`);
  }

  const field: CSSProperties = {
    padding: "11px 13px",
    borderRadius: 14,
    background: "rgba(255,255,255,.8)",
    border: "1px solid rgba(18,38,30,.09)",
    fontSize: 13,
    color: "#16211c",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const lbl: CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "var(--rb-muted)", marginBottom: 6 };

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 30, display: "grid", placeItems: "center", background: "rgba(16,32,25,.36)", backdropFilter: "blur(6px)" }}
      onClick={() => setDraft(null)}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, width: 660, maxHeight: "88%", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(18,38,30,.07)" }}>
          <div style={{ fontFamily: SILK, fontSize: 13, letterSpacing: ".06em", color: "#16211c" }}>{draft.mode === "add" ? t("ADD ROUTINE") : t("EDIT ROUTINE")}</div>
          <div
            className="rbc-close"
            onClick={() => setDraft(null)}
            style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--rb-muted)", fontSize: 15, cursor: "pointer" }}
          >
            ×
          </div>
        </div>
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={lbl}>{t("Title")}</div>
            <input
              autoFocus
              maxLength={TITLE_MAX}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSave();
              }}
              placeholder={t("Gym")}
              style={{ ...field, background: "#fff", border: "1px solid rgba(23,184,102,.4)", boxShadow: "0 0 0 3px rgba(23,184,102,.1)", fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
            <div>
              <div style={lbl}>{t("Start time")}</div>
              <select value={draft.start} onChange={(e) => set({ start: e.target.value })} style={field}>
                {timeOptions(draft.start).map((o) => (
                  <option key={o} value={o}>
                    {fmtTime(o, tf)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={lbl}>{t("End time")}</div>
              <select value={draft.end} onChange={(e) => set({ end: e.target.value })} style={field}>
                {timeOptions(draft.end).map((o) => (
                  <option key={o} value={o}>
                    {fmtTime(o, tf)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={lbl}>{t("Color")}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 13px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.8)",
                  border: "1px solid rgba(18,38,30,.09)",
                }}
              >
                {ROUTINE_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => set({ color: c })}
                    style={{ width: 16, height: 16, borderRadius: 5, cursor: "pointer", background: c, boxShadow: draft.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ ...lbl, marginBottom: 8 }}>{t("Repeat on")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {routineDays().map((label, i) => {
                const on = draft.days.includes(i);
                return (
                  <div
                    key={label}
                    onClick={() => set({ days: on ? draft.days.filter((x) => x !== i) : [...draft.days, i] })}
                    style={{
                      flex: 1,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 10,
                      fontFamily: SILK,
                      fontSize: 11,
                      cursor: "pointer",
                      color: on ? "#fff" : "var(--rb-muted)",
                      background: on ? "var(--rb-green-grad)" : "rgba(255,255,255,.7)",
                      border: `1px solid ${on ? "#17b866" : "rgba(18,38,30,.09)"}`,
                      boxShadow: on ? "0 8px 16px -10px rgba(23,184,102,.9)" : "none",
                    }}
                  >
                    {label[0]}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ ...lbl, marginBottom: 8 }}>{t("Repeat frequency")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: 1, label: t("Every week") },
                { id: 2, label: t("2 weeks") },
                { id: 3, label: t("3 weeks") },
                { id: 4, label: t("4 weeks") },
              ].map((iv) => (
                <div
                  key={iv.id}
                  onClick={() => set({ every: iv.id })}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    textAlign: "center",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: every === iv.id ? "#0b7a45" : "#5d6f67",
                    background: every === iv.id ? "rgba(215,244,229,.95)" : "rgba(255,255,255,.7)",
                    border: `1px solid ${every === iv.id ? "rgba(23,184,102,.35)" : "rgba(18,38,30,.09)"}`,
                  }}
                >
                  {iv.label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 240px",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(238,250,243,.7)",
              border: "1px solid rgba(23,184,102,.2)",
            }}
          >
            <div>
              <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".1em", color: "var(--rb-green-deep)", marginBottom: 9 }}>{t("REPEATS")}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#16211c", lineHeight: 1.5 }}>
                {every === 1 ? t("Every week on {days}", { days: selDays }) : t("Every {n} weeks on {days}", { n: every, days: selDays })}
              </div>
              <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 6 }}>{draft.days.length === 1 ? t("1 day selected") : t("{n} days selected", { n: draft.days.length })}</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(23,184,102,.2)", paddingLeft: 14 }}>
              <div style={{ ...SILK_LABEL, fontSize: 9, marginBottom: 9 }}>{t("NEXT")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {nextDates.map((n) => (
                  <div key={n} style={{ fontSize: 12.5, color: "#2b3a34", fontWeight: 600 }}>
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!valid && draft.title.trim().length > 0 && (
            <div style={{ fontSize: 12, color: "#a8443a" }}>{draft.days.length === 0 ? t("Pick at least one day.") : t("End time must be after start time.")}</div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 2 }}>
            <div className="rbc-ghost" onClick={() => setDraft(null)} style={{ ...ghostBtn, flex: "none", padding: "11px 18px" }}>
              {t("Cancel")}
            </div>
            <div
              className="rbc-primary"
              onClick={() => void onSave()}
              style={{ ...PRIMARY_BTN, padding: "11px 20px", opacity: valid ? 1 : 0.5, pointerEvents: valid ? "auto" : "none" }}
            >
              {draft.mode === "add" ? t("SAVE ROUTINE") : t("SAVE CHANGES")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
