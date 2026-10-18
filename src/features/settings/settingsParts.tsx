/**
 * Piezas compartidas de Ajustes: la lista de módulos, el estilo de fila, la etiqueta de sección, el interruptor y el selector segmentado.
 */
import type { CSSProperties, ReactNode } from "react";
import { NAV } from "../../app/nav";
import type { Modules } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { t } from "../../i18n";

export const MODS: { id: keyof Modules; desc: string; soon?: boolean; beta?: boolean }[] = [
  { id: "calendar", desc: "Events, tasks and RaBit reminders." },
  { id: "routine", desc: "Your recurring week, wake-up and bedtime.", beta: true },
  { id: "notes", desc: "Fast notes you can turn into tasks." },
  { id: "savings", desc: "Set goals and track what you save." },
];
export const navOf = (id: string) => NAV.find((n) => n.id === id) ?? NAV[0];

export const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,.7)",
  boxShadow: "inset 0 1px 1px #fff",
};
export const label = (text: string, mt = 18): ReactNode => <div style={{ ...silk(9.5, { letterSpacing: ".16em", color: "#6b7a73" }), margin: `${mt}px 0 8px` }}>{t(text)}</div>;

export function Switch({ on, onClick, label: aria, disabled = false }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={aria}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      style={{
        width: 42,
        height: 24,
        flex: "none",
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        borderRadius: 12,
        padding: 3,
        background: on ? "var(--rb-green)" : "#c7d0cc",
        transition: "background .2s ease-out",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(12,40,26,.3)",
          transform: `translateX(${on ? 18 : 0}px)`,
          transition: "transform .2s ease-out",
        }}
      />
    </button>
  );
}

export function Seg<T extends string | number>({ value, opts, onPick }: { value: T; opts: { id: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
      {opts.map((o) => {
        const a = o.id === value;
        return (
          <button
            key={String(o.id)}
            onClick={() => onPick(o.id)}
            aria-pressed={a}
            style={{
              padding: "7px 12px",
              border: 0,
              borderRadius: 999,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              color: a ? "var(--rb-ink)" : "var(--rb-muted)",
              background: a ? "#fff" : "transparent",
              boxShadow: a ? "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)" : "none",
              transition: "background .2s ease-out",
            }}
          >
            {t(o.label)}
          </button>
        );
      })}
    </div>
  );
}
