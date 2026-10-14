/**
 * Inicio: tarjeta «Próximos» (los siguientes eventos, con deslizar para eliminar).
 */
import { diffDays, fromISO, MONTHS, WEEKDAYS } from "../../domain/dates";
import type { CalEvent, ISODate } from "../../domain/types";
import { swipeProps } from "../../lib/swipe";
import { t, tn } from "../../i18n";
import type { Occ } from "./model";
import { cardBase, cardHover, Chevron, colorOf, Hv, label10 } from "./parts";

export interface UpcomingCardProps {
  upcoming: Occ[];
  today: ISODate;
  fmtEvTime: (e: CalEvent) => string;
  setPage: (page: "calendar") => void;
  openPanel: (kind: "event" | "task" | "note", id: string | null) => void;
}

export function UpcomingCard({ upcoming, today, fmtEvTime, setPage, openPanel }: UpcomingCardProps) {
  return (
    <Hv
      hover={cardHover}
      style={{
        ...cardBase,
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        animation: "rb-rise .45s ease-out .15s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={label10}>{t("UPCOMING")}</div>
        <div
          onClick={() => setPage("calendar")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--rb-green-deep)" }}
        >
          {t("Calendar")}
          <Chevron color="#0b7a45" />
        </div>
      </div>
      <div className="rb-noscroll rb-fade-bottom" style={{ flex: 1, minHeight: 0, margin: "0 -10px", padding: "0 10px 22px" }}>
        {upcoming.length === 0 && (
          <div style={{ padding: "26px 14px", borderRadius: 18, border: "1px dashed rgba(18,38,30,.14)", fontSize: 13, color: "var(--rb-muted)", textAlign: "center" }}>
            {t("Nothing on the horizon.")}{" "}
            <span onClick={() => openPanel("event", null)} style={{ color: "var(--rb-green-deep)", fontWeight: 600, cursor: "pointer" }}>
              {t("Plan something")}
            </span>
          </div>
        )}
        {upcoming.map(({ ev, date }) => {
          const d = fromISO(date);
          const left = diffDays(date, today);
          return (
            <Hv
              key={`${ev.id}-${date}`}
              swipe={swipeProps({ kind: "event", id: ev.id, title: ev.title })}
              onClick={() => openPanel("event", ev.id)}
              hover={{ background: "rgba(255,255,255,.7)" }}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                margin: "0 -10px",
                borderRadius: 18,
                transition: "background .2s ease-out",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  flex: "none",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,.75)",
                  boxShadow: "inset 0 1px 1px #fff,0 4px 10px -6px rgba(20,48,34,.3)",
                }}
              >
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".06em", color: colorOf(ev.color) }}>{MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}</div>
                <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 15, lineHeight: 1, color: "var(--rb-ink)" }}>{d.getDate()}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--rb-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ev.title || t("Untitled event")}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginTop: 2 }}>
                  {WEEKDAYS[d.getDay()]} · {fmtEvTime(ev)}
                  {ev.important ? ` · ${t("Important")}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--rb-body)", padding: "6px 11px", borderRadius: 999, background: "rgba(18,38,30,.05)", flex: "none" }}>
                {tn(left, "day", "days")}
              </div>
            </Hv>
          );
        })}
      </div>
    </Hv>
  );
}
