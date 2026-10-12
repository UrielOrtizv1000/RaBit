/**
 * Ventanas de Savings: mover dinero (depositar / retirar) y crear/editar un frasco. Se montan dentro de la página
 * (position: absolute) igual que las de Routine, así quedan bajo la barra superior y escalan con la página.
 */
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { evalGoalForm, JAR_COLORS, money, parseAmount, perOf, planOf, type GoalForm, type GoalMode, type SavingsGoal, type SavingsMove } from "../../domain/savings";
import { t, tn } from "../../i18n";
import { fmtDay, fromISO } from "../../domain/dates";
import { silk } from "../../components/ui/glass";
import { maybeStartTour } from "../../components/tourState";
import { DateField } from "../../components/ItemPanel/DatePicker";
import { Ico } from "../../components/ItemPanel/ui";

const fmtDeadline = (iso: string): string => (iso ? `${fmtDay(iso)}, ${fromISO(iso).getFullYear()}` : "");
const ease = "cubic-bezier(.22,1,.36,1)";
const box: CSSProperties = {
  width: 460,
  padding: 26,
  boxSizing: "border-box",
  borderRadius: 30,
  background: "linear-gradient(150deg,#ffffff,#f5faf7)",
  border: "1px solid #fff",
  boxShadow: "0 40px 80px -30px rgba(12,40,26,.5)",
  animation: `rb-rise .4s ${ease} both`,
};
const field: CSSProperties = { border: 0, outline: 0, background: "transparent", fontFamily: "inherit", color: "#121a16" };
const cancelBtn: CSSProperties = {
  padding: "13px 20px",
  border: 0,
  borderRadius: 999,
  cursor: "pointer",
  background: "transparent",
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 600,
  color: "#5d6f67",
};

/**
 * Fondo desenfocado + ventana. Se monta con un portal en la capa raíz de la app (`#rb-overlay`, igual que Ajustes)
 * para que el desenfoque cubra TODA la ventana y no solo el área de la página (que además está escalada).
 */
function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
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

// ------------------------------------------------------------------ mover dinero
export interface MoveForm {
  goalId: string;
  mode: "add" | "out";
  amt: string;
  err: string;
}

