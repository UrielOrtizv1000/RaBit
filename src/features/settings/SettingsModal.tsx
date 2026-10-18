/**
 * Ajustes: perfil, módulos, hora y fecha, recordatorios (en desarrollo), apariencia (tema, idioma, tamaño del texto), datos
 * (exportar/importar) y herramientas de prueba (datos de ejemplo / borrar todo). Las secciones largas viven en sus propios archivos.
 */
import type { FontSize, Modules, Settings } from "../../domain/types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { silk } from "../../components/ui/glass";
import { LANGS, t, type Lang } from "../../i18n";
import { label, row, Seg, Switch } from "./settingsParts";
import { ModulesSection } from "./ModulesSection";
import { DataSection } from "./DataSection";
import { TrySection } from "./TrySection";

export function SettingsModal() {
  const open = useUi((s) => s.settingsOpen);
  const openSettings = useUi((s) => s.openSettings);
  const { user, settings, updateSettings, setName } = useData();
  if (!open) return null;

  const close = () => openSettings(false);
  const setMods = (modules: Modules) => void updateSettings({ modules });
  const pick = <K extends keyof Settings>(k: K, v: Settings[K]) => void updateSettings({ [k]: v } as Partial<Settings>);
  const initial = (user?.name.trim()[0] ?? "R").toUpperCase();

  return (
    <div
      onClick={close}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        padding: "10px 26px 42px",
        background: "rgba(16,32,25,.3)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        role="dialog"
        aria-label={t("Settings")}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 30,
          background: "linear-gradient(150deg,rgba(255,255,255,.92),rgba(245,250,247,.8))",
          backdropFilter: "blur(30px) saturate(170%)",
          border: "1px solid rgba(255,255,255,.9)",
          boxShadow: "inset 0 1px 1px #fff,0 40px 90px -30px rgba(12,40,26,.55)",
          animation: "rb-toast .18s ease-out both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 6px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", color: "var(--rb-ink)" }}>{t("Settings")}</div>
          <button
            aria-label={t("Close")}
            onClick={close}
            className="rb-hover-bg"
            style={{ width: 30, height: 30, border: 0, background: "transparent", borderRadius: "50%", cursor: "pointer", color: "var(--rb-muted)", fontSize: 16 }}
          >
            ×
          </button>
        </div>
        <div className="rb-thin-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 18px 22px 24px", marginRight: 4 }}>
          {label("PROFILE")}
          <div style={row}>
            <div
              style={{
                width: 40,
                height: 40,
                flex: "none",
                borderRadius: "50%",
                background: "linear-gradient(145deg,#0b7a45,#4fc389)",
                display: "grid",
                placeItems: "center",
                ...silk(13, { color: "#fff" }),
              }}
            >
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--rb-muted)", marginBottom: 3 }}>{t("Your name · used in greetings")}</div>
              <input
                aria-label={t("Your name")}
                value={user?.name ?? ""}
                onChange={(e) => void setName(e.target.value)}
                placeholder={t("Your name")}
                style={{ width: "100%", border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--rb-ink)" }}
              />
            </div>
          </div>

          <ModulesSection modules={settings.modules} setMods={setMods} />

          {label("TIME & DATE")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Time format")}</div>
              <Seg
                value={settings.timeFormat}
                opts={[
                  { id: "12h", label: "12h" },
                  { id: "24h", label: "24h" },
                ]}
                onPick={(v) => pick("timeFormat", v)}
              />
            </div>
            <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Week starts on")}</div>
              <Seg
                value={settings.weekStart}
                opts={[
                  { id: 1, label: "Monday" },
                  { id: 0, label: "Sunday" },
                ]}
                onPick={(v) => pick("weekStart", v)}
              />
            </div>
          </div>

          {label("RABIT")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...row, opacity: 0.8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>
                  {t("Reminders")}
                  <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                    {t("IN DEVELOPMENT")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("RaBit pops up before your events and deadlines.")}</div>
              </div>
              <Switch on={false} disabled label={t("Reminders")} onClick={() => undefined} />
            </div>
            <div style={{ ...row, opacity: 0.8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>
                  {t("Sound")}
                  <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                    {t("IN DEVELOPMENT")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("Play a soft 8-bit chime with reminders.")}</div>
              </div>
              <Switch on={false} disabled label={t("Sound")} onClick={() => undefined} />
            </div>
          </div>

          {label("APPEARANCE")}
          <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Theme")}</div>
            <Seg
              value={settings.theme}
              opts={[
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark" },
              ]}
              onPick={(v) => pick("theme", v)}
            />
          </div>
          <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px", marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Language")}</div>
            <Seg<Lang> value={settings.language} opts={LANGS} onPick={(v) => pick("language", v)} />
          </div>
          <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px", marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Text size")}</div>
            <Seg<FontSize>
              value={settings.fontSize}
              opts={[
                { id: "small", label: "Small" },
                { id: "medium", label: "Medium" },
                { id: "large", label: "Large" },
              ]}
              onPick={(v) => pick("fontSize", v)}
            />
          </div>

          <DataSection close={close} />

          <TrySection />
        </div>
        <div style={{ padding: "16px 24px 22px" }}>
          <button
            onClick={close}
            style={{
              width: "100%",
              padding: 12,
              border: 0,
              borderRadius: 999,
              background: "var(--rb-green-grad)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 14px 26px -14px rgba(23,184,102,1)",
            }}
          >
            {t("Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
