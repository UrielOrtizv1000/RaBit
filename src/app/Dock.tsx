/**
 * Barra lateral de navegación. Muestra solo los módulos activados en Ajustes (Home siempre visible).
 * El resaltado de la página activa se desliza entre iconos con `layoutId` (animación de resorte).
 * Se centra en vertical y respeta la zona segura inferior igual que el contenido.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useUi, type PageId } from "../store/ui";
import { useData } from "../store/data";
import type { Modules } from "../domain/types";
import { NAV } from "./nav";
import { t } from "../i18n";

const moduleOf: Partial<Record<PageId, keyof Modules>> = {
  calendar: "calendar",
  routine: "routine",
  notes: "notes",
  savings: "savings",
};

export function Dock() {
  const { page, setPage } = useUi();
  const modules = useData((s) => s.settings.modules);
  const [hover, setHover] = useState<PageId | null>(null);
  const items = NAV.filter((n) => {
    const m = moduleOf[n.id];
    return !m || modules[m];
  });

  return (
    <div style={{ position: "relative", zIndex: 10, flex: "none", alignSelf: "center", padding: "0 20px 58px 26px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: 8,
          height: "max-content",
          borderRadius: 26,
          background: "linear-gradient(160deg,rgba(255,255,255,.66),rgba(255,255,255,.32))",
          backdropFilter: "blur(24px) saturate(170%)",
          border: "1px solid rgba(255,255,255,.85)",
          boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 20px -14px rgba(255,255,255,.7),0 22px 44px -26px rgba(20,48,34,.4)",
        }}
      >
        {items.map((n) => {
          const active = page === n.id,
            hov = hover === n.id;
          return (
            <button
              key={n.id}
              aria-label={t(n.label)}
              aria-current={active ? "page" : undefined}
              onClick={() => setPage(n.id)}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "relative",
                width: 46,
                height: 46,
                border: 0,
                padding: 0,
                cursor: "pointer",
                borderRadius: 17,
                display: "grid",
                placeItems: "center",
                background: hov && !active ? "rgba(255,255,255,.7)" : "transparent",
                transition: "background .2s ease-out",
              }}
            >
              {active && (
                <motion.div
                  layoutId="dock-active"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 17,
                    background: "linear-gradient(150deg,#1fc172,#0f9a56)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 10px 20px -10px rgba(23,184,102,.9)",
                  }}
                />
              )}
              <svg
                style={{ position: "relative", transition: "stroke .2s ease-out" }}
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke={active ? "#fff" : hov ? "#1d2a24" : "#5d6f67"}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={n.d} />
              </svg>
              <div
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: "50%",
                  width: 4,
                  height: 4,
                  marginLeft: -2,
                  borderRadius: "50%",
                  background: "#fff",
                  opacity: active ? 1 : 0,
                  transition: "opacity .25s ease-out .1s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 58,
                  top: "50%",
                  transform: `translate(${hov ? 0 : -6}px,-50%)`,
                  opacity: hov ? 1 : 0,
                  transition: "opacity .18s ease-out,transform .18s ease-out",
                  pointerEvents: "none",
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "linear-gradient(150deg,rgba(14,26,20,.9),rgba(18,40,30,.84))",
                  backdropFilter: "blur(14px)",
                  color: "#eef4f0",
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 10px 22px -10px rgba(12,30,22,.7)",
                }}
              >
                {t(n.label)}
                {n.soon ? ` · ${t("Coming soon")}` : ""}
              </div>
              {n.soon && <div aria-hidden="true" style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#d9952a" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
