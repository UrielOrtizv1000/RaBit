/**
 * Piezas de interfaz reutilizables del panel (segmentos, píldoras, casillas, iconos) y el hook `useAutosave`
 * (guardado con retardo + volcado al desmontar para no perder lo escrito).
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export const INK = "#121a16";
export const GREEN = "#0b7a45";
export const RED = "#a8443a";
export const MUTED = "#5d6f67";
export const FAINT = "#65746d"; // AA-safe replacement for the design's #8b9a93 text
export const EASE = "cubic-bezier(.22,1,.36,1)";
export const SPRING = "cubic-bezier(.34,1.56,.64,1)";

export const silk = (size: number, ls = ".16em", color = "#6b7a73"): CSSProperties => ({ fontFamily: "Silkscreen,monospace", fontSize: size, letterSpacing: ls, color });
export const fieldCard: CSSProperties = { background: "rgba(255,255,255,.85)", borderRadius: 16, boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.3)" };
export const popCard: CSSProperties = {
  background: "linear-gradient(150deg,rgba(255,255,255,.97),rgba(245,250,247,.94))",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,.95)",
  boxShadow: "inset 0 1px 1px #fff,0 30px 60px -24px rgba(12,40,26,.5)",
};
export const greenGrad = "linear-gradient(150deg,#1fc172,#0f9a56)";
export const reset: CSSProperties = { border: 0, background: "transparent", padding: 0, margin: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "inherit" };

/** Small hover/focus classes (inline styles cannot express :hover). Rendered once per panel. */
export function PanelStyles() {
  return (
    <style>{`
.ip-h-white:hover{background:rgba(255,255,255,.75)!important}
.ip-h-ghost:hover{background:rgba(18,38,30,.06)!important}
.ip-h-ghost2:hover{background:rgba(18,38,30,.09)!important}
.ip-h-red:hover{background:rgba(192,74,66,.1)!important}
.ip-h-red2:hover{background:rgba(192,74,66,.14)!important}
.ip-h-green:hover{background:rgba(23,184,102,.18)!important;color:#0b7a45!important}
.ip-h-scale:hover{transform:scale(1.05)}
.ip-h-scale4:hover{transform:scale(1.04)}
.ip-h-day:hover{background:rgba(255,255,255,.95)!important;transform:scale(1.08)}
.ip-h-dash:hover{border-color:rgba(23,184,102,.45)!important;color:#0b7a45!important}
.ip-bare:focus-visible{outline:2px solid rgba(23,184,102,.6);outline-offset:6px;border-radius:10px}
.ip-focus-within:focus-within{box-shadow:inset 0 0 0 1.5px rgba(23,184,102,.55),0 6px 14px -10px rgba(20,48,34,.35)!important}
.ip-focus-within input:focus-visible{outline:none}
@media (prefers-reduced-motion:reduce){.ip-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.ip-select-btn:focus-visible{outline-offset:-2px;border-radius:14px}
`}</style>
  );
}

export const Ico = {
  plus: (s = 11, w = 2.4) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  search: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#6b7a73" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="7" r="4.6" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  ),
  cal: (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3.6h8a2.4 2.4 0 0 1 2.4 2.4v7a2.4 2.4 0 0 1-2.4 2.4H5a2.4 2.4 0 0 1-2.4-2.4V6A2.4 2.4 0 0 1 5 3.6ZM2.6 7.2h12.8M6 2.2v2.6M12 2.2v2.6" />
    </svg>
  ),
  check: (s = 11, w = 2.2) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.4 6.2 4.8 8.6 9.6 3.6" />
    </svg>
  ),
  pin: (c: string) => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill={c} aria-hidden="true">
      <path d="M9.5 1.5 14.5 6.5 12 7.5 9 10.5 9.5 13.5 8 15 5.5 12.5 2 16 0 16 0 14 3.5 10.5 1 8 2.5 6.5 5.5 7 8.5 4Z" />
    </svg>
  ),
  trash: (c = RED) => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
    </svg>
  ),
  edit: (c = "currentColor") => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5Z" />
    </svg>
  ),
  chev: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  ),
};

