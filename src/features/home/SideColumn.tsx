/**
 * Inicio: columna derecha (día de hoy, semana, calendario de hoy y rutina de hoy).
 */
import { fmtTime, fromISO, MONTHS, WEEKDAYS } from "../../domain/dates";
import type { ISODate } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { swipeProps } from "../../lib/swipe";
import { t } from "../../i18n";
import { circleBtn, Hv, label10 } from "./parts";
import { hasDigit } from "./model";

export interface TodayRow {
  k: "event" | "task";
  id: string;
  time: string;
  sortKey: number;
  title: string;
  kind: string;
  color: string;
}
export interface RoutineRow {
  id: string;
  time: string;
  title: string;
  note: string;
}

export interface SideColumnProps {
  calTop: number;
  now: Date;
  today: ISODate;
  weekDays: ISODate[];
  tf: "12h" | "24h";
  calOn: boolean;
  routineOn: boolean;
  todayCal: TodayRow[];
  todayRoutine: RoutineRow[];
  dayHasItems: (d: ISODate) => boolean;
  setPage: (page: "calendar" | "routine") => void;
  openPanel: (kind: "event" | "task" | "note", id: string | null) => void;
}

export function SideColumn({ calTop, now, today, weekDays, tf, calOn, routineOn, todayCal, todayRoutine, dayHasItems, setPage, openPanel }: SideColumnProps) {
  return (
    <div style={{ width: 318, flex: "none", display: "flex", flexDirection: "column", contain: "size" }}>
      <div
        style={{
          position: "relative",
          marginTop: calTop,
          flex: 1,
          minHeight: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: 24,
          borderRadius: 30,
          background: "linear-gradient(150deg,rgba(255,255,255,.8),rgba(240,250,245,.46))",
          backdropFilter: "blur(24px) saturate(170%)",
          WebkitBackdropFilter: "blur(24px) saturate(170%)",
          border: "1px solid rgba(255,255,255,.85)",
          boxShadow: "inset 0 1px 1px #fff,inset 0 -12px 26px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.34)",
          animation: "rb-rise .45s ease-out .1s both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={label10}>{MONTHS[now.getMonth()].toUpperCase()}</div>
          {calOn && (
            <Hv onClick={() => setPage("calendar")} hover={{ transform: "scale(1.08)" }} style={circleBtn}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#0b7a45" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11 11 5M6 5h5v5" />
              </svg>
            </Hv>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 6 }}>
          <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 76, lineHeight: 0.9, color: "var(--rb-ink)", letterSpacing: "-.02em" }}>{now.getDate()}</div>
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
              {t("Today")}
            </div>
            <div style={{ fontSize: 13, color: "var(--rb-muted)", marginTop: 6 }}>{WEEKDAYS[now.getDay()]}</div>
          </div>
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={silk(9, { letterSpacing: ".14em", color: "#8b9a93" })}>{t("THIS WEEK")}</div>
          {calOn && (
            <div style={{ fontSize: 11.5, color: "var(--rb-muted)" }}>
              <span style={{ fontWeight: 700, color: "#121a16" }}>{todayCal.length}</span> {todayCal.length === 1 ? t("item today") : t("items today")}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, padding: 4, borderRadius: 20, background: "rgba(18,38,30,.04)" }}>
          {weekDays.map((d) => {
            const isToday = d === today;
            const dt = fromISO(d);
            const items = calOn && dayHasItems(d);
            return (
              <Hv
                key={d}
                onClick={() => setPage("calendar")}
                hover={isToday ? undefined : { background: "rgba(255,255,255,.7)" }}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  padding: "10px 0 9px",
                  borderRadius: 16,
                  background: isToday ? "#fff" : "transparent",
                  boxShadow: isToday ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
                  transition: "background .2s ease-out",
                }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 600, color: isToday ? "var(--rb-green-deep)" : "#8b9a93" }}>{WEEKDAYS[dt.getDay()].charAt(0).toUpperCase()}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "var(--rb-green-deep)" : "#2b3a34" }}>{dt.getDate()}</div>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: items ? (isToday ? "var(--rb-green)" : "rgba(18,38,30,.22)") : "transparent" }} />
              </Hv>
            );
          })}
        </div>

        <div style={{ height: 1, background: "rgba(18,38,30,.08)", margin: "20px 0 16px" }} />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "0 -4px", padding: "0 4px", scrollbarWidth: "thin", scrollbarColor: "rgba(18,38,30,.16) transparent" }}>
          {calOn && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4b7fd6" }} />
                  <div style={label10}>{t("CALENDAR TODAY")}</div>
                </div>
                <div onClick={() => setPage("calendar")} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--rb-green-deep)" }}>
                  {t("Open")}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {todayCal.length === 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 16, border: "1px dashed rgba(18,38,30,.14)", fontSize: 12.5, color: "var(--rb-muted)" }}>
                    {t("Nothing scheduled today.")}
                  </div>
                )}
                {todayCal.map((c) => (
                  <Hv
                    key={`${c.k}-${c.id}`}
                    swipe={swipeProps({ kind: c.k, id: c.id, title: c.title })}
                    onClick={() => openPanel(c.k, c.id)}
                    hover={{ transform: "translateY(-1px)" }}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,.9)",
                      boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)",
                      transition: "transform .15s ease-out",
                    }}
                  >
                    <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, color: "var(--rb-ink)", minWidth: 48 }}>
                      {c.time === "—" || tf === "24h" || !hasDigit(c.time) ? c.time : fmtTime(c.time, tf)}
                    </div>
                    <div style={{ width: 3, height: 16, flex: "none", borderRadius: 3, background: c.color }} />
                    <div
                      style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--rb-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {c.title}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--rb-muted)" }}>{t(c.kind)}</div>
                  </Hv>
                ))}
              </div>
            </>
          )}

          {routineOn && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: calOn ? "20px 0 8px" : "0 0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, border: "1.5px solid #17b866", boxSizing: "border-box" }} />
                  <div style={label10}>{t("MY ROUTINE")}</div>
                </div>
                <div onClick={() => setPage("routine")} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--rb-green-deep)" }}>
                  {t("Open")}
                </div>
              </div>
              {todayRoutine.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {todayRoutine.map((r) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px" }}>
                      <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, color: "#a3b0aa", minWidth: 48 }}>{fmtTime(r.time, tf)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--rb-muted)" }}>{r.title}</div>
                        {r.note && <div style={{ fontSize: 11, fontWeight: 600, color: "#b07414", marginTop: 1 }}>{r.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => setPage("routine")}
                  style={{
                    cursor: "pointer",
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: "1px dashed rgba(18,38,30,.14)",
                    fontSize: 12.5,
                    color: "var(--rb-muted)",
                  }}
                >
                  {t("No routine today")} · <span style={{ color: "var(--rb-green-deep)", fontWeight: 600 }}>{t("Set one up")}</span>
                </div>
              )}
            </>
          )}
        </div>
        {routineOn && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "14px 4px 0", fontSize: 12, color: "var(--rb-faint)" }}>
            <div onClick={() => setPage("routine")} style={{ cursor: "pointer", fontWeight: 600, color: "var(--rb-green-deep)" }}>
              {t("Full week")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