export function MoveModal({
  form,
  setForm,
  goal,
  moves,
  now,
  onClose,
  onSave,
}: {
  form: MoveForm;
  setForm: (f: MoveForm) => void;
  goal: SavingsGoal;
  moves: SavingsMove[];
  now: number;
  onClose: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    const h = setTimeout(() => maybeStartTour("move"), 600);
    return () => clearTimeout(h);
  }, []);
  const amtRef = useRef<HTMLInputElement>(null);
  useEffect(() => amtRef.current?.focus({ preventScroll: true }), []);
  const plan = planOf(goal, moves, now);
  const amt = parseAmount(form.amt);
  const add = form.mode === "add";
  const base = Math.max(0, plan.now - plan.dThis);
  const set = (patch: Partial<MoveForm>) => setForm({ ...form, ...patch, err: "" });

  let preview: string;
  if (!(amt && amt > 0)) {
    preview = add
      ? plan.free
        ? t("{amt} left to fill this jar.", { amt: money(plan.left) })
        : goal.freq === "week"
          ? t("Planned this week: {amt} left.", { amt: money(base) })
          : t("Planned this month: {amt} left.", { amt: money(base) })
      : t("How much are you taking out?");
  } else if (!add && amt > goal.saved) {
    preview = t("You only have {amt} in this jar.", { amt: money(goal.saved) });
  } else {
    const ns = goal.saved + (add ? amt : -amt);
    const nl = Math.max(0, goal.target - ns);
    const nd = plan.dThis + (add ? amt : -amt);
    if (ns >= goal.target) preview = t("This fills the jar! Goal complete.");
    else if (plan.free) preview = t("New balance: {bal} · {pct}% of goal", { bal: money(ns), pct: Math.round(Math.min(100, (ns / goal.target) * 100)) });
    else {
      const nxt = plan.rem > 1 ? nl / (plan.rem - 1) : nl;
      const rest = tn(plan.rem - 1, goal.freq === "week" ? "more week" : "more month", goal.freq === "week" ? "more weeks" : "more months");
      preview = t(nd >= plan.now ? "Above plan — RaBit recalculates the rest to {amt} for {rest}." : "Below plan — RaBit recalculates the rest to {amt} for {rest}.", {
        amt: `${money(nxt)}${perOf(goal.freq)}`,
        rest,
      });
    }
  }
  const bad = !!form.err || (!add && amt !== null && amt > goal.saved);

  const chips: { v: string; label: string; ink: string; bg: string }[] = !add
    ? [
        { v: "-500", label: "−$500", ink: "#41504a", bg: "rgba(18,38,30,.05)" },
        { v: "-1000", label: "−$1,000", ink: "#41504a", bg: "rgba(18,38,30,.05)" },
        { v: "empty", label: t("Empty jar"), ink: "#a8443a", bg: "rgba(192,74,66,.1)" },
      ]
    : plan.free
      ? [
          { v: "500", label: "+$500", ink: "#41504a", bg: "rgba(18,38,30,.05)" },
          { v: "1000", label: "+$1,000", ink: "#41504a", bg: "rgba(18,38,30,.05)" },
          { v: "all", label: t("Rest {amt}", { amt: money(plan.left) }), ink: "#41504a", bg: "rgba(18,38,30,.05)" },
        ]
      : [
          { v: "plan", label: t("Plan {amt}", { amt: money(base) }), ink: "#0b7a45", bg: "rgba(23,184,102,.1)" },
          { v: "half", label: t("Half"), ink: "#41504a", bg: "rgba(18,38,30,.05)" },
          { v: "all", label: t("Rest {amt}", { amt: money(plan.left) }), ink: "#41504a", bg: "rgba(18,38,30,.05)" },
        ];
  const pick = (v: string) => {
    const cur = amt ?? 0;
    if (!add) set({ amt: String(Math.round(v === "empty" ? goal.saved : Math.min(goal.saved, cur + Math.abs(+v)))) });
    else set({ amt: String(Math.round(v === "plan" ? base : v === "half" ? base / 2 : v === "all" ? plan.left : cur + +v)) });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, display: "grid", placeItems: "center", background: `${goal.color}1f` }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: goal.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#121a16", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.name}</div>
            <div style={{ fontSize: 12, color: "#6b7a73", marginTop: 2 }}>
              {money(goal.saved)} / {money(goal.target)}
              {plan.free ? ` · ${t("no plan")}` : ` · ${t("plan {amt}", { amt: `${money(plan.now)}${perOf(goal.freq)}` })}`}
            </div>
          </div>
        </div>
        <div data-tour="move-mode" style={{ display: "flex", marginBottom: 14 }}>
          <Seg<"add" | "out">
            value={form.mode}
            danger="out"
            opts={[
              ["add", t("Add money")],
              ["out", t("Withdraw")],
            ]}
            onPick={(mode) => set({ mode })}
          />
        </div>
        <div data-tour="move-amt" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 18px", borderRadius: 20, background: "rgba(18,38,30,.05)" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#6b7a73" }}>$</div>
          <input
            ref={amtRef}
            aria-label={t("Amount")}
            value={form.amt}
            placeholder="0"
            inputMode="decimal"
            onChange={(e) => set({ amt: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onClose();
            }}
            style={{ ...field, flex: 1, minWidth: 0, fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", padding: "8px 0" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {chips.map((c) => (
            <button
              key={c.v}
              type="button"
              className="rb-hover-bg"
              onClick={() => pick(c.v)}
              style={{ flex: 1, padding: 8, border: 0, borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: c.ink, background: c.bg }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div aria-live="polite" style={{ fontSize: 12.5, lineHeight: 1.5, color: bad ? "#a8443a" : "#5d6f67", margin: "16px 2px 20px", minHeight: 38 }}>
          {form.err || preview}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            style={{
              flex: 1,
              padding: 13,
              border: 0,
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13.5,
              fontWeight: 600,
              color: "#fff",
              background: add ? "linear-gradient(150deg,#26342d,#18221d)" : "#a8443a",
            }}
          >
            {add ? t("Add to jar") : t("Withdraw")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ------------------------------------------------------------------ crear / editar frasco
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
        <div style={silk(10, { letterSpacing: ".16em", color: "#6b7a73", marginBottom: 6 })}>{form.id ? t("EDIT JAR") : t("NEW JAR")}</div>
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
        <div style={{ fontSize: 12, color: "#6b7a73", marginBottom: 7 }}>{t("Goal amount")}</div>
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
        <div style={{ fontSize: 12, color: "#6b7a73", margin: "16px 0 7px" }}>{t("How do you want to plan it?")}</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7a73" }}>$</div>
                <input
                  aria-label={t("Amount per period")}
                  value={form.per}
                  inputMode="decimal"
                  onChange={(e) => set({ per: e.target.value })}
                  style={{ ...field, flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, padding: "9px 0" }}
                />
                <div style={{ fontSize: 12, color: "#6b7a73" }}>{perOf(form.freq)}</div>
              </div>
            )}
          </div>
        )}
        <div
          data-tour="goal-result"
          style={{ marginTop: 14, padding: "14px 16px", borderRadius: 18, background: "linear-gradient(150deg,rgba(23,184,102,.13),rgba(23,184,102,.05))", minHeight: 44 }}
        >
          <div style={{ fontSize: 11.5, color: "#0b7a45" }}>{resLabel}</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", color: "#0b5e37", marginTop: 3 }}>{resText}</div>
        </div>
        {form.mode === "date" && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "10px 2px 0", fontSize: 11.5, color: "#6b7a73" }}>
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#121a16" }}>{t("Mark as important")}</div>
            <div style={{ fontSize: 11.5, color: "#6b7a73", marginTop: 1 }}>{t("Important jars always come first")}</div>
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
        <div style={{ fontSize: 12, color: "#6b7a73", margin: "16px 0 10px" }}>{t("Jar color")}</div>
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
              style={{ ...cancelBtn, padding: "13px 16px", color: sure ? "#fff" : "#a8443a", background: sure ? "#a8443a" : "transparent" }}
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
              background: "linear-gradient(150deg,#1fc172,#0f9a56)",
            }}
          >
            {form.id ? t("Save") : t("Create jar")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
