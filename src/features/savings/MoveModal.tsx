/**
 * Savings: ventana para depositar o retirar dinero de un frasco (muestra cómo cambia el plan antes de confirmar).
 */
import { useEffect, useRef } from "react";
import { money, parseAmount, perOf, planOf, type SavingsGoal, type SavingsMove } from "../../domain/savings";
import { t, tn } from "../../i18n";
import { maybeStartTour } from "../../components/tourState";
import { box, cancelBtn, field, Overlay, Seg } from "./modalParts";

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
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--rb-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.name}</div>
            <div style={{ fontSize: 12, color: "var(--rb-faint)", marginTop: 2 }}>
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
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--rb-faint)" }}>$</div>
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
        <div aria-live="polite" style={{ fontSize: 12.5, lineHeight: 1.5, color: bad ? "var(--rb-danger)" : "var(--rb-muted)", margin: "16px 2px 20px", minHeight: 38 }}>
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
              background: add ? "linear-gradient(150deg,#26342d,#18221d)" : "var(--rb-danger)",
            }}
          >
            {add ? t("Add to jar") : t("Withdraw")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
