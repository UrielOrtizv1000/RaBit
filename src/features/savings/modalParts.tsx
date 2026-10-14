/**
 * Ventanas de Savings: piezas compartidas (fondo desenfocado en portal, selector segmentado y estilos de las ventanas).
 */
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { fmtDay, fromISO } from "../../domain/dates";

export const fmtDeadline = (iso: string): string => (iso ? `${fmtDay(iso)}, ${fromISO(iso).getFullYear()}` : "");
export const ease = "cubic-bezier(.22,1,.36,1)";
export const box: CSSProperties = {
  width: 460,
  padding: 26,
  boxSizing: "border-box",
  borderRadius: 30,
  background: "linear-gradient(150deg,#ffffff,#f5faf7)",
  border: "1px solid #fff",
  boxShadow: "0 40px 80px -30px rgba(12,40,26,.5)",
  animation: `rb-rise .4s ${ease} both`,
};
export const field: CSSProperties = { border: 0, outline: 0, background: "transparent", fontFamily: "inherit", color: "var(--rb-ink)" };
export const cancelBtn: CSSProperties = {
  padding: "13px 20px",
  border: 0,
  borderRadius: 999,
  cursor: "pointer",
  background: "transparent",
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--rb-muted)",
};

/**
 * Fondo desenfocado + ventana. Se monta con un portal en la capa raíz de la app (`#rb-overlay`, igual que Ajustes)
 * para que el desenfoque cubra TODA la ventana y no solo el área de la página (que además está escalada).
 */
export function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const host = typeof document === "undefined" ? null : document.getElementById("rb-overlay");
  const view = (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        boxSizing: "border-box",
        padding: "10px 26px 42px",
        display: "grid",
        placeItems: "center",
        background: "rgba(16,32,25,.3)",
        backdropFilter: "blur(6px)",
        animation: "rb-toast .3s ease both",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} role="dialog">
        {children}
      </div>
    </div>
  );
  return createPortal(view, host ?? document.body);
}

/** Selector segmentado (Semanal/Mensual, Depositar/Retirar…). */
export function Seg<T extends string>({ value, opts, onPick, danger }: { value: T; opts: [T, string][]; onPick: (v: T) => void; danger?: T }) {
  return (
    <div style={{ display: "flex", flex: 1, gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
      {opts.map(([id, label]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(id)}
            style={{
              flex: 1,
              padding: "9px 10px",
              border: 0,
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: on ? (id === danger ? "#a8443a" : "#0b7a45") : "#5d6f67",
              background: on ? "#fff" : "transparent",
              boxShadow: on ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
              transition: `background .35s ${ease},color .3s ease,box-shadow .35s ease`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
