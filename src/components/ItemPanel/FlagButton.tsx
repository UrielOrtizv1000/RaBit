/**
 * Evento: casilla grande con etiqueta (Importante, Todo el día, Recurrente).
 */
import { EASE, fieldCard, greenGrad, Ico, reset } from "./ui";

export function FlagButton({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      style={{
        ...reset,
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "13px 16px",
        borderRadius: 16,
        background: on ? "rgba(215,244,229,.95)" : "rgba(255,255,255,.85)",
        boxShadow: on ? "inset 0 0 0 1.5px rgba(23,184,102,.45)" : fieldCard.boxShadow,
        transition: `background .35s ${EASE},box-shadow .35s ease`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          flex: "none",
          boxSizing: "border-box",
          borderRadius: 6,
          display: "grid",
          placeItems: "center",
          border: `1.6px solid ${on ? "transparent" : "rgba(18,38,30,.3)"}`,
          background: on ? greenGrad : "#fff",
          transition: "background .3s ease,border-color .3s ease",
        }}
      >
        {on && Ico.check(10, 2.4)}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1d2a24" }}>{label}</span>
    </button>
  );
}
