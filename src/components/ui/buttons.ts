/**
 * Estilos de botón compartidos (antes copiados en el actualizador, el tutorial y Ajustes).
 * Usan los colores de marca de `styles/global.css` (variables `--rb-*`).
 */
import type { CSSProperties } from "react";

export const GREEN_GRAD = "var(--rb-green-grad)";

const pill: CSSProperties = { border: 0, borderRadius: 999, cursor: "pointer", fontFamily: "inherit" };

/** Acción principal (verde): «Update», «Restart to update», «Retry». */
export const primaryButton: CSSProperties = {
  ...pill,
  padding: "11px 20px",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: GREEN_GRAD,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 14px 26px -14px rgba(23,184,102,1)",
};

/** Acción secundaria sin fondo: «Later». */
export const secondaryButton: CSSProperties = {
  ...pill,
  padding: "11px 18px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--rb-muted)",
  background: "transparent",
};

/** Píldora blanca pequeña de Ajustes (Export, Import, Show, Load…). */
export const pillButton: CSSProperties = {
  ...pill,
  padding: "8px 14px",
  background: "#fff",
  boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--rb-green-deep)",
};

/** Base de los botones de la tarjeta del tutorial (Skip, Back, Next). */
export const tourButton: CSSProperties = {
  ...pill,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 14px",
  flex: "none",
  whiteSpace: "nowrap",
};
