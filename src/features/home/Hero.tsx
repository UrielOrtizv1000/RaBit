/**
 * Inicio: tarjeta principal (terminal de RaBit con el próximo evento, píldora del evento y mascota).
 */
import type { RefObject } from "react";
import { MONTHS, WEEKDAYS } from "../../domain/dates";
import type { CalEvent } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { t } from "../../i18n";
import type { UpdatedLines } from "../../app/useUpdatedNotice";
import type { Occ } from "./model";
import { Chevron, clip, colorOf, Hv, Plus } from "./parts";

export interface HeroProps {
  heroRef: RefObject<HTMLDivElement>;
  notice: UpdatedLines | null;
  greet: string;
  name: string;
  nextOcc: Occ | null;
  nextDate: Date | null;
  deadlineLine: string | null;
  calOn: boolean;
  eventsThisWeek: number;
  openCount: number;
  fmtEvTime: (e: CalEvent) => string;
  openPanel: (kind: "event" | "task" | "note", id: string | null) => void;
}

export function Hero({ heroRef, notice, greet, name, nextOcc, nextDate, deadlineLine, calOn, eventsThisWeek, openCount, fmtEvTime, openPanel }: HeroProps) {
  return (
    <div
      ref={heroRef}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 270px",
        gap: 14,
        alignItems: "center",
        padding: "14px 26px",
        borderRadius: 34,
        background: "linear-gradient(130deg,rgba(255,255,255,.74) 0%,rgba(236,250,242,.5) 55%,rgba(206,240,222,.42) 100%)",
        backdropFilter: "blur(26px) saturate(175%)",
        WebkitBackdropFilter: "blur(26px) saturate(175%)",
        border: "1px solid rgba(255,255,255,.85)",
        boxShadow: "inset 0 1px 1px #fff,inset 0 -18px 40px -26px rgba(255,255,255,.8),0 30px 60px -34px rgba(18,60,40,.36)",
        animation: "rb-rise .45s ease-out .05s both",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "6%",
          right: "6%",
          top: 0,
          height: "46%",
          borderRadius: "34px 34px 50% 50%",
          background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.75),rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* terminal */}
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            background: "linear-gradient(150deg,rgba(12,24,18,.9),rgba(16,40,29,.82))",
            backdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(61,220,132,.08),0 30px 60px -30px rgba(10,30,20,.75)",
            animation: "rb-slide .5s cubic-bezier(.2,.8,.3,1) .35s both",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: 0,
              height: "40%",
              borderRadius: "28px 28px 50% 50%",
              background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.1),rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -34,
              top: 96,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "linear-gradient(150deg,rgba(12,24,18,.88),rgba(16,40,29,.8))",
              border: "1px solid rgba(255,255,255,.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -58,
              top: 130,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "linear-gradient(150deg,rgba(12,24,18,.88),rgba(16,40,29,.8))",
              border: "1px solid rgba(255,255,255,.12)",
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, padding: "14px 20px 0" }}>
            <div style={{ width: 6, height: 6, background: "var(--rb-neon)" }} />
            <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.45)" }} />
            <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.2)" }} />
            <div style={{ marginLeft: 6, ...silk(9, { letterSpacing: ".12em", color: "rgba(110,230,164,.75)" }) }}>rabit@home ~ reminder</div>
          </div>
          <div style={{ position: "relative", padding: "8px 24px 12px" }}>
            <div style={{ ...silk(12, { color: "#6ee6a4", letterSpacing: ".08em" }), marginBottom: 8 }}>
              &gt; {notice ? notice.greeting : `${greet}, ${name}`.toUpperCase() + "!"}
            </div>
            <div
              style={{
                fontFamily: "Doto,monospace",
                fontWeight: 900,
                fontSize: 30,
                lineHeight: 1.12,
                letterSpacing: ".01em",
                color: "var(--rb-neon)",
                textShadow: "0 0 14px rgba(61,220,132,.55)",
              }}
            >
              {notice ? (
                <>{notice.line}</>
              ) : nextOcc && deadlineLine ? (
                <>
                  {t("NEXT EVENT: {title}", { title: clip(nextOcc.ev.title || t("Untitled event"), 14).toUpperCase() })}
                  <br />
                  {deadlineLine}
                </>
              ) : (
                <>{t("NO DEADLINES IN SIGHT")}</>
              )}
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 26,
                  marginLeft: 10,
                  verticalAlign: -3,
                  background: "var(--rb-neon)",
                  boxShadow: "0 0 10px rgba(61,220,132,.8)",
                  animation: "rb-cursor 1.1s steps(1) infinite",
                }}
              />
            </div>
            <div style={{ marginTop: 12, minHeight: 19, fontSize: 13.5, color: "#a9c6b8", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>
              {notice
                ? ""
                : `${calOn ? (eventsThisWeek === 1 ? t("1 event this week") : t("{n} events this week", { n: eventsThisWeek })) + " · " : ""}${openCount === 1 ? t("1 task open") : t("{n} tasks open", { n: openCount })}`}
            </div>
          </div>
        </div>

        {/* next event pill */}
        {calOn && (
          <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
            {nextOcc && nextDate ? (
              <>
                <Hv
                  onClick={() => openPanel("event", nextOcc.ev.id)}
                  hover={{ transform: "translateY(-2px)", boxShadow: "inset 0 1px 1px #fff,0 22px 36px -20px rgba(18,60,40,.55)" }}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px 12px 20px",
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "linear-gradient(145deg,rgba(255,255,255,.88),rgba(255,255,255,.5))",
                    backdropFilter: "blur(20px) saturate(170%)",
                    border: "1px solid rgba(255,255,255,.95)",
                    boxShadow: "inset 0 1px 1px #fff,inset 0 -6px 14px -10px rgba(255,255,255,.9),0 16px 32px -20px rgba(18,60,40,.5)",
                    transition: "transform .2s ease-out,box-shadow .2s ease-out",
                  }}
                >
                  <div style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: colorOf(nextOcc.ev.color), animation: "rb-pulse 2.4s infinite" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--rb-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {nextOcc.ev.title || t("Untitled event")}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--rb-muted)", marginTop: 2 }}>
                      {WEEKDAYS[nextDate.getDay()]}, {MONTHS[nextDate.getMonth()].slice(0, 3)} {nextDate.getDate()} · {fmtEvTime(nextOcc.ev)}
                    </div>
                  </div>
                  {nextOcc.ev.important && (
                    <div
                      style={{ flex: "none", padding: "6px 11px", borderRadius: 999, background: "rgba(192,74,66,.1)", fontSize: 11.5, fontWeight: 600, color: "var(--rb-danger)" }}
                    >
                      ! {t("Important")}
                    </div>
                  )}
                </Hv>
                <Hv
                  onClick={() => openPanel("event", nextOcc.ev.id)}
                  hover={{ transform: "scale(1.03)", color: "#fff" }}
                  style={{
                    cursor: "pointer",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 24px",
                    borderRadius: 999,
                    background: "var(--rb-green-grad)",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 600,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                    transition: "transform .15s ease-out",
                  }}
                >
                  {t("View event")}
                  <Chevron color="#fff" size={12} />
                </Hv>
              </>
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 20px",
                    borderRadius: 999,
                    border: "1px dashed rgba(18,38,30,.18)",
                    fontSize: 13.5,
                    color: "var(--rb-muted)",
                  }}
                >
                  {t("Nothing coming up. Enjoy the quiet.")}
                </div>
                <Hv
                  onClick={() => openPanel("event", null)}
                  hover={{ transform: "scale(1.03)", color: "#fff" }}
                  style={{
                    cursor: "pointer",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 24px",
                    borderRadius: 999,
                    background: "var(--rb-green-grad)",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 600,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                    transition: "transform .15s ease-out",
                  }}
                >
                  {t("New event")}
                  <Plus color="#fff" />
                </Hv>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ position: "relative", display: "grid", placeItems: "center", height: 200 }}>
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(255,255,255,.9),rgba(214,242,227,.3) 62%,rgba(214,242,227,0) 72%)",
          }}
        />
        <div style={{ position: "absolute", bottom: 12, width: 120, height: 16, borderRadius: "50%", background: "rgba(20,60,40,.14)", filter: "blur(10px)" }} />
        <img
          src="/rabit.png"
          alt="RaBit"
          style={{
            position: "relative",
            width: 196,
            height: 196,
            objectFit: "contain",
            imageRendering: "pixelated",
            animation: "rb-pop .8s cubic-bezier(.3,1.3,.5,1) .1s both,rb-float 5.4s ease-in-out .95s infinite",
            filter: "contrast(.86) brightness(1.06) saturate(.92) hue-rotate(-8deg) drop-shadow(0 0 18px rgba(61,220,132,.4)) drop-shadow(0 16px 24px rgba(20,60,40,.22))",
          }}
        />
      </div>
    </div>
  );
}
