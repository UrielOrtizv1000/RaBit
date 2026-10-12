/**
 * Selector de fecha propio (mismo aspecto que el calendario). Respeta el primer día de la semana de Ajustes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, daysInMonth, fmtDay, fromISO, MONTHS, startOfWeek, WEEKDAYS, toISO, todayISO } from "../../domain/dates";
import { t } from "../../i18n";
import type { ISODate } from "../../domain/types";
import { useData } from "../../store/data";
import { EASE, GREEN, FAINT, Ico, INK, SPRING, fieldCard, greenGrad, popCard, reset, silk } from "./ui";

interface Props {
  value: ISODate;
  onChange: (d: ISODate) => void;
  /** dates with something scheduled (dot under the day) */
  busy?: ReadonlySet<ISODate>;
  variant: "chip" | "field";
  disabled?: boolean;
}

const dowInitials = (monFirst: boolean): string[] => (monFirst ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]).map((i) => WEEKDAYS[i].charAt(0).toUpperCase());

export function DateField({ value, onChange, busy, variant, disabled }: Props) {
  const weekStart = useData((s) => s.settings.weekStart);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ISODate>(value);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const today = todayISO();

  useEffect(() => {
    if (open) {
      setView(value);
      window.setTimeout(() => popRef.current?.querySelector<HTMLButtonElement>("button[data-sel='1']")?.focus(), 30);
    }
  }, [open, value]);

  const cells = useMemo(() => {
    const d = fromISO(view);
    const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
    const start = startOfWeek(first, weekStart);
    const lead = Math.round((fromISO(first).getTime() - fromISO(start).getTime()) / 86_400_000);
    const rows = Math.ceil((lead + daysInMonth(d.getFullYear(), d.getMonth())) / 7);
    return Array.from({ length: rows * 7 }, (_, k) => addDays(start, k));
  }, [view, weekStart]);

  const vd = fromISO(view);
  const shift = (n: number) => {
    const d = new Date(vd.getFullYear(), vd.getMonth() + n, 1);
    setView(toISO(d));
  };
  const pick = (d: ISODate) => {
    onChange(d);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const label = value ? `${fmtDay(value)}, ${fromISO(value).getFullYear()}` : t("Pick a date");

  const trigger =
    variant === "chip"
      ? ({
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 999,
          background: "rgba(18,38,30,.05)",
          boxShadow: open ? "inset 0 0 0 1.5px rgba(23,184,102,.55)" : "none",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#41504a",
        } as const)
      : ({
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "12px 14px",
          width: "100%",
          ...fieldCard,
          boxShadow: open ? "inset 0 0 0 1.5px rgba(23,184,102,.55),0 6px 14px -10px rgba(20,48,34,.3)" : fieldCard.boxShadow,
          fontSize: 14,
          fontWeight: 600,
          color: INK,
        } as const);

  const navBtn = { ...reset, width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: "#5d6f67", fontSize: 15 } as const;

  return (
    <div
      style={{ position: "relative" }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("Date: {label}. Change date", { label })}
        onClick={() => setOpen((o) => !o)}
        style={{ ...reset, ...trigger, transition: "box-shadow .3s ease", cursor: disabled ? "default" : "pointer" }}
      >
        {Ico.cal}
        <span>{label}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 5 }} />
          <div
            ref={popRef}
            role="dialog"
            aria-label={t("Choose date")}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 6,
              width: 292,
              boxSizing: "border-box",
              padding: 16,
              borderRadius: 22,
              ...popCard,
              animation: `rb-in .32s ${EASE} both`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button type="button" aria-label={t("Previous month")} className="ip-h-ghost" style={navBtn} onClick={() => shift(-1)}>
                  ‹
                </button>
                <div aria-live="polite" style={{ ...silk(10, ".16em", INK), minWidth: 118, textAlign: "center" }}>
                  {MONTHS[vd.getMonth()].toUpperCase()} {vd.getFullYear()}
                </div>
                <button type="button" aria-label={t("Next month")} className="ip-h-ghost" style={navBtn} onClick={() => shift(1)}>
                  ›
                </button>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: FAINT }}>{value ? fmtDay(value).split(" ")[0] + " " + fromISO(value).getDate() : ""}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
              {dowInitials(weekStart === 1).map((w, i) => (
                <div key={i} aria-hidden="true" style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: FAINT, padding: "4px 0" }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {cells.map((c) => {
                const d = fromISO(c);
                const inM = d.getMonth() === vd.getMonth();
                const sel = c === value,
                  isT = c === today;
                return (
                  <button
                    key={c}
                    type="button"
                    data-sel={sel ? "1" : undefined}
                    aria-label={fmtDay(c)}
                    aria-pressed={sel}
                    onClick={() => pick(c)}
                    className={sel ? undefined : "ip-h-day"}
                    style={{
                      ...reset,
                      position: "relative",
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: sel || isT ? 700 : 500,
                      color: sel ? "#fff" : isT ? GREEN : !inM ? "#8e9b95" : c < today ? FAINT : "#1d2a24",
                      background: sel ? greenGrad : isT ? "rgba(23,184,102,.12)" : "transparent",
                      boxShadow: sel ? "0 8px 16px -8px rgba(23,184,102,.9)" : "none",
                      transition: `background .3s ${EASE},color .3s ease,transform .3s ${SPRING}`,
                    }}
                  >
                    {d.getDate()}
                    <span
                      aria-hidden="true"
                      style={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", background: busy?.has(c) ? (sel ? "#fff" : "#17b866") : "transparent" }}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(18,38,30,.07)" }}>
              <button
                type="button"
                className="ip-h-green"
                onClick={() => pick(today)}
                style={{
                  ...reset,
                  flex: 1,
                  textAlign: "center",
                  padding: "8px 0",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: GREEN,
                  background: "rgba(23,184,102,.1)",
                  transition: "background .25s ease",
                }}
              >
                {t("Today")}
              </button>
              <button
                type="button"
                className="ip-h-ghost2"
                onClick={() => pick(addDays(today, 1))}
                style={{
                  ...reset,
                  flex: 1,
                  textAlign: "center",
                  padding: "8px 0",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#41504a",
                  background: "rgba(18,38,30,.05)",
                  transition: "background .25s ease",
                }}
              >
                {t("Tomorrow")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
