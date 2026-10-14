/**
 * Routine: piezas visuales pequeñas compartidas (leyenda, regla de despertar/dormir, paso +/- y estilos de ventana).
 */
import { useState, type CSSProperties } from "react";
import { SILK } from "./model";

export const navBtn = { width: 30, height: 28, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--rb-body)", fontSize: 13 } as const;

export const modalBox: CSSProperties = {
  borderRadius: 28,
  background: "linear-gradient(150deg,rgba(255,255,255,.9),rgba(245,250,247,.78))",
  backdropFilter: "blur(30px) saturate(170%)",
  WebkitBackdropFilter: "blur(30px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.9)",
  boxShadow: "inset 0 1px 1px #fff,0 40px 90px -30px rgba(12,40,26,.55)",
  animation: "rb-fade .18s ease-out",
};
export const ghostBtn: CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: 11,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.9)",
  background: "linear-gradient(145deg,rgba(255,255,255,.85),rgba(255,255,255,.55))",
  boxShadow: "inset 0 1px 1px #fff,0 8px 18px -12px rgba(20,48,34,.35)",
  fontSize: 13,
  fontWeight: 600,
  color: "#2b3a34",
  cursor: "pointer",
};

export function Legend({ mark, text }: { mark: JSX.Element; text: string }): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {mark}
      <div style={{ fontSize: 11.5, color: "var(--rb-muted)" }}>{text}</div>
    </div>
  );
}

export function Rule({
  label,
  title,
  color,
  line,
  hover,
  padding,
  onClick,
}: {
  label: string;
  title: string;
  color: string;
  line: string;
  hover: string;
  padding: string;
  onClick: () => void;
}): JSX.Element {
  const [h, setH] = useState(false);
  const dash = `repeating-linear-gradient(90deg,${line} 0 5px,transparent 5px 10px)`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding }}>
      <div style={{ flex: 1, height: 1, background: dash }} />
      <div
        onClick={onClick}
        title={title}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: SILK,
          fontSize: 7.5,
          letterSpacing: ".12em",
          color,
          background: h ? hover : "transparent",
          transition: "background .2s ease-out",
        }}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3Z" />
        </svg>
      </div>
      <div style={{ flex: 1, height: 1, background: dash }} />
    </div>
  );
}

export function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }): JSX.Element {
  const btn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: "#fff",
    boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
    fontSize: 18,
    color: "#1d2a24",
    userSelect: "none",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderRadius: 20,
        background: "rgba(255,255,255,.7)",
        boxShadow: "inset 0 1px 1px #fff",
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--rb-muted)" }}>{label}</div>
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 32, lineHeight: 1.1, color: "var(--rb-ink)" }}>{value}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="rbc-scale" onClick={onMinus} style={btn}>
          −
        </div>
        <div className="rbc-scale" onClick={onPlus} style={btn}>
          +
        </div>
      </div>
    </div>
  );
}
