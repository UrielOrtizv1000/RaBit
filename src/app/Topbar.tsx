/**
 * Barra superior fija: logo (cambia tema), búsqueda global, notificaciones, ajustes y chip de usuario.
 * La búsqueda escribe en `useUi().search`; el panel y las listas lo leen para filtrar.
 */
import { useState } from "react";
import { useUi } from "../store/ui";
import { useData } from "../store/data";
import { t } from "../i18n";
import { darkPill, glassPill, silk } from "../components/ui/glass";

interface Notif {
  title: string;
  sub: string;
  color: string;
}
const NOTIFS: Notif[] = [];

export function Topbar({ onSettings }: { onSettings: () => void }) {
  const { setPage, setSearch } = useUi();
  const theme = useData((s) => s.settings.theme);
  const updateSettings = useData((s) => s.updateSettings);
  const toggleTheme = () => void updateSettings({ theme: theme === "light" ? "dark" : "light" });
  const name = useData((s) => s.user?.name ?? "");
  const [logoHover, setLogoHover] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const initial = (name.trim()[0] ?? "R").toUpperCase();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 26px 6px", flex: "none" }}>
      <div
        role="button"
        tabIndex={0}
        title={t("Switch light / dark")}
        onMouseEnter={() => setLogoHover(true)}
        onMouseLeave={() => setLogoHover(false)}
        onClick={toggleTheme}
        onKeyDown={(e) => e.key === "Enter" && toggleTheme()}
        style={{
          cursor: "pointer",
          transition: "box-shadow .3s ease-out,transform .2s ease-out",
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "8px 14px",
          borderRadius: 999,
          ...darkPill,
        }}
      >
        <div style={silk(13, { fontWeight: 700, color: "#3ddc84", textShadow: "0 0 9px rgba(61,220,132,.7)" })}>&gt;</div>
        <div style={silk(14, { fontWeight: 700, letterSpacing: ".06em", color: "#3ddc84", textShadow: "0 0 10px rgba(61,220,132,.55)" })}>RABIT</div>
        <div style={{ width: 6, height: 13, background: "#3ddc84", boxShadow: "0 0 8px rgba(61,220,132,.8)", animation: "rb-cursor 1.1s steps(1) infinite" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
            whiteSpace: "nowrap",
            maxWidth: logoHover ? 110 : 0,
            opacity: logoHover ? 1 : 0,
            marginLeft: logoHover ? 2 : -9,
            transition: "max-width .4s cubic-bezier(.2,.8,.3,1),opacity .25s ease-out,margin-left .3s ease-out",
          }}
        >
          <div style={{ width: 1, height: 14, flex: "none", background: "rgba(61,220,132,.3)" }} />
          {theme === "dark" ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3ddc84"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 5px rgba(61,220,132,.7))", animation: "rb-tilt 2.4s ease-in-out infinite" }}
            >
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3ddc84"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 5px rgba(61,220,132,.7))", animation: "rb-spin 6s linear infinite" }}
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
          <div style={silk(10, { letterSpacing: ".1em", color: "#3ddc84", textShadow: "0 0 8px rgba(61,220,132,.5)" })}>
            {(theme === "dark" ? t("Dark") : t("Light")).toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex" }}>
        <label
          className="rb-hover-bg"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: 380,
            padding: "11px 18px",
            borderRadius: 999,
            background: "linear-gradient(145deg,rgba(255,255,255,.7),rgba(255,255,255,.4))",
            backdropFilter: "blur(20px) saturate(170%)",
            border: "1px solid rgba(255,255,255,.8)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,.95),0 10px 24px -18px rgba(20,48,34,.4)",
            color: "#6b7a73",
            fontSize: 13,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6b7a73" strokeWidth="1.6">
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.5 10.5 14 14" />
          </svg>
          <input
            id="rb-search"
            aria-label={t("Search")}
            placeholder={t("Search events, notes…")}
            onKeyDown={(e) => {
              setSearch(e.currentTarget.value);
              if (e.key === "Enter" && e.currentTarget.value.trim()) setPage("notes");
            }}
            style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#121a16" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          role="button"
          aria-label={t("Notifications")}
          tabIndex={0}
          title={t("Notifications")}
          className="rb-hover-scale"
          onClick={() => setNotifOpen((o) => !o)}
          style={{
            position: "relative",
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            ...glassPill,
            transition: "transform .15s ease-out",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#2b3a34" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M4.5 7.2a4.5 4.5 0 0 1 9 0c0 3.3 1.2 4.3 1.2 4.3H3.3s1.2-1 1.2-4.3Z" />
            <path d="M7.4 14a1.7 1.7 0 0 0 3.2 0" />
          </svg>
          {NOTIFS.length > 0 && (
            <div style={{ position: "absolute", top: 10, right: 11, width: 6, height: 6, borderRadius: "50%", background: "#17b866", boxShadow: "0 0 0 2px #fff" }} />
          )}
          {notifOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                right: -6,
                top: 52,
                zIndex: 50,
                width: 320,
                padding: 10,
                borderRadius: 24,
                cursor: "default",
                background: "linear-gradient(150deg,rgba(255,255,255,.92),rgba(245,250,247,.8))",
                backdropFilter: "blur(30px) saturate(170%)",
                border: "1px solid rgba(255,255,255,.9)",
                boxShadow: "inset 0 1px 1px #fff,0 30px 60px -24px rgba(12,40,26,.45)",
                animation: "rb-toast .18s ease-out both",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Notifications")}</div>
              </div>
              {NOTIFS.length === 0 && <div style={{ padding: "6px 10px 10px", fontSize: 12.5, color: "#5d6f67" }}>{t("You are all caught up.")}</div>}
            </div>
          )}
        </div>
        <div
          role="button"
          aria-label={t("Settings")}
          tabIndex={0}
          title={t("Settings")}
          className="rb-hover-scale"
          onClick={onSettings}
          style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", ...glassPill, transition: "transform .15s ease-out" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2b3a34" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px 4px 4px", borderRadius: 999, ...glassPill }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(145deg,#0b7a45,#4fc389)",
              display: "grid",
              placeItems: "center",
              ...silk(11, { color: "#fff" }),
            }}
          >
            {initial}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1d2a24" }}>{name || "RaBit"}</div>
        </div>
      </div>
    </div>
  );
}
