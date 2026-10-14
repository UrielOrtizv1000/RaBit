/**
 * Reglas de presentación de Ahorros: preferencia de movimiento reducido y los mensajes de la tarjeta de cada frasco según su plan.
 */
import { todayISO } from "../../domain/dates";
import { money, perOf, shortDate, type GoalPlan, type SavingsGoal } from "../../domain/savings";
import { t } from "../../i18n";

export const reducedMotion = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Mensajes de la tarjeta de un frasco según su plan. */
export function cardText(g: SavingsGoal, p: GoalPlan): { msg: string; sub: string; msgColor: string } {
  const week = g.freq === "week";
  if (p.done) return { msg: t("Goal reached — congrats!"), sub: t("{amt} extra saved", { amt: money(g.saved - g.target) }), msgColor: "#0b7a45" };
  if (g.deadline && g.deadline < todayISO()) return { msg: t("Deadline passed"), sub: t("{amt} still to go", { amt: money(p.left) }), msgColor: "#a8443a" };
  if (p.free) return { msg: t("No plan · add whenever you want"), sub: t("{amt} to go", { amt: money(p.left) }), msgColor: "#41504a" };
  if (p.dThis >= p.now - 0.5) {
    const ahead = p.dThis > p.now * 1.05;
    return {
      msg: ahead ? t("Ahead of plan") : week ? t("This week covered") : t("This month covered"),
      sub: g.deadline
        ? t("Next: {amt} · due {date}", { amt: `${money(p.next)}${perOf(g.freq)}`, date: shortDate(g.deadline) })
        : t("Next: {amt} · ends {end}", { amt: `${money(p.next)}${perOf(g.freq)}`, end: p.end }),
      msgColor: "#0b7a45",
    };
  }
  const owed = money(p.now - Math.max(0, p.dThis));
  return {
    msg: week ? t("{amt} left this week", { amt: owed }) : t("{amt} left this month", { amt: owed }),
    sub: p.rem > 1 ? t("Skip it and it becomes {amt}", { amt: `${money(p.left / (p.rem - 1))}${perOf(g.freq)}` }) : week ? t("Last week of the plan") : t("Last month of the plan"),
    msgColor: "#9a6a14",
  };
}
