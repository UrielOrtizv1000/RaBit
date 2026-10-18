/**
 * Onboarding: panel derecho con la terminal de RaBit y la elección de módulos (teclas 1-4 y Enter).
 */
import type { Dispatch, SetStateAction } from "react";
import { NAV } from "../../app/nav";
import type { Modules } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { t } from "../../i18n";
import { E, MODS } from "./model";

interface Props {
  ob: boolean;
  name: string;
  mods: Modules;
  setMods: Dispatch<SetStateAction<Modules>>;
  count: number;
  finish: () => Promise<void>;
  setPhase: (p: "form" | "onboard") => void;
}

export function OnboardingPanel({ ob, name, mods, setMods, count, finish, setPhase }: Props) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        flex: 1,
        minWidth: 0,
        marginLeft: ob ? -150 : -120,
        transition: "margin .9s cubic-bezier(.7,0,.2,1)",
        background: "radial-gradient(ellipse at 60% 45%,#173a2a 0%,#0f241a 55%,#0a1912 100%)",
        overflow: "hidden",
      }}
    >
      <svg width="140" height="900" viewBox="0 0 140 900" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0, height: "100%", zIndex: 2 }}>
        <path d="M0 0H70C126 70 128 170 86 260C40 360 34 450 84 560C130 660 118 790 60 900H0Z" fill="#f5f8f6" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg,rgba(61,220,132,.035) 0 1px,transparent 1px 3px)",
          animation: "rb-scan 1.2s linear infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: ob ? "10%" : "30%",
          top: "20%",
          width: ob ? 900 : 520,
          height: 560,
          borderRadius: "50%",
          background: "rgba(61,220,132,.18)",
          filter: "blur(110px)",
          pointerEvents: "none",
          transition: "left 1s ease-out,width 1s ease-out",
        }}
      />
      {ob && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: "none",
            background: "radial-gradient(ellipse at 40% 50%,rgba(61,220,132,.55),rgba(23,184,102,.25) 50%,rgba(23,184,102,0) 80%)",
            animation: "rb-flash 1.4s ease-out .35s both",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          padding: `26px 26px 26px ${ob ? 176 : 170}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "auto",
          scrollbarWidth: "none",
          transition: "padding .9s cubic-bezier(.7,0,.2,1)",
        }}
      >
        {!ob && (
          <>
            <div
              style={{
                position: "absolute",
                top: 26,
                right: 26,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 13px",
                borderRadius: 999,
                background: "rgba(61,220,132,.08)",
                boxShadow: "inset 0 0 0 1px rgba(61,220,132,.22)",
              }}
            >
              <div style={{ width: 6, height: 6, background: "var(--rb-neon)", boxShadow: "0 0 8px rgba(61,220,132,.8)" }} />
              <div style={silk(9.5, { letterSpacing: ".12em", color: "#6ee6a4" })}>V1.0 · DESKTOP</div>
            </div>
            <div style={{ textAlign: "center", animation: "rb-rise .5s ease-out .15s both" }}>
              <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 44, lineHeight: 1.12, color: "var(--rb-neon)", textShadow: "0 0 16px rgba(61,220,132,.5)" }}>
                {t("ONE RABIT.").toUpperCase()}
                <br />
                {t("ALL YOUR DAYS.").toUpperCase()}
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 32,
                    marginLeft: 10,
                    verticalAlign: -4,
                    background: "var(--rb-neon)",
                    boxShadow: "0 0 10px rgba(61,220,132,.8)",
                    animation: "rb-cursor 1.1s steps(1) infinite",
                  }}
                />
              </div>
              <div style={{ fontSize: 14.5, color: "#a9c6b8", marginTop: 14, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>
                {t("Calendar, routine and notes — all on this device.")}
              </div>
            </div>
            <div style={{ position: "relative", display: "grid", placeItems: "center", width: 420, height: 400, marginTop: 10 }}>
              <div
                style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(61,220,132,.22),rgba(61,220,132,0) 70%)" }}
              />
              <div style={{ position: "absolute", bottom: 48, width: 170, height: 18, borderRadius: "50%", background: "rgba(0,0,0,.4)", filter: "blur(10px)" }} />
              <img
                src="/rabit.png"
                alt="RaBit"
                style={{
                  position: "relative",
                  width: 320,
                  height: 320,
                  objectFit: "contain",
                  animation: "rb-pop .8s cubic-bezier(.3,1.3,.5,1) .1s both,rb-float 5.4s ease-in-out .95s infinite",
                  filter: "drop-shadow(0 0 22px rgba(61,220,132,.45))",
                }}
              />
            </div>
          </>
        )}

        {ob && (
          <div style={{ width: "min(1120px,100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
            <div
              style={{
                position: "relative",
                width: 640,
                maxWidth: "100%",
                borderRadius: 28,
                background: "linear-gradient(150deg,rgba(12,24,18,.9),rgba(16,40,29,.82))",
                backdropFilter: "blur(24px) saturate(160%)",
                border: "1px solid rgba(255,255,255,.12)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(61,220,132,.08),0 30px 60px -30px rgba(0,0,0,.75)",
                animation: `rb-in .7s ${E} .8s both`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 20px 0" }}>
                <div style={{ width: 6, height: 6, background: "var(--rb-neon)" }} />
                <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.45)" }} />
                <div style={{ width: 6, height: 6, background: "rgba(61,220,132,.2)" }} />
                <div style={{ marginLeft: 6, ...silk(9, { letterSpacing: ".12em", color: "rgba(110,230,164,.75)" }) }}>rabit@setup ~ hello</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 30px 26px" }}>
                <div style={silk(12, { color: "#6ee6a4", letterSpacing: ".08em", marginBottom: 10 })}>
                  &gt; {(name.trim() ? t("Hey, {name}!", { name: name.trim() }) : t("Hey!")).toUpperCase()}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "Doto,monospace",
                    fontWeight: 900,
                    fontSize: 46,
                    lineHeight: 1.1,
                    color: "var(--rb-neon)",
                    textShadow: "0 0 14px rgba(61,220,132,.55)",
                  }}
                >
                  <span style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", animation: "rb-type 1s steps(16) 1.3s both" }}>
                    {t("First time here?").toUpperCase()}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 13,
                      height: 34,
                      marginLeft: 8,
                      background: "var(--rb-neon)",
                      boxShadow: "0 0 10px rgba(61,220,132,.8)",
                      animation: "rb-cursor 1.1s steps(1) infinite",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#a9c6b8",
                    fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                    animation: `rb-toast .5s ${E} 2.2s both`,
                  }}
                >
                  {t("Pick what RaBit shows you. You can change it anytime in Settings.")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 18, width: "100%", paddingTop: 10 }}>
              {MODS.map((m, i) => {
                const on = mods[m.id],
                  nv = NAV.find((n) => n.id === m.id) ?? NAV[0];
                return (
                  <div key={m.id} style={{ animation: `rb-in .7s ${E} ${(2.3 + i * 0.1).toFixed(2)}s both` }}>
                    <div
                      role="switch"
                      aria-checked={on}
                      tabIndex={0}
                      aria-label={m.id === "routine" ? t("Daily routine") : t(nv.label)}
                      onClick={() => setMods((p) => ({ ...p, [m.id]: !p[m.id] }))}
                      onKeyDown={(e) => e.key === " " && setMods((p) => ({ ...p, [m.id]: !p[m.id] }))}
                      className="rb-onb-card"
                      style={{
                        position: "relative",
                        height: 300,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        padding: "30px 24px 26px",
                        borderRadius: 30,
                        cursor: "pointer",
                        overflow: "hidden",
                        background: on ? "#f4f8f5" : "#1d3a2d",
                        boxShadow: on ? "0 30px 60px -26px rgba(0,0,0,.6),0 0 60px -18px rgba(61,220,132,.5)" : "0 20px 40px -28px rgba(0,0,0,.5)",
                        transform: `translateY(${on ? -6 : 0}px)`,
                        transition: `transform .6s ${E},background .5s ease,box-shadow .6s ${E}`,
                      }}
                    >
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          flex: "none",
                          borderRadius: 22,
                          display: "grid",
                          placeItems: "center",
                          background: on ? "rgba(23,184,102,.14)" : "rgba(255,255,255,.07)",
                          transition: "background .5s ease",
                        }}
                      >
                        <svg
                          width="30"
                          height="30"
                          viewBox="0 0 18 18"
                          fill="none"
                          stroke={on ? "#0b7a45" : "#8fa59a"}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transition: "stroke .5s ease" }}
                        >
                          <path d={nv.d} />
                        </svg>
                      </div>
                      <div
                        style={{
                          marginTop: 20,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 19,
                          fontWeight: 700,
                          letterSpacing: "-.01em",
                          color: on ? "var(--rb-ink)" : "#e6f0eb",
                          transition: "color .5s ease",
                        }}
                      >
                        {m.id === "routine" ? t("Daily routine") : t(nv.label)}
                        {m.soon && (
                          <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.2)" }}>
                            {t("SOON")}
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: on ? "var(--rb-body)" : "#a9c6b8", textWrap: "pretty", transition: "color .5s ease" }}>
                        {t(m.desc)}
                      </div>
                      <div style={{ flex: 1 }} />
                      <div
                        style={{
                          position: "relative",
                          alignSelf: "stretch",
                          height: 46,
                          margin: "0 -8px -6px",
                          borderRadius: 999,
                          background: on ? "#e3ebe6" : "#14291f",
                          transition: "background .5s ease",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            bottom: 4,
                            left: 4,
                            width: "calc(50% - 4px)",
                            borderRadius: 999,
                            background: on ? "var(--rb-green)" : "#e6f0eb",
                            boxShadow: on ? "0 6px 14px -8px rgba(23,184,102,.9)" : "0 6px 14px -8px rgba(0,0,0,.5)",
                            transform: `translateX(${on ? 100 : 0}%)`,
                            transition: `transform .6s ${E},background .5s ease,box-shadow .5s ease`,
                          }}
                        />
                        <div
                          style={{
                            position: "relative",
                            height: "100%",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            alignItems: "center",
                            ...silk(11, { letterSpacing: ".14em" }),
                          }}
                        >
                          <div style={{ textAlign: "center", color: on ? "var(--rb-faint)" : "var(--rb-ink)", transition: "color .5s ease" }}>{t("OFF")}</div>
                          <div style={{ textAlign: "center", color: on ? "#fff" : "rgba(230,240,235,.6)", transition: "color .5s ease" }}>{t("ON")}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 14, animation: `rb-toast .6s ${E} 3.1s both` }}>
              <div style={silk(10, { letterSpacing: ".14em", color: "#a9c6b8" })}>{t("{count}/4 ON", { count })}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setPhase("form")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "15px 24px 15px 20px",
                    borderRadius: 999,
                    cursor: "pointer",
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    color: "#e6f0eb",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#e6f0eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                  {t("Back")}
                </button>
                <button
                  onClick={() => void finish()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "15px 30px",
                    border: 0,
                    borderRadius: 999,
                    cursor: "pointer",
                    background: "var(--rb-green-grad)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                  }}
                >
                  {t("Let's go")}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
