/**
 * Onboarding: columna izquierda (nombre, idioma y aviso de inicio de sesión próximamente).
 */
import { silk } from "../../components/ui/glass";
import { LANGS, t } from "../../i18n";
import { useData } from "../../store/data";

interface Props {
  ob: boolean;
  name: string;
  setName: (v: string) => void;
  error: string;
  setError: (v: string) => void;
  touched: boolean;
  submit: () => void;
}

export function OnboardingForm({ ob, name, setName, error, setError, touched, submit }: Props) {
  const language = useData((s) => s.settings.language);
  const updateSettings = useData((s) => s.updateSettings);
  return (
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
          <div style={silk(10, { letterSpacing: ".16em", color: "var(--rb-faint)", marginBottom: 12 })}>{t("OFFLINE MODE")}</div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1.08, color: "var(--rb-ink)" }}>{t("Use RaBit locally.")}</div>
          <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--rb-muted)", marginTop: 10, maxWidth: 400, textWrap: "pretty" }}>
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
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--rb-faint)", marginBottom: 3 }}>{t("Your name")}</div>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t("How should RaBit call you?")}
                style={{ width: "100%", border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--rb-ink)" }}
              />
            </label>
            {error && (
              <div role="alert" style={{ padding: "2px 6px", fontSize: 12.5, fontWeight: 600, color: "var(--rb-danger)", animation: "rb-toast .18s ease-out both" }}>
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
                  background: "var(--rb-green-grad)",
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
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Cloud sync")}</div>
              <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("Sign in and sync across devices — coming soon.")}</div>
            </div>
            <span style={{ ...silk(9, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "4px 8px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>{t("SOON")}</span>
          </div>
        </div>
        <div style={{ position: "relative", paddingLeft: 58, fontSize: 11.5, color: "#8b9a93" }}>{t("RaBit · personal organizer")}</div>
      </div>
    </div>
  );
}
