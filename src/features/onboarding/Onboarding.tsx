/**
 * Primer arranque: nombre (modo local) y elección de módulos. Incluye selector de idioma.
 * Cuando termina escribe usuario + ajustes en la base de datos.
 */
import { useEffect, useState } from "react";
import { useData } from "../../store/data";
import { NAV } from "../../app/nav";
import type { Modules } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { LANGS, t } from "../../i18n";

const MODS: { id: keyof Modules; desc: string; soon?: boolean }[] = [
  { id: "calendar", desc: "Events, tasks and RaBit reminders." },
  { id: "routine", desc: "Your recurring week, wake-up and bedtime." },
  { id: "notes", desc: "Fast notes you can turn into tasks." },
  { id: "savings", desc: "Set goals and track what you save.", soon: true },
];
const IDS = MODS.map((m) => m.id);
const E = "cubic-bezier(.22,1,.36,1)";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const complete = useData((s) => s.completeOnboarding);
  const language = useData((s) => s.settings.language);
  const updateSettings = useData((s) => s.updateSettings);
  const [phase, setPhase] = useState<"form" | "onboard">("form");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [mods, setMods] = useState<Modules>({ calendar: true, routine: true, notes: true, savings: true });
  const ob = phase === "onboard";
  const count = IDS.filter((i) => mods[i]).length;

  const submit = () => {
    if (!name.trim()) {
      setError(t("Tell RaBit your name to continue."));
      setTouched(true);
      return;
    }
    setError("");
    setPhase("onboard");
  };
  const finish = async () => {
    await complete(name, mods);
    onDone();
  };

  useEffect(() => {
    if (!ob) return;
    const kd = (e: KeyboardEvent) => {
      const k = ["1", "2", "3", "4"].indexOf(e.key);
      if (k >= 0) setMods((p) => ({ ...p, [IDS[k]]: !p[IDS[k]] }));
      else if (e.key === "Enter") void finish();
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "rgba(245,248,246,var(--glass-a))", display: "flex" }}>
      {/* LEFT · FORM */}
      <div style={{ position: "relative", zIndex: 2, flex: "none", width: ob ? 0 : 600, overflow: "hidden", transition: "width .9s cubic-bezier(.7,0,.2,1)" }}>
        <div
          style={{
            position: "relative",
            width: 600,
            height: "100%",
            padding: "26px 0 26px 26px",
            display: "flex",
            flexDirection: "column",
            opacity: ob ? 0 : 1,
            transform: `translateX(${ob ? -80 : 0}px)`,
            transition: "opacity .45s ease-out,transform .8s cubic-bezier(.7,0,.2,1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -140,
              top: -160,
              width: 560,
              height: 480,
              borderRadius: "50%",
              background: "rgba(122,221,159,.4)",
              filter: "blur(100px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 60px 0 58px",
              animation: "rb-rise .45s ease-out both",
            }}
          >
            <div style={{ position: "absolute", top: 4, left: 58, display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => void updateSettings({ language: l.id })}
                  aria-pressed={language === l.id}
                  style={{
                    padding: "6px 12px",
                    border: 0,
                    borderRadius: 999,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 600,
                    color: language === l.id ? "#121a16" : "#5d6f67",
                    background: language === l.id ? "#fff" : "transparent",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div style={silk(10, { letterSpacing: ".16em", color: "#6b7a73", marginBottom: 12 })}>{t("OFFLINE MODE")}</div>
            <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1.08, color: "#121a16" }}>{t("Use RaBit locally.")}</div>
            <div style={{ fontSize: 15, lineHeight: 1.55, color: "#5d6f67", marginTop: 10, maxWidth: 400, textWrap: "pretty" }}>
              {t("Everything stays on this device — no account needed. Just tell RaBit your name.")}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, maxWidth: 420 }}>
              <label
                style={{
                  display: "block",
                  padding: "10px 18px 11px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,.85)",
                  border: `1px solid ${touched && !name.trim() ? "rgba(168,68,58,.55)" : "rgba(18,38,30,.1)"}`,
                  boxShadow: "inset 0 1px 1px #fff",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a73", marginBottom: 3 }}>{t("Your name")}</div>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={t("How should RaBit call you?")}
                  style={{ width: "100%", border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#121a16" }}
                />
              </label>
              {error && (
                <div role="alert" style={{ padding: "2px 6px", fontSize: 12.5, fontWeight: 600, color: "#a8443a", animation: "rb-toast .18s ease-out both" }}>
                  {error}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                <button
                  onClick={submit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 200,
                    height: 50,
                    padding: "0 22px",
                    border: 0,
                    borderRadius: 999,
                    cursor: "pointer",
                    background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: name.trim() ? 1 : 0.6,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 16px 28px -14px rgba(23,184,102,.95)",
                  }}
                >
                  {t("Start locally")}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 30,
                maxWidth: 420,
                boxSizing: "border-box",
                padding: "14px 16px",
                borderRadius: 22,
                background: "linear-gradient(145deg,rgba(255,255,255,.6),rgba(255,255,255,.35))",
                border: "1px solid rgba(255,255,255,.95)",
                opacity: 0.85,
              }}
            >
              <div style={{ width: 40, height: 40, flex: "none", borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(18,38,30,.06)" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2b3a34" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13.5h7.6a3 3 0 0 0 .4-5.97A4.2 4.2 0 0 0 4.9 6.9 3.3 3.3 0 0 0 5 13.5Z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Cloud sync")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>{t("Sign in and sync across devices — coming soon.")}</div>
              </div>
              <span style={{ ...silk(9, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "4px 8px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>{t("SOON")}</span>
            </div>
          </div>
          <div style={{ position: "relative", paddingLeft: 58, fontSize: 11.5, color: "#8b9a93" }}>{t("RaBit · personal organizer")}</div>
        </div>
      </div>

      {/* RIGHT · TERMINAL PANEL */}
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
                <div style={{ width: 6, height: 6, background: "#3ddc84", boxShadow: "0 0 8px rgba(61,220,132,.8)" }} />
                <div style={silk(9.5, { letterSpacing: ".12em", color: "#6ee6a4" })}>V1.0 · DESKTOP</div>
              </div>
              <div style={{ textAlign: "center", animation: "rb-rise .5s ease-out .15s both" }}>
                <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 44, lineHeight: 1.12, color: "#3ddc84", textShadow: "0 0 16px rgba(61,220,132,.5)" }}>
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
                      background: "#3ddc84",
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
                  <div style={{ width: 6, height: 6, background: "#3ddc84" }} />
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
                      color: "#3ddc84",
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
                        background: "#3ddc84",
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
                            color: on ? "#121a16" : "#e6f0eb",
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
                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: on ? "#41504a" : "#a9c6b8", textWrap: "pretty", transition: "color .5s ease" }}>
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
                              background: on ? "#17b866" : "#e6f0eb",
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
                            <div style={{ textAlign: "center", color: on ? "#6b7a73" : "#121a16", transition: "color .5s ease" }}>{t("OFF")}</div>
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
                      background: "linear-gradient(150deg,#1fc172,#0f9a56)",
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
    </div>
  );
}
