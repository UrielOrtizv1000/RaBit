/**
 * Estilos de píldoras «cristal» (claro y oscuro) y helper de tipografía Silkscreen, copiados de los diseños .dc.html.
 */
import type { CSSProperties } from "react";

/** Estilos "glass" copiados tal cual de los diseños .dc.html. */
export const glassPill: CSSProperties = {
  background: "linear-gradient(145deg,rgba(255,255,255,.75),rgba(255,255,255,.42))",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,.85)",
  boxShadow: "inset 0 1px 1px #fff,0 10px 22px -16px rgba(20,48,34,.45)",
};

export const darkPill: CSSProperties = {
  background: "linear-gradient(150deg,rgba(14,26,20,.9),rgba(18,40,30,.82))",
  border: "1px solid rgba(255,255,255,.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.14),0 12px 24px -14px rgba(10,30,20,.8)",
};

export const silk = (size: number, extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "Silkscreen,monospace",
  fontSize: size,
  ...extra,
});
