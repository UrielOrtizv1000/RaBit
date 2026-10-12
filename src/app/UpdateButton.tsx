/**
 * Ícono de «hay una actualización» en la barra superior (junto a las notificaciones) y su panel.
 * Mismo cristal de 42 px que la campana; punto naranja; con la descarga en curso muestra un anillo de progreso.
 * Aparece con fade + scale. Solo se ve cuando hay algo que hacer (disponible, descargando, listo o error).
 */
import { useEffect, useRef, useState } from "react";
import { useUpdater } from "../services/updater";
import { t } from "../i18n";
import { glassPill, silk } from "../components/ui/glass";

const EASE = "cubic-bezier(.22,1,.36,1)";
const RING_R = 19;
const RING_C = 2 * Math.PI * RING_R;
const MAX_NOTES = 5;

const primary = {
  padding: "11px 20px",
  border: 0,
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: "linear-gradient(150deg,#1fc172,#0f9a56)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 14px 26px -14px rgba(23,184,102,1)",
} as const;
const secondary = {
  padding: "11px 18px",
  border: 0,
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: "#5d6f67",
  background: "transparent",
} as const;

export function UpdateButton() {
  const { status, progress, current, next, error } = useUpdater();
  const { api } = useUpdater;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const visible = (status === "available" || status === "downloading" || status === "ready" || status === "error") && next !== null;
  if (!visible) return null;

  const busy = status === "downloading";
  const pct = Math.round(progress * 100);
  const dot = status === "error" ? "#a8443a" : status === "ready" ? "#17b866" : "#e0902a";

  return (
    <div ref={box} data-tour="update" style={{ position: "relative", animation: `rb-upd-in .5s ${EASE} both` }}>
      <style>{`@keyframes rb-upd-in{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[data-tour="update"]{animation:none!important}}`}</style>
      <button
        type="button"
        aria-label={t("Update available")}
        aria-expanded={open}
        title={t("Update available")}
        className="rb-hover-scale"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          width: 42,
          height: 42,
          padding: 0,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: "#2b3a34",
          ...glassPill,
          transition: "transform .15s ease-out",
        }}
      >
        {(busy || status === "ready") && (
          <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" style={{ position: "absolute", inset: -1, transform: "rotate(-90deg)", pointerEvents: "none" }}>
            <circle cx="21" cy="21" r={RING_R} fill="none" stroke="rgba(18,38,30,.1)" strokeWidth="2.5" />
            <circle
              cx="21"
              cy="21"
              r={RING_R}
              fill="none"
              stroke="#17b866"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress)}
              style={{ transition: `stroke-dashoffset .4s ${EASE}` }}
            />
          </svg>
        )}
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 2.8v8.4M5.4 7.8 9 11.4l3.6-3.6M3.2 14.6h11.6" />
        </svg>
        <span style={{ position: "absolute", top: 10, right: 11, width: 6, height: 6, borderRadius: "50%", background: dot, boxShadow: "0 0 0 2px #fff" }} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("Update available")}
          style={{
            position: "absolute",
            right: 0,
            top: 52,
            zIndex: 50,
            width: 330,
            boxSizing: "border-box",
            padding: "14px 16px 16px",
            borderRadius: 24,
            background: "linear-gradient(150deg,rgba(255,255,255,.97),rgba(245,250,247,.95))",
            backdropFilter: "blur(30px) saturate(170%)",
            border: "1px solid rgba(255,255,255,.9)",
            boxShadow: "inset 0 1px 1px #fff,0 30px 60px -24px rgba(12,40,26,.45)",
            animation: "rb-toast .18s ease-out both",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#121a16" }}>{t("Update available")}</div>
            <div style={silk(9, { letterSpacing: ".1em", color: "#0b7a45" })}>v{next.version}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7a73", marginTop: 3 }}>{t("You have v{current}", { current })}</div>

          {next.notes.length > 0 && status !== "error" && (
            <div style={{ marginTop: 12 }}>
              <div style={silk(9, { letterSpacing: ".14em", color: "#6b7a73", marginBottom: 7 })}>{t("WHAT'S NEW")}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {next.notes.slice(0, MAX_NOTES).map((n, i) => (
                  <li key={i} style={{ display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.45, color: "#41504a" }}>
                    <span aria-hidden="true" style={{ width: 5, height: 5, flex: "none", marginTop: 6, borderRadius: 2, background: "#17b866" }} />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {busy && (
            <div style={{ marginTop: 14 }} aria-live="polite">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5d6f67", marginBottom: 7 }}>
                <span>{t("Downloading update…")}</span>
                <span style={{ fontWeight: 700, color: "#121a16" }}>{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                style={{ height: 8, borderRadius: 4, background: "rgba(18,38,30,.08)", overflow: "hidden" }}
              >
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#1fc172,#0f9a56)", transition: `width .4s ${EASE}` }} />
              </div>
            </div>
          )}

          {status === "error" && (
            <div role="alert" style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "#a8443a" }}>
              {t("Couldn't update — try again")}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 14 }}>
            <button type="button" onClick={() => setOpen(false)} className="rb-hover-bg" style={secondary}>
              {t("Later")}
            </button>
            {status === "available" && (
              <button type="button" onClick={() => void api.download()} style={primary}>
                {t("Update")}
              </button>
            )}
            {status === "ready" && (
              <button type="button" onClick={() => void api.restartNow()} style={primary}>
                {t("Restart to update")}
              </button>
            )}
            {status === "error" && (
              <button type="button" onClick={() => void api.retry()} style={primary} title={error ?? undefined}>
                {t("Retry")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
