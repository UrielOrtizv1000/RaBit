/** «¿Cuánto puedo ahorrar?»: proyecta un monto periódico y muestra cuánto cubriría de cada frasco pendiente. */
import { useState, type CSSProperties } from "react";
import { coverGoals, monthIndex, monthLabel, money, parseAmount, weekIndex, weekLabel } from "../../domain/savings";
import { t, tn } from "../../i18n";
import { silk } from "../../components/ui/glass";
import { SIDE_CARD } from "../../components/ui/cardStyles";
import { Seg } from "./modalParts";

export interface CalcResult {
  total: number;
  freq: "week" | "month";
  n: number;
  per: number;
}

export function Calculator({ pending, now, onJar }: { pending: { name: string; color: string; left: number }[]; now: number; onJar: (r: CalcResult) => void }) {
  const [per, setPer] = useState("500");
  const [freq, setFreq] = useState<"week" | "month">("week");
  const [nIn, setNIn] = useState<number | null>(null);

  const p = Math.max(0, parseAmount(per) ?? 0);
  const max = freq === "week" ? 52 : 24;
  const n = Math.min(max, nIn ?? (freq === "week" ? 12 : 6));
  const total = p * n;
  const end = freq === "week" ? weekLabel(weekIndex(now) + n) : monthLabel(monthIndex(now) + n);
  const covers = coverGoals(pending, total);

  return (
    <div
      data-tour="calculator"
      style={{ ...SIDE_CARD, gridColumn: 2, gridRow: 2, boxSizing: "border-box", display: "flex", flexDirection: "column", padding: 22, borderRadius: 28 }}
    >
      <div style={silk(10, { letterSpacing: ".16em", color: "var(--rb-faint)", marginBottom: 6 })}>{t("WHAT CAN I SAVE?")}</div>
      <div style={{ fontSize: 13, color: "var(--rb-muted)", marginBottom: 16 }}>{t("Tell RaBit what you can put away.")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 16px", borderRadius: 18, background: "rgba(18,38,30,.05)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--rb-faint)" }}>$</div>
        <input
          aria-label={t("Amount per period")}
          value={per}
          inputMode="decimal"
          onChange={(e) => setPer(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            background: "transparent",
            fontFamily: "inherit",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.02em",
            color: "var(--rb-ink)",
            padding: "10px 0",
          }}
        />
        <div style={silk(9, { letterSpacing: ".1em", color: "#6b7a73" })}>{freq === "week" ? t("/ WEEK") : t("/ MONTH")}</div>
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        <Seg<"week" | "month">
          value={freq}
          opts={[
            ["week", t("Weekly")],
            ["month", t("Monthly")],
          ]}
          onPick={(f) => {
            setFreq(f);
            setNIn(null);
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 0 8px" }}>
        <div style={{ fontSize: 12, color: "var(--rb-faint)" }}>{t("For")}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#121a16" }}>{freq === "week" ? tn(n, "week", "weeks") : tn(n, "month", "months")}</div>
      </div>
      <input
        type="range"
        className="rb-range"
        aria-label={t("For")}
        min={1}
        max={max}
        value={n}
        onChange={(e) => setNIn(+e.target.value)}
        style={{ "--pct": `${((n - 1) / Math.max(1, max - 1)) * 100}%` } as CSSProperties}
      />
      <style>{`.rb-range{-webkit-appearance:none;appearance:none;width:100%;height:22px;margin:0;background:transparent;cursor:pointer}.rb-range:focus{outline:none}.rb-range::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#17b866 var(--pct),rgba(18,38,30,.12) var(--pct))}.rb-range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;margin-top:-7px;border-radius:50%;background:#fff;border:2px solid #17b866;box-shadow:0 3px 8px -2px rgba(20,48,34,.45);transition:transform .2s ease}.rb-range:hover::-webkit-slider-thumb,.rb-range:focus-visible::-webkit-slider-thumb{transform:scale(1.12)}.rb-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(23,184,102,.25),0 3px 8px -2px rgba(20,48,34,.45)}`}</style>
      <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 20, background: "linear-gradient(150deg,rgba(23,184,102,.14),rgba(23,184,102,.06))" }}>
        <div style={{ fontSize: 12, color: "var(--rb-green-deep)" }}>{t("By {date} you'd have", { date: end })}</div>
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 34, lineHeight: 1.1, color: "#0b5e37", marginTop: 4 }}>{money(total)}</div>
      </div>
      {covers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
          {covers.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
              <div style={{ flex: 1, minWidth: 0, color: "var(--rb-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ fontWeight: 700, color: c.pct >= 100 ? "#0b7a45" : "#41504a" }}>{c.pct >= 100 ? t("Covered") : `${Math.round(c.pct)}%`}</div>
            </div>
          ))}
        </div>
      )}
      <div aria-hidden="true" style={{ flex: 1, minHeight: 16 }} />
      <button
        type="button"
        className="rb-hover-bg"
        disabled={!(total > 0)}
        onClick={() => onJar({ total, freq, n, per: p })}
        style={{
          width: "100%",
          padding: 12,
          border: 0,
          borderRadius: 999,
          cursor: total > 0 ? "pointer" : "default",
          opacity: total > 0 ? 1 : 0.5,
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--rb-green-deep)",
          background: "rgba(23,184,102,.1)",
        }}
      >
        {t("Turn this into a jar")}
      </button>
    </div>
  );
}