export function CheckBox({
  on,
  size,
  radius,
  label,
  onToggle,
  border = "rgba(18,38,30,.22)",
  off = "rgba(255,255,255,.85)",
  disabled,
}: {
  on: boolean;
  size: number;
  radius: number;
  label: string;
  onToggle: () => void;
  border?: string;
  off?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        ...reset,
        width: size,
        height: size,
        flex: "none",
        boxSizing: "border-box",
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        border: `1.7px solid ${on ? "transparent" : border}`,
        background: on ? greenGrad : off,
        transition: "background .25s ease,border-color .25s ease",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {on && <span style={{ display: "grid", animation: "rb-tick .3s ease-out both" }}>{Ico.check(size > 22 ? 14 : size > 19 ? 11 : 10, size > 22 ? 2.2 : 2.4)}</span>}
    </button>
  );
}

/** Segmented control with a sliding thumb. */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  font,
  pad = "7px 12px",
  size = 12,
  redId,
  role = "radiogroup",
  stretch = true,
  disabled,
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  font?: CSSProperties;
  pad?: string;
  size?: number;
  redId?: T;
  role?: "radiogroup" | "tablist";
  stretch?: boolean;
  disabled?: boolean;
}) {
  const n = options.length;
  const idx = Math.max(
    0,
    options.findIndex(([id]) => id === value),
  );
  const has = value !== null && options.some(([id]) => id === value);
  const itemRole = role === "tablist" ? "tab" : "radio";
  return (
    <div
      role={role}
      aria-label={label}
      style={{
        position: "relative",
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "1fr",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(18,38,30,.05)",
        width: stretch ? undefined : "max-content",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: 3,
          width: `calc((100% - 6px - ${(n - 1) * 2}px) / ${n})`,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
          transform: `translateX(calc(${idx} * (100% + 2px)))`,
          opacity: has ? 1 : 0,
          transition: `transform .45s ${EASE},opacity .3s ease`,
        }}
      />
      {options.map(([id, text]) => {
        const on = has && id === value;
        return (
          <button
            key={id}
            type="button"
            role={itemRole}
            aria-checked={role === "radiogroup" ? on : undefined}
            aria-selected={role === "tablist" ? on : undefined}
            disabled={disabled}
            onClick={() => onChange(id)}
            style={{
              ...reset,
              position: "relative",
              textAlign: "center",
              padding: pad,
              borderRadius: 999,
              fontSize: size,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: on ? (id === redId ? RED : GREEN) : MUTED,
              transition: "color .3s ease",
              cursor: disabled ? "default" : "pointer",
              ...font,
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        ...reset,
        width: 42,
        height: 24,
        flex: "none",
        borderRadius: 12,
        padding: 3,
        boxSizing: "border-box",
        background: on ? greenGrad : "rgba(18,38,30,.22)",
        transition: "background .3s ease",
      }}
    >
      <span
        style={{
          display: "block",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(12,40,26,.3)",
          transform: `translateX(${on ? 18 : 0}px)`,
          transition: `transform .4s ${SPRING}`,
        }}
      />
    </button>
  );
}

export function Pill({
  children,
  onClick,
  style,
  className,
  title,
  ariaLabel,
  pressed,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  style?: CSSProperties;
  className?: string;
  title?: string;
  ariaLabel?: string;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      style={{
        ...reset,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        transition: `background .25s ease,transform .3s ${EASE},color .25s ease,opacity .25s ease`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Keeps latest value in a ref so timers never see stale closures. */
export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

export type SaveStatus = "idle" | "saving" | "saved";

/** Debounced autosave: call the returned schedule() after each edit; flushes on unmount. */
export function useAutosave(save: () => Promise<void>, onStatus: (s: SaveStatus) => void, ms = 400): () => void {
  const saveRef = useLatest(save);
  const statusRef = useLatest(onStatus);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const run = useRef(() => {
    dirty.current = false;
    statusRef.current("saving");
    chain.current = chain.current
      .then(() => saveRef.current())
      .then(
        () => statusRef.current("saved"),
        () => statusRef.current("idle"),
      );
  });
  const schedule = useRef(() => {
    dirty.current = true;
    window.clearTimeout(timer.current);
    statusRef.current("saving");
    timer.current = window.setTimeout(() => run.current(), ms);
  });
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (dirty.current) run.current();
    },
    [],
  );
  return schedule.current;
}
