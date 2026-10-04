/**
 * Ajustes: perfil, módulos, hora y fecha, recordatorios, apariencia (tema, idioma, cristal), datos
 * (exportar/importar) y herramientas de prueba (datos de ejemplo / borrar todo).
 */
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useData, type BackupFile } from "../../store/data";
import { useUi } from "../../store/ui";
import { NAV } from "../../app/nav";
import { downloadBackup, readBackupFile } from "../../services/backup";
import { clearAllData, seedDemoData } from "../../services/seed";
import type { Modules, Settings } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { LANGS, t, type Lang } from "../../i18n";

const MODS: { id: keyof Modules; desc: string; soon?: boolean }[] = [
  { id: "calendar", desc: "Events, tasks and RaBit reminders." },
  { id: "routine", desc: "Your recurring week, wake-up and bedtime." },
  { id: "notes", desc: "Fast notes you can turn into tasks." },
  { id: "savings", desc: "Set goals and track what you save.", soon: true },
];
const navOf = (id: string) => NAV.find((n) => n.id === id) ?? NAV[0];

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,.7)",
  boxShadow: "inset 0 1px 1px #fff",
};
const label = (text: string, mt = 18): ReactNode => <div style={{ ...silk(9.5, { letterSpacing: ".16em", color: "#6b7a73" }), margin: `${mt}px 0 8px` }}>{t(text)}</div>;

function Switch({ on, onClick, label: aria }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={aria}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 42,
        height: 24,
        flex: "none",
        border: 0,
        cursor: "pointer",
        borderRadius: 12,
        padding: 3,
        background: on ? "#17b866" : "#c7d0cc",
        transition: "background .2s ease-out",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(12,40,26,.3)",
          transform: `translateX(${on ? 18 : 0}px)`,
          transition: "transform .2s ease-out",
        }}
      />
    </button>
  );
}

