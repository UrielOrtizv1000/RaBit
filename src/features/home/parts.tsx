/**
 * Inicio: estilos compartidos del diseño y piezas pequeñas (div con hover, íconos +/›).
 */
import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { SwipeProps } from "../../lib/swipe";
import { silk } from "../../components/ui/glass";

export const EASE = "cubic-bezier(.22,1,.36,1)";

/** Recorta un título largo para mostrarlo en espacios reducidos. */
export const clip = (t: string, n: number): string => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

export const label10: CSSProperties = silk(12, { letterSpacing: ".14em", color: "var(--rb-faint)" });
export const cardBase: CSSProperties = {
  position: "relative",
  padding: "24px 24px 18px",
  borderRadius: 30,
  background: "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
  backdropFilter: "blur(24px) saturate(170%)",
  WebkitBackdropFilter: "blur(24px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.8)",
  boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.3)",
  transition: "transform .25s ease-out,box-shadow .25s ease-out",
};
export const cardHover: CSSProperties = { transform: "translateY(-2px)", boxShadow: "inset 0 1px 1px #fff,0 30px 54px -28px rgba(20,48,34,.36)" };
export const glassBtn: CSSProperties = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 999,
  background: "linear-gradient(145deg,rgba(255,255,255,.8),rgba(255,255,255,.46))",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,.9)",
  boxShadow: "inset 0 1px 1px #fff,0 12px 24px -18px rgba(20,48,34,.5)",
  color: "#1d2a24",
  fontSize: 13,
  fontWeight: 600,
  transition: "transform .15s ease-out",
};
export const circleBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  background: "rgba(255,255,255,.75)",
  boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
  transition: "transform .15s ease-out",
};

export interface HvProps {
  style: CSSProperties;
  hover?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  title?: string;
  children?: ReactNode;
  tid?: string;
  swipe?: SwipeProps;
}
/** div con estilo de hover (el diseño usa style-hover). */
export function Hv({ style, hover, onClick, title, children, tid, swipe }: HvProps) {
  const [on, setOn] = useState(false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLDivElement>);
    }
  };
  return (
    <div
      data-tid={tid}
      title={title}
      {...swipe}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? onKey : undefined}
      onClick={onClick}
      onMouseEnter={() => {
        if (!document.documentElement.dataset.swiping) setOn(true);
      }}
      onMouseLeave={() => {
        if (!document.documentElement.dataset.swiping) setOn(false);
      }}
      style={on && hover ? { ...style, ...hover } : style}
    >
      {children}
    </div>
  );
}

export const Plus = ({ color, size = 12, style }: { color: string; size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" style={style}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);
export const Chevron = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3l5 5-5 5" />
  </svg>
);
export const colorOf = (c: string) => (c ? c : "#17b866");
