import type { ReactNode } from "react";
import { SILK_LABEL } from "./cardStyles";

/**
 * Encabezado común de todas las páginas: título en negrita + fecha (+ subtítulo) a la izquierda y acciones a la derecha.
 * Altura fija (44 px) para que las tarjetas de cualquier página arranquen a la misma altura.
 */
export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title?: string; subtitle?: string; children?: ReactNode }): JSX.Element {
  return (
    <div data-rise="0" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, height: 44, flex: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, minWidth: 0, whiteSpace: "nowrap" }}>
        {title ? <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "#121a16" }}>{title}</div> : null}
        <div style={{ ...SILK_LABEL, letterSpacing: ".16em" }}>{eyebrow}</div>
        {subtitle ? <div style={{ fontSize: 12.5, color: "#5d6f67", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{children}</div>
    </div>
  );
}