function Seg<T extends string | number>({ value, opts, onPick }: { value: T; opts: { id: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
      {opts.map((o) => {
        const a = o.id === value;
        return (
          <button
            key={String(o.id)}
            onClick={() => onPick(o.id)}
            aria-pressed={a}
            style={{
              padding: "7px 12px",
              border: 0,
              borderRadius: 999,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              color: a ? "#121a16" : "#5d6f67",
              background: a ? "#fff" : "transparent",
              boxShadow: a ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
              transition: "background .2s ease-out",
            }}
          >
            {t(o.label)}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsModal() {
  const open = useUi((s) => s.settingsOpen);
  const openSettings = useUi((s) => s.openSettings);
  const showToast = useUi((s) => s.showToast);
  const { user, settings, updateSettings, setName, exportAll, importAll } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  if (!open) return null;

  const close = () => openSettings(false);
  const setMods = (modules: Modules) => void updateSettings({ modules });
  const on = MODS.filter((m) => settings.modules[m.id]).length;
  const pick = <K extends keyof Settings>(k: K, v: Settings[K]) => void updateSettings({ [k]: v } as Partial<Settings>);
  const initial = (user?.name.trim()[0] ?? "R").toUpperCase();

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b: BackupFile = await readBackupFile(f);
      await importAll(b);
      showToast(t("Backup imported"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("Could not import that file"));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

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
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", color: "#121a16" }}>{t("Settings")}</div>
          <button
            aria-label={t("Close")}
            onClick={close}
            className="rb-hover-bg"
            style={{ width: 30, height: 30, border: 0, background: "transparent", borderRadius: "50%", cursor: "pointer", color: "#5d6f67", fontSize: 16 }}
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
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#5d6f67", marginBottom: 3 }}>{t("Your name · used in greetings")}</div>
              <input
                aria-label={t("Your name")}
                value={user?.name ?? ""}
                onChange={(e) => void setName(e.target.value)}
                placeholder={t("Your name")}
                style={{ width: "100%", border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#121a16" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 8px" }}>
            <div style={silk(9.5, { letterSpacing: ".16em", color: "#6b7a73" })}>{t("MODULES · {on}/4 ON", { on })}</div>
            <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
              <button
                onClick={() => setMods({ calendar: true, routine: true, notes: true, savings: true })}
                style={{
                  padding: "5px 11px",
                  border: 0,
                  background: "transparent",
                  borderRadius: 999,
                  fontFamily: "inherit",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#0b7a45",
                }}
              >
                {t("All on")}
              </button>
              <button
                onClick={() => setMods({ calendar: false, routine: false, notes: false, savings: false })}
                style={{
                  padding: "5px 11px",
                  border: 0,
                  background: "transparent",
                  borderRadius: 999,
                  fontFamily: "inherit",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#5d6f67",
                }}
              >
                {t("All off")}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MODS.map((m) => {
              const nv = navOf(m.id),
                a = settings.modules[m.id];
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMods({ ...settings.modules, [m.id]: !a })}
                  onKeyDown={(e) => e.key === "Enter" && setMods({ ...settings.modules, [m.id]: !a })}
                  style={{ ...row, cursor: "pointer", opacity: a ? 1 : 0.72, transition: "opacity .2s ease-out" }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      flex: "none",
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: a ? "rgba(23,184,102,.14)" : "rgba(18,38,30,.06)",
                      boxShadow: "inset 0 1px 1px #fff",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={a ? "#0b7a45" : "#8b9a93"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={nv.d} />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#121a16" }}>
                      {t(nv.label)}
                      {m.soon && (
                        <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                          {t("SOON")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>{t(m.desc)}</div>
                  </div>
                  <Switch on={a} label={t(nv.label)} onClick={() => setMods({ ...settings.modules, [m.id]: !a })} />
                </div>
              );
            })}
            <div style={{ padding: "4px 4px 0", fontSize: 11.5, lineHeight: 1.5, color: "#6b7a73" }}>
              {t("Home always stays on. Turned-off modules disappear from the sidebar and Home — your data is kept.")}
            </div>
          </div>

          {label("TIME & DATE")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Time format")}</div>
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
              <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Week starts on")}</div>
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
            <div style={{ ...row, cursor: "pointer" }} onClick={() => pick("reminders", !settings.reminders)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Reminders")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>{t("RaBit pops up before your events and deadlines.")}</div>
              </div>
              <Switch on={settings.reminders} label={t("Reminders")} onClick={() => pick("reminders", !settings.reminders)} />
            </div>
            <div style={{ ...row, cursor: "pointer" }} onClick={() => pick("sound", !settings.sound)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Sound")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>{t("Play a soft 8-bit chime with reminders.")}</div>
              </div>
              <Switch on={settings.sound} label={t("Sound")} onClick={() => pick("sound", !settings.sound)} />
            </div>
          </div>

          {label("APPEARANCE")}
          <div style={{ ...row, justifyContent: "space-between", padding: "10px 10px 10px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Theme")}</div>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Language")}</div>
            <Seg<Lang> value={settings.language} opts={LANGS} onPick={(v) => pick("language", v)} />
          </div>
          <div style={{ ...row, cursor: "pointer", marginTop: 8 }} onClick={() => pick("glass", !settings.glass)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Glass effect")}</div>
              <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>
                {t("A very subtle transparency so you can faintly see what is behind the window.")}
              </div>
            </div>
            <Switch on={settings.glass} label={t("Glass effect")} onClick={() => pick("glass", !settings.glass)} />
          </div>

          {label("DATA")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Backup")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>{t("Everything lives on this device. Export a .json to keep a copy.")}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => void downloadBackup(exportAll()).then((ok) => ok && showToast(t("Backup exported")))}
                  style={{
                    padding: "8px 14px",
                    border: 0,
                    borderRadius: 999,
                    background: "#fff",
                    boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0b7a45",
                    cursor: "pointer",
                  }}
                >
                  {t("Export")}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: "8px 14px",
                    border: 0,
                    borderRadius: 999,
                    background: "#fff",
                    boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0b7a45",
                    cursor: "pointer",
                  }}
                >
                  {t("Import")}
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
              </div>
            </div>
            <div style={{ ...row, justifyContent: "space-between", opacity: 0.8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Cloud sync")}</div>
              <span style={{ ...silk(9, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "4px 8px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                {t("COMING SOON")}
              </span>
            </div>
          </div>

          {label("TRY RABIT")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Demo data")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>
                  {t("Fills every module with sample tasks, events, notes, routine and stocks — including a reminder that rings in about 3 minutes.")}
                </div>
              </div>
              <button
                onClick={() => void seedDemoData().then(() => showToast(t("Demo data loaded")))}
                style={{
                  padding: "8px 14px",
                  border: 0,
                  borderRadius: 999,
                  background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {t("Load")}
              </button>
            </div>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Clear all data")}</div>
                <div style={{ fontSize: 12, color: "#5d6f67", marginTop: 3, lineHeight: 1.45 }}>
                  {t("Removes tasks, events, notes, routine and portfolio. Your name and settings stay.")}
                </div>
              </div>
              <button
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  setConfirmClear(false);
                  void clearAllData().then(() => showToast(t("All data cleared")));
                }}
                onBlur={() => setConfirmClear(false)}
                style={{
                  padding: "8px 14px",
                  border: 0,
                  borderRadius: 999,
                  background: confirmClear ? "#a8443a" : "#fff",
                  boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  color: confirmClear ? "#fff" : "#a8443a",
                  cursor: "pointer",
                }}
              >
                {confirmClear ? t("Sure?") : t("Clear")}
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 24px 22px" }}>
          <button
            onClick={close}
            style={{
              width: "100%",
              padding: 12,
              border: 0,
              borderRadius: 999,
              background: "linear-gradient(150deg,#1fc172,#0f9a56)",
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
