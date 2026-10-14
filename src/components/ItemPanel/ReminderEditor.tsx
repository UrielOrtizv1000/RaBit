/**
 * Evento: tarjeta «RaBit Reminder» (activar, cuánto antes, unidad, frecuencia y vista previa del mensaje).
 */
import type { Dispatch, SetStateAction } from "react";
import type { Remind } from "../../domain/types";
import { t } from "../../i18n";
import { MONO, unitSpan } from "./eventModel";
import { reset, silk, SPRING, Toggle } from "./ui";

interface Props {
  rem: Remind;
  setRem: Dispatch<SetStateAction<Remind>>;
  remOn: boolean;
  setRemOn: (v: boolean) => void;
  remText: string;
  setRemText: (v: string) => void;
}

export function ReminderEditor({ rem, setRem, remOn, setRemOn, remText, setRemText }: Props) {
  const n = rem.n,
    u = rem.unit;
  const prevSub = (() => {
    if (rem.freq !== "daily") return t("RaBit reminds you once, {span} before.", { span: unitSpan(n, u) });
    if (u === "hours") return t("RaBit reminds you every hour for the last {n} hours.", { n });
    const seq: number[] = [];
    for (let k = n; k >= 2; k--) seq.push(k);
    return seq.length ? t("RaBit reminds you every day: {list}, tomorrow and today.", { list: seq.join(", ") }) : t("RaBit reminds you every day: tomorrow and today.");
  })();
  const green = "#3ddc84",
    dim = "#a9c6b8";
  return (
    <div
      style={{
        borderRadius: 24,
        overflow: "hidden",
        background: "linear-gradient(150deg,rgba(12,24,18,.92),rgba(16,40,29,.86))",
        border: "1px solid rgba(255,255,255,.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 24px 44px -26px rgba(10,30,20,.7)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(61,220,132,.12)" }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, background: green, boxShadow: "0 0 8px rgba(61,220,132,.8)", animation: "rb-pulse 2s infinite" }} />
        <div style={{ ...silk(10, ".14em", "#6ee6a4"), flex: 1 }}>{t("RABIT REMINDER")}</div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: dim }}>{remOn ? t("On") : t("Off")}</span>
        <Toggle on={remOn} onChange={setRemOn} label={t("Reminder")} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 16,
          padding: "14px 18px 18px",
          opacity: remOn ? 1 : 0.4,
          pointerEvents: remOn ? "auto" : "none",
          transition: "opacity .35s ease",
        }}
        aria-disabled={!remOn}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <label htmlFor="ip-rem-n" style={{ fontFamily: MONO, fontSize: 12, color: dim }}>
            {t("Remind me")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="ip-rem-n"
              inputMode="numeric"
              maxLength={2}
              value={remText}
              onChange={(e) => {
                const t = e.target.value.replace(/\D/g, "");
                setRemText(t);
                const v = parseInt(t, 10);
                if (v >= 1) setRem((r) => ({ ...r, n: Math.min(30, v) }));
              }}
              onBlur={() => setRemText(String(rem.n))}
              style={{
                width: 60,
                flex: "none",
                boxSizing: "border-box",
                padding: "9px 6px",
                borderRadius: 12,
                border: "1px solid rgba(61,220,132,.25)",
                background: "rgba(61,220,132,.06)",
                fontFamily: "Silkscreen,monospace",
                fontSize: 13,
                color: green,
                textAlign: "center",
              }}
            />
            <div
              role="radiogroup"
              aria-label={t("Reminder unit")}
              style={{ flex: 1, display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(61,220,132,.18)" }}
            >
              {(
                [
                  ["days", t("days before")],
                  ["hours", t("hours before")],
                ] as const
              ).map(([k, l]) => {
                const on = rem.unit === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRem((r) => ({ ...r, unit: k }))}
                    style={{
                      ...reset,
                      flex: 1,
                      textAlign: "center",
                      padding: "7px 0",
                      borderRadius: 9,
                      fontSize: 12,
                      fontWeight: 600,
                      color: on ? "#06150e" : dim,
                      background: on ? green : "transparent",
                      transition: "background .3s ease,color .3s ease",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: dim, marginTop: 4 }} id="ip-rem-freq">
            {t("Reminder frequency")}
          </div>
          <div role="radiogroup" aria-labelledby="ip-rem-freq" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(
              [
                ["once", t("Once — {span} before", { span: unitSpan(n, u) })],
                ["daily", u === "days" ? t("Every day until event") : t("Every hour until event")],
              ] as const
            ).map(([k, l]) => {
              const on = rem.freq === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRem((r) => ({ ...r, freq: k }))}
                  style={{
                    ...reset,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: on ? "rgba(61,220,132,.12)" : "rgba(255,255,255,.03)",
                    border: `1px solid ${on ? "rgba(61,220,132,.4)" : "rgba(255,255,255,.08)"}`,
                    transition: "background .35s ease,border-color .35s ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 14,
                      height: 14,
                      flex: "none",
                      boxSizing: "border-box",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      border: `1.5px solid ${on ? green : "rgba(255,255,255,.4)"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: green,
                        boxShadow: "0 0 8px rgba(61,220,132,.8)",
                        transform: `scale(${on ? 1 : 0})`,
                        transition: `transform .45s ${SPRING}`,
                      }}
                    />
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? "#eef7f2" : dim, transition: "color .3s ease" }}>{l}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-label={t("Reminder preview")}
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(0,0,0,.25)",
            boxShadow: "inset 0 0 0 1px rgba(61,220,132,.1)",
          }}
        >
          <div style={silk(9, ".14em", "#6ee6a4")}>{t("PREVIEW")}</div>
          <div style={{ ...silk(10.5, "0", "#6ee6a4"), marginTop: 10 }}>&gt; {t("HEY!")}</div>
          <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 21, lineHeight: 1.2, color: green, textShadow: "0 0 10px rgba(61,220,132,.5)", marginTop: 6 }}>
            {t("Your event is").toUpperCase()}
            <br />
            {t("In {span}", { span: unitSpan(n, u) }).toUpperCase()}
            <span
              aria-hidden="true"
              style={{ display: "inline-block", width: 8, height: 16, marginLeft: 6, verticalAlign: -2, background: green, animation: "rb-cursor 1.1s steps(1) infinite" }}
            />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.55, color: dim, marginTop: "auto", paddingTop: 12 }}>{prevSub}</div>
        </div>
      </div>
    </div>
  );
}
