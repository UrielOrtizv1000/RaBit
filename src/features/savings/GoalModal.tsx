/**
 * Savings: ventana para crear o editar un frasco (nombre, monto, color, plan por fecha límite o por lo que puedes ahorrar).
 */
import { useEffect, useRef, useState } from "react";
import { evalGoalForm, JAR_COLORS, money, parseAmount, perOf, type GoalForm, type GoalMode } from "../../domain/savings";
import { t, tn } from "../../i18n";
import { silk } from "../../components/ui/glass";
import { maybeStartTour } from "../../components/tourState";
import { DateField } from "../../components/ItemPanel/DatePicker";
import { Ico } from "../../components/ItemPanel/ui";
import { box, cancelBtn, ease, field, fmtDeadline, Overlay, Seg } from "./modalParts";

export type GoalDraft = GoalForm & { err: string };

export function GoalModal({
  form,
  setForm,
  savedNow,
  now,
  onClose,
  onSave,
  onDelete,
}: {
  form: GoalDraft;
  setForm: (f: GoalDraft) => void;
  savedNow: number;
  now: number;
  onClose: () => void;
  onSave: () => void;
  onDelete: (() => void) | null;
}) {
  const res = evalGoalForm(form, savedNow, now);
  const set = (patch: Partial<GoalDraft>) => setForm({ ...form, ...patch, err: "" });
  const nameRef = useRef<HTMLInputElement>(null);
  const [sure, setSure] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => maybeStartTour("goal"), 600);
    return () => clearTimeout(h);
  }, []);
  useEffect(() => nameRef.current?.focus({ preventScroll: true }), []);
  const target = parseAmount(form.target);
  const hasPlan = form.mode !== "free";
  const u = form.freq === "week" ? "week" : "month";

  let resLabel = "";
  let resText = "—";
  if (form.mode === "free") {
    resLabel = t("No plan");
    resText = t("Add money whenever you want");
  } else if (form.mode === "date") {
    resLabel = t("You need to save");
    if (res.kind === "perPeriod") resText = t("{amt} per {unit} until {date}", { amt: money(res.perPeriod), unit: t(u), date: fmtDeadline(form.deadline) });
  } else {
    resLabel = t("You'll reach it");
    if (res.kind === "reach") resText = t("in {n} · {end}", { n: tn(res.periods, u, `${u}s`), end: res.endLabel });
  }
  const missingText = (): string => {
    const names = res.missing.map((m) => ({ name: t("a name"), amount: t("an amount"), date: t("a future date"), howMuch: t("how much you can save") })[m]);
    const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t("and")} ${names[names.length - 1]}` : names[0];
    return t("Add {things} to create the jar.", { things: joined });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={box}>
        <div style={silk(10, { letterSpacing: ".16em", color: "var(--rb-faint)", marginBottom: 6 })}>{form.id ? t("EDIT JAR") : t("NEW JAR")}</div>
        <input
          ref={nameRef}
          aria-label={t("Jar name")}
          value={form.name}
          maxLength={60}
          placeholder={t("What are you saving for?")}
          onChange={(e) => set({ name: e.target.value })}
          style={{
            ...field,
            width: "100%",
            boxSizing: "border-box",
            boxShadow: form.err && !form.name.trim() ? "inset 0 -2px 0 #e0902a" : "none",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.02em",
            padding: "4px 0 14px",
          }}
        />
        <div style={{ fontSize: 12, color: "var(--rb-faint)", marginBottom: 7 }}>{t("Goal amount")}</div>
        <input
          aria-label={t("Goal amount")}
          value={form.target}
          inputMode="decimal"
          placeholder={t("e.g. 10,000")}
          onChange={(e) => set({ target: e.target.value })}
          style={{
            ...field,
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 16px",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            background: "rgba(18,38,30,.05)",
            boxShadow: form.err && !(target && target > 0) ? "inset 0 0 0 1.5px #e0902a" : "none",
          }}
        />
        <div style={{ fontSize: 12, color: "var(--rb-faint)", margin: "16px 0 7px" }}>{t("How do you want to plan it?")}</div>
        <div data-tour="goal-modes" style={{ display: "flex" }}>
          <Seg<GoalMode>
            value={form.mode}
            opts={[
              ["free", t("Just a goal")],
              ["date", t("Deadline")],
              ["amount", t("What I can save")],
            ]}
            onPick={(mode) => set({ mode })}
          />
        </div>
        {hasPlan && (
          <div
            style={{
              position: "relative",
              zIndex: 30,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 12,
              marginTop: 12,
              animation: `rb-rise .35s ${ease} both`,
            }}
          >
            <div style={{ display: "flex" }}>
              <Seg<"week" | "month">
                value={form.freq}
                opts={[
                  ["week", t("Weekly")],
                  ["month", t("Monthly")],
                ]}
                onPick={(freq) => set({ freq })}
              />
            </div>
            {form.mode === "date" ? (
              <DateField variant="field" value={form.deadline} onChange={(deadline) => set({ deadline })} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 14px",
                  borderRadius: 999,
                  background: "rgba(18,38,30,.05)",
                  boxShadow: form.err && res.missing.includes("howMuch") ? "inset 0 0 0 1.5px #e0902a" : "none",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-faint)" }}>$</div>
                <input
                  aria-label={t("Amount per period")}
                  value={form.per}
                  inputMode="decimal"
                  onChange={(e) => set({ per: e.target.value })}
                  style={{ ...field, flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, padding: "9px 0" }}
                />
                <div style={{ fontSize: 12, color: "var(--rb-faint)" }}>{perOf(form.freq)}</div>
              </div>
            )}
          </div>
        )}
        <div
          data-tour="goal-result"
          style={{ marginTop: 14, padding: "14px 16px", borderRadius: 18, background: "linear-gradient(150deg,rgba(23,184,102,.13),rgba(23,184,102,.05))", minHeight: 44 }}
        >
          <div style={{ fontSize: 11.5, color: "var(--rb-green-deep)" }}>{resLabel}</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", color: "#0b5e37", marginTop: 3 }}>{resText}</div>
        </div>
        {form.mode === "date" && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "10px 2px 0", fontSize: 11.5, color: "var(--rb-faint)" }}>
            {Ico.cal}
            {t("The deadline is added to your Calendar.")}
          </div>
        )}
        <button
          type="button"
          data-tour="goal-important"
          role="switch"
          aria-checked={form.important}
          onClick={() => set({ important: !form.important })}
          style={{
            ...field,
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 18,
            cursor: "pointer",
            textAlign: "left",
            background: form.important ? "rgba(224,144,42,.1)" : "rgba(18,38,30,.04)",
            transition: "background .35s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill={form.important ? "#e0902a" : "none"} stroke="#e0902a" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 1.6l1.95 4 4.4.6-3.2 3.1.78 4.4L8 11.6l-3.93 2.1.78-4.4L1.65 6.2l4.4-.6Z" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--rb-ink)" }}>{t("Mark as important")}</div>
            <div style={{ fontSize: 11.5, color: "var(--rb-faint)", marginTop: 1 }}>{t("Important jars always come first")}</div>
          </div>
          <div
            style={{
              width: 40,
              height: 22,
              flex: "none",
              borderRadius: 999,
              padding: 2,
              boxSizing: "border-box",
              background: form.important ? "linear-gradient(150deg,#f0a23c,#e0902a)" : "rgba(18,38,30,.16)",
              transition: "background .35s ease",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 2px 5px rgba(0,0,0,.2)",
                transform: `translateX(${form.important ? 18 : 0}px)`,
                transition: `transform .4s ${ease}`,
              }}
            />
          </div>
        </button>
        <div style={{ fontSize: 12, color: "var(--rb-faint)", margin: "16px 0 10px" }}>{t("Jar color")}</div>
        <div role="radiogroup" aria-label={t("Jar color")} style={{ display: "flex", gap: 10 }}>
          {JAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={form.color === c}
              aria-label={c}
              onClick={() => set({ color: c })}
              style={{
                width: 26,
                height: 26,
                padding: 0,
                border: 0,
                borderRadius: "50%",
                cursor: "pointer",
                background: c,
                boxShadow: form.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : "none",
                transform: `scale(${form.color === c ? 1.15 : 1})`,
                transition: `transform .3s ${ease},box-shadow .3s ease`,
              }}
            />
          ))}
        </div>
        {form.err && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, fontSize: 12.5, fontWeight: 600, color: "#9a6a14" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e0902a" }} />
            {form.err}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
          {onDelete && (
            <button
              type="button"
              onClick={() => (sure ? onDelete() : setSure(true))}
              onBlur={() => setSure(false)}
              className="rb-hover-bg"
              style={{ ...cancelBtn, padding: "13px 16px", color: sure ? "#fff" : "var(--rb-danger)", background: sure ? "var(--rb-danger)" : "transparent" }}
            >
              {sure ? t("Sure?") : t("Delete")}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={cancelBtn}>
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!res.ok) setForm({ ...form, err: missingText() });
              else onSave();
            }}
            style={{
              padding: "13px 24px",
              border: 0,
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13.5,
              fontWeight: 600,
              color: "#fff",
              background: "var(--rb-green-grad)",
            }}
          >
            {form.id ? t("Save") : t("Create jar")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
