/**
 * Barra de título propia (la ventana de Tauri va sin decoraciones). Zona arrastrable + minimizar/maximizar/cerrar.
 * En el navegador (dev/e2e) los botones no hacen nada.
 */
import type { CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "../i18n";

const isTauri = "__TAURI_INTERNALS__" in window;

const btn: CSSProperties = {
  width: 40,
  height: 32,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "#5d6f67",
};

/** Barra de título propia (la ventana nativa va sin decoraciones). */
export function TitleBar() {
  const w = isTauri ? getCurrentWindow() : null;
  return (
    <div
      data-tauri-drag-region
      style={{
        height: 32,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 14,
        background: "rgba(233,238,235,var(--glass-a))",
        userSelect: "none",
      }}
    >
      <div data-tauri-drag-region style={{ fontFamily: "Silkscreen,monospace", fontSize: 9, letterSpacing: ".16em", color: "#6b7a73" }}>
        RABIT
      </div>
      <div style={{ display: "flex" }}>
        <button aria-label={t("Minimize")} style={btn} onClick={() => void w?.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 5h8" />
          </svg>
        </button>
        <button aria-label={t("Maximize")} style={btn} onClick={() => void w?.toggleMaximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1.5" y="1.5" width="7" height="7" />
          </svg>
        </button>
        <button aria-label={t("Close")} style={btn} onClick={() => void w?.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
