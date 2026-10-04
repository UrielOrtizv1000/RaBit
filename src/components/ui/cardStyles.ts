/**
 * Estilos "cristal" compartidos por las tarjetas de todas las páginas.
 * Viven aquí (y no en cada feature) para que Calendar, Routine, Savings… se vean idénticas
 * y un cambio de diseño se haga en un solo lugar.
 */
import type { CSSProperties } from "react";

export const GLASS_CARD: CSSProperties = {
  borderRadius: 28,
  animation: "rb-rise .45s ease-out .06s both",
  background: "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
  backdropFilter: "blur(24px) saturate(170%)",
  WebkitBackdropFilter: "blur(24px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.8)",
  boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.3)",
};

export const SIDE_CARD: CSSProperties = {
  animation: "rb-rise .45s ease-out .18s both",
  borderRadius: 28,
  background: "linear-gradient(150deg,rgba(255,255,255,.8),rgba(240,250,245,.46))",
  backdropFilter: "blur(24px) saturate(170%)",
  WebkitBackdropFilter: "blur(24px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.85)",
  boxShadow: "inset 0 1px 1px #fff,inset 0 -12px 26px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.34)",
};

export const PILL_GROUP: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  padding: 4,
  borderRadius: 999,
  background: "linear-gradient(145deg,rgba(255,255,255,.75),rgba(255,255,255,.42))",
  border: "1px solid rgba(255,255,255,.85)",
  boxShadow: "inset 0 1px 1px #fff,0 10px 22px -16px rgba(20,48,34,.4)",
};

export const PRIMARY_BTN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "10px 16px",
  borderRadius: 999,
  background: "linear-gradient(150deg,#1fc172,#0f9a56)",
  color: "#fff",
  fontFamily: "Silkscreen,monospace",
  fontSize: 10,
  letterSpacing: ".05em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  border: "none",
  boxShadow: "0 14px 26px -16px rgba(23,184,102,1)",
};

export const SILK_LABEL: CSSProperties = {
  fontFamily: "Silkscreen,monospace",
  fontSize: 10,
  letterSpacing: ".16em",
  color: "#6b7a73",
};
