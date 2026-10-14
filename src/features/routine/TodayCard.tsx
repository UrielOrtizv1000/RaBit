/**
 * Routine: tarjeta «Hoy» (lista del día con despertar/dormir, choques y accesos a cada elemento).
 */
import { fmtTime, fromMin, WEEKDAYS } from "../../domain/dates";
import { t, tn } from "../../i18n";
import { SIDE_CARD, SILK_LABEL } from "../../components/ui/cardStyles";
import { overlaps, type Clash, type DaySettings, type RItem } from "./model";

export interface TodayCardProps {
  todayDate: Date;
  list: RItem[];
  clashes: Clash[];
  day: DaySettings;
  tf: "12h" | "24h";
  setSelId: (id: string | null) => void;
  openPanel: (kind: "event" | "task", id: string) => void;
  onEditDay: () => void;
}

export function TodayCard({ todayDate: td, list: todayList, clashes: todayClashes, day, tf, setSelId, openPanel, onEditDay }: TodayCardProps): JSX.Element {
  return (
    <div style={{ ...SIDE_CARD, flex: 1, minHeight: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", padding: "22px 24px", borderRadius: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={SILK_LABEL}>{t("TODAY")}</div>
        <div
          onClick={() => onEditDay()}
          title={t("Day settings")}
          className="rbc-scale"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            background: "rgba(255,255,255,.75)",
            boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0b7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3Z" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 6 }}>
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 62, lineHeight: 0.9, color: "var(--rb-ink)", letterSpacing: "-.02em" }}>{td.getDate()}</div>
        <div style={{ paddingBottom: 8 }}>
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--rb-green-deep)",
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(23,184,102,.14)",
            }}
          >
            {WEEKDAYS[td.getDay()]}
          </div>
          <div style={{ fontSize: 13, color: "var(--rb-muted)", marginTop: 6 }}>
            {tn(todayList.length, "item", "items")} · {tn(new Set(todayClashes.map((c) => c.cal)).size, "clash", "clashes")}
          </div>
        </div>
      </div>

      <div
        onClick={() => onEditDay()}
        style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, padding: "8px 14px", borderRadius: 16, cursor: "pointer" }}
        className="rbc-cell"
      >
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: tf === "12h" ? 12 : 17, color: "#0b7a45", width: 56 }}>{fmtTime(day.wake, tf)}</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("✦ Wake up")}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8b9a93" }}>{t("Edit")}</div>
      </div>

      <div style={{ height: 1, background: "rgba(18,38,30,.08)", margin: "12px 0 10px", flex: "none" }} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          margin: "0 -4px",
          padding: "0 4px 2px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(18,38,30,.16) transparent",
        }}
      >
        {todayList.length === 0 && <div style={{ fontSize: 12.5, color: "#8b9a93", padding: "6px 14px" }}>{t("Nothing scheduled today.")}</div>}
        {todayList.map((it) => {
          const cal = it.kind !== "routine";
          const clash = todayList.some((o) => o !== it && (o.kind === "routine") !== cal && overlaps(it, o) > 0);
          const amber = clash && cal,
            dim = clash && !cal;
          return (
            <div
              key={it.key}
              onClick={() => {
                if (cal) openPanel(it.kind as "event" | "task", it.id);
                else setSelId(it.id);
              }}
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 14px",
                borderRadius: 16,
                cursor: "pointer",
                background: amber ? "linear-gradient(145deg,#fff3dc,#ffe7c4)" : cal ? "rgba(255,255,255,.9)" : "transparent",
                boxShadow: amber ? "inset 0 0 0 1px rgba(217,149,42,.4)" : cal ? "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "Doto,monospace",
                  fontWeight: 900,
                  fontSize: tf === "12h" ? 11 : 16,
                  color: amber ? "#b07414" : cal ? "var(--rb-ink)" : "#a3b0aa",
                  width: 52,
                }}
              >
                {fmtTime(fromMin(it.sM), tf)}
              </div>
              <div style={{ width: 3, height: 16, flex: "none", borderRadius: 3, background: cal ? it.color : "transparent" }} />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13.5,
                  fontWeight: cal ? 700 : 500,
                  color: dim ? "#a3b0aa" : cal ? "var(--rb-ink)" : "var(--rb-muted)",
                  textDecoration: dim ? "line-through" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.title}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: amber ? "#b07414" : dim ? "#8f9d97" : cal ? "var(--rb-body)" : "var(--rb-green-deep)" }}>
                {amber ? t("! Clash") : cal ? (it.kind === "task" ? t("Task") : t("Event")) : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div
        onClick={() => onEditDay()}
        style={{ flex: "none", marginTop: 12, display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderRadius: 16, cursor: "pointer" }}
        className="rbc-cell"
      >
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: tf === "12h" ? 12 : 17, color: "#41504a", width: 56 }}>{fmtTime(day.bed, tf)}</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("☾ Bedtime")}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8b9a93" }}>{t("Edit")}</div>
      </div>
    </div>
  );
}
