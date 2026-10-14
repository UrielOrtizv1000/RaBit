/**
 * Savings: metas con forma de frasco (carrusel con monedas), racha semanal de depósitos, calculadora y la voz de RaBit.
 * El plan de cada meta (cuánto toca este periodo) se recalcula con cada depósito o retiro; ver domain/savings.ts.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, MONTHS, todayISO, WEEKDAYS } from "../../domain/dates";
import {
  evalGoalForm,
  JAR_COLORS,
  monthIndex,
  money,
  parseAmount,
  perOf,
  planOf,
  shortDate,
  sortGoals,
  streakOf,
  weekIndex,
  weekLabel,
  type GoalPlan,
  type SavingsGoal,
} from "../../domain/savings";
import { useData } from "../../store/data";
import { TITLE_MAX } from "../../domain/types";
import { useUi } from "../../store/ui";
import { t, tn } from "../../i18n";
import { PageHeader } from "../../components/ui/PageHeader";
import { Terminal } from "../../components/ui/Terminal";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { silk } from "../../components/ui/glass";
import { Calculator } from "./Calculator";
import { JarCarousel, type JarCard } from "./JarCarousel";
import { GoalModal, type GoalDraft } from "./GoalModal";
import { MoveModal, type MoveForm } from "./MoveModal";

const reducedMotion = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Mensajes de la tarjeta de un frasco según su plan. */
function cardText(g: SavingsGoal, p: GoalPlan): { msg: string; sub: string; msgColor: string } {
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

export function SavingsPage() {
  const goals = useData((s) => s.goals);
  const moves = useData((s) => s.moves);
  const addGoal = useData((s) => s.addGoal);
  const updateGoal = useData((s) => s.updateGoal);
  const deleteGoal = useData((s) => s.deleteGoal);
  const addMove = useData((s) => s.addMove);
  const showToast = useUi((s) => s.showToast);

  const [now, setNow] = useState(() => Date.now()); // el plan cambia al cambiar de semana/mes
  const [move, setMove] = useState<MoveForm | null>(null);
  const [gform, setGform] = useState<GoalDraft | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [followId, setFollowId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [sparks, setSparks] = useState<Record<string, number>>({});
  const [proud, setProud] = useState<string | null>(null);
  const [typed, setTyped] = useState(0);
  const [blinkOff, setBlinkOff] = useState(false);
  const [reduced] = useState(reducedMotion);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Mensaje de orgullo: se «escribe» letra por letra, parpadea un rato y desaparece
  useEffect(() => {
    if (!proud) return;
    let count = reduced ? proud.length : 0; // con movimiento reducido el texto ya está completo
    let blink: ReturnType<typeof setInterval> | undefined;
    let end: ReturnType<typeof setTimeout> | undefined;
    const type = setInterval(() => {
      count += 1;
      setTyped(count);
      if (count >= proud.length) {
        clearInterval(type);
        blink = setInterval(() => setBlinkOff((b) => !b), 480);
        end = setTimeout(() => {
          if (blink) clearInterval(blink);
          setProud(null);
          setBlinkOff(false);
        }, 10_000);
      }
    }, 55);
    return () => {
      setTyped(0);
      clearInterval(type);
      if (blink) clearInterval(blink);
      if (end) clearTimeout(end);
    };
  }, [proud, reduced]);

  const plans = useMemo(() => new Map(goals.map((g) => [g.id, planOf(g, moves, now)])), [goals, moves, now]);
  const sorted = useMemo(() => sortGoals(goals, plans, celebrate), [goals, plans, celebrate]);
  const cards: JarCard[] = useMemo(
    () =>
      sorted.map((g) => {
        const plan = plans.get(g.id) ?? planOf(g, moves, now);
        return { goal: g, plan, ...cardText(g, plan) };
      }),
    [sorted, plans, moves, now],
  );
  const streak = useMemo(() => streakOf(moves, now), [moves, now]);
  const weekly = goals.filter((g) => g.freq === "week" && !plans.get(g.id)?.done);
  const weekPlan = weekly.reduce((a, g) => a + (plans.get(g.id)?.now ?? 0), 0);
  const weekIn = weekly.reduce((a, g) => a + Math.max(0, plans.get(g.id)?.dThis ?? 0), 0);
  const weekOk = weekIn >= weekPlan - 0.5;
  const doneCount = goals.filter((g) => plans.get(g.id)?.done).length;
  const behind = goals.find((g) => {
    const p = plans.get(g.id);
    return p && !p.done && !p.free && p.dThis < p.now - 0.5;
  });
  const pending = goals.filter((g) => !plans.get(g.id)?.done).map((g) => ({ name: g.name, color: g.color, left: plans.get(g.id)?.left ?? 0 }));

  // ---- RaBit habla
  let botHead = t("NICE!");
  let botLine: string;
  if (proud) {
    botHead = t("CONGRATS!");
    botLine = proud.slice(0, typed);
  } else if (goals.length === 0) {
    botHead = t("HEY!");
    botLine = t("CREATE YOUR FIRST JAR.");
  } else if (behind) {
    const p = plans.get(behind.id);
    botHead = t("HEADS UP");
    const left = money((p?.now ?? 0) - Math.max(0, p?.dThis ?? 0));
    botLine = (
      behind.freq === "week"
        ? t("{amt} LEFT FOR {name} THIS WEEK.", { amt: left, name: behind.name.toUpperCase() })
        : t("{amt} LEFT FOR {name} THIS MONTH.", { amt: left, name: behind.name.toUpperCase() })
    ).toUpperCase();
  } else botLine = t("ALL JARS ON TRACK. {n}-WEEK STREAK.", { n: streak.current });

  // ---- acciones
  const openNew = useCallback(
    () =>
      setGform({
        id: null,
        name: "",
        target: "",
        mode: "free",
        freq: "week",
        deadline: addDays(todayISO(), 90),
        n: "12",
        per: "",
        color: JAR_COLORS[goals.length % JAR_COLORS.length],
        important: false,
        err: "",
      }),
    [goals.length],
  );
  const openEdit = (id: string) => {
    const g = goals.find((x) => x.id === id);
    const p = plans.get(id);
    if (!g || !p) return;
    setGform({
      id: g.id,
      name: g.name,
      target: String(g.target),
      mode: g.freq === "none" ? "free" : g.deadline ? "date" : "amount",
      freq: g.freq === "none" ? "week" : g.freq,
      deadline: g.deadline ?? addDays(todayISO(), 90),
      n: String(p.rem),
      per: String(Math.round(p.now)),
      color: g.color,
      important: g.important,
      err: "",
    });
  };

  const celebrateGoal = (g: SavingsGoal) => {
    setCelebrate(g.id);
    setProud(t("{name} IS DONE. RABIT IS PROUD OF YOU.", { name: g.name.toUpperCase() }));
    setTimeout(() => setSparks((s) => ({ ...s, [g.id]: (s[g.id] ?? 0) + 1 })), 500);
    setTimeout(() => {
      setFollowId(g.id);
      setCelebrate(null);
      setTimeout(() => setFollowId(null), 2200);
    }, 3200);
  };

  const saveMove = async () => {
    if (!move) return;
    const g = goals.find((x) => x.id === move.goalId);
    const a = parseAmount(move.amt);
    if (!g) return;
    if (!(a && a > 0)) return setMove({ ...move, err: t("Type an amount first.") });
    if (move.mode === "out" && a > g.saved) return setMove({ ...move, err: t("You only have {amt} in this jar.", { amt: money(g.saved) }) });
    const sgn = move.mode === "add" ? a : -a;
    const wasDone = g.saved >= g.target;
    const nowDone = g.saved + sgn >= g.target;
    await addMove(g.id, sgn);
    showToast(sgn > 0 ? t("{amt} added to {name}", { amt: money(a), name: g.name }) : t("{amt} withdrawn from {name}", { amt: money(a), name: g.name }));
    setMove(null);
    if (!wasDone && nowDone) celebrateGoal(g);
  };

  /** Crea, mueve o quita el evento de Calendario ligado a la fecha límite de la meta; devuelve su id (o null). */
  const syncDeadlineEvent = async (
    g: { name: string; target: number; color: string; deadline: string | null; eventId: string | null; freq: SavingsGoal["freq"] },
    perPeriod: number,
  ): Promise<string | null> => {
    const { events, addEvent, updateEvent, deleteEvent } = useData.getState();
    const current = g.eventId ? events.find((e) => e.id === g.eventId) : undefined;
    if (!g.deadline) {
      if (current) await deleteEvent(current.id);
      return null;
    }
    const title = t("Savings deadline: {name}", { name: g.name });
    const description =
      perPeriod > 0
        ? t("Goal {target}. Save {amt} to get there.", { target: money(g.target), amt: `${money(perPeriod)}${perOf(g.freq)}` })
        : t("Goal {target}.", { target: money(g.target) });
    const fields = { title: title.slice(0, TITLE_MAX), date: g.deadline, allDay: true, start: "00:00", end: "23:59", color: g.color, description };
    if (current) {
      await updateEvent(current.id, fields);
      return current.id;
    }
    return (await addEvent(fields)).id;
  };

  const saveGoal = async () => {
    if (!gform) return;
    const cur = goals.find((x) => x.id === gform.id);
    const res = evalGoalForm(gform, cur?.saved ?? 0, now);
    if (!res.ok) return;
    const free = gform.mode === "free";
    const dated = gform.mode === "date";
    const target = parseAmount(gform.target) ?? 0;
    const data = {
      name: gform.name.trim(),
      target,
      color: gform.color,
      important: gform.important,
      freq: free ? ("none" as const) : gform.freq,
      n: free ? 0 : res.n,
      start: gform.freq === "month" && !free ? monthIndex(now) : weekIndex(now),
      deadline: dated ? gform.deadline : null,
      eventId: cur?.eventId ?? null,
    };
    const perPeriod = dated ? res.perPeriod : free ? 0 : gform.mode === "amount" ? (parseAmount(gform.per) ?? 0) : 0;
    data.eventId = await syncDeadlineEvent(data, perPeriod);
    if (gform.id) {
      await updateGoal(gform.id, data);
      showToast(t("{name} re-planned", { name: data.name }));
    } else {
      const g = await addGoal(data);
      setDropId(g.id);
      setTimeout(() => setDropId(null), 2500);
      showToast(dated ? t("{name} jar created · deadline added to your Calendar", { name: data.name }) : t("{name} jar created", { name: data.name }));
    }
    setGform(null);
  };

  /** Borra un frasco (y su evento de Calendario) con «Deshacer» durante unos segundos. */
  const removeGoalById = async (id: string) => {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const mine = moves.filter((m) => m.goalId === id);
    const hadEvent = g.eventId && useData.getState().events.some((e) => e.id === g.eventId);
    if (hadEvent) await useData.getState().deleteEvent(g.eventId as string);
    await deleteGoal(id);
    showToast(t("{name} deleted", { name: g.name }), () => {
      void (async () => {
        const eventId = g.deadline && hadEvent ? await syncDeadlineEvent({ ...g, eventId: null }, planOf(g, mine, Date.now()).now) : null;
        await useData.getState().restoreGoal({ ...g, eventId }, mine);
        showToast(t("{name} restored", { name: g.name }));
      })();
    });
  };
  const removeGoal = async () => {
    if (!gform?.id) return;
    const id = gform.id;
    setGform(null);
    await removeGoalById(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMove(null);
      setGform(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const d = new Date(now);
  const kicker = `${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`.toUpperCase();
  const moveGoal = move ? goals.find((g) => g.id === move.goalId) : undefined;
  const editing = gform?.id ? goals.find((g) => g.id === gform.id) : undefined;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
      <PageHeader eyebrow={kicker} title={t("Savings")}>
        <button
          type="button"
          data-tour="new-goal"
          onClick={openNew}
          className="rb-hover-scale"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 0,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--rb-green-deep)",
          }}
        >
          {t("Create new")}
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: "var(--rb-green-grad)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 12px 22px -12px rgba(23,184,102,.9)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </span>
        </button>
      </PageHeader>

      {/* Cuadrícula: la racha y la voz de RaBit comparten fila; los frascos y la calculadora comparten fila (mismo alto y mismo borde superior/inferior) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gridTemplateRows: "auto auto auto", columnGap: 26, rowGap: 18, alignItems: "stretch" }}>
        <>
          <div
            data-rise="1"
            data-tour="streak"
            style={{
              ...GLASS_CARD,
              gridColumn: 1,
              gridRow: 1,
              borderRadius: 30,
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr) auto",
              gap: 30,
              alignItems: "center",
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(150deg,#14261d,#10241a)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 14px 24px -14px rgba(10,30,20,.8)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#3ddc84" style={{ filter: "drop-shadow(0 0 6px rgba(61,220,132,.7))" }} aria-hidden="true">
                  <path d="M12 2c.6 3.2 2.7 4.6 4.2 6.6 1.3 1.7 2 3.4 2 5.4a6.2 6.2 0 0 1-12.4 0c0-2.1.9-3.7 2.2-5 .2 1.5.9 2.6 2 3.2-.4-3.6.4-6.9 2-10.2Z" />
                </svg>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 40, lineHeight: 1, color: "var(--rb-ink)" }}>{streak.current}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--rb-ink)" }}>{t("week streak")}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--rb-faint)", marginTop: 5 }}>
                  {t("Best {best} · {done} completed", { best: tn(streak.best, "week", "weeks"), done: tn(doneCount, "goal", "goals") })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {streak.weeks.map((w) => (
                <div
                  key={w.w}
                  title={t("Week of {date} · {amt}", { date: weekLabel(w.w), amt: money(w.amount) })}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 34,
                      borderRadius: 10,
                      background: w.amount > 0 ? "linear-gradient(160deg,#2fd17f,#0f9a56)" : "rgba(18,38,30,.06)",
                      boxShadow: w.current ? "0 0 0 2px #fff,0 0 0 3.5px #17b866" : w.amount > 0 ? "inset 0 1px 0 rgba(255,255,255,.35)" : "none",
                      transition: "background .5s ease",
                    }}
                  />
                  <div style={silk(8, { letterSpacing: ".06em", color: w.current ? "var(--rb-green-deep)" : "#9aa8a1" })}>
                    {w.current ? t("NOW") : weekLabel(w.w).split(" ")[1]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", minWidth: 170 }}>
              <div style={{ fontSize: 12, color: "var(--rb-faint)", marginBottom: 5 }}>{t("This week")}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: "var(--rb-ink)" }}>
                {money(weekIn)}
                <span style={{ fontSize: 14, fontWeight: 600, color: "#9aa8a1" }}> / {money(weekPlan)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  color: weekOk ? "var(--rb-green-deep)" : "#9a6a14",
                  marginTop: 6,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: weekOk ? "var(--rb-green)" : "#e0902a" }} />
                {weekOk ? t("Week covered") : t("{amt} to go", { amt: money(weekPlan - weekIn) })}
              </div>
            </div>
          </div>

          <JarCarousel
            cards={cards}
            dropId={dropId}
            followId={followId}
            sparks={sparks}
            reduced={reduced}
            onAdd={(id) => setMove({ goalId: id, mode: "add", amt: "", err: "" })}
            onWithdraw={(id) => setMove({ goalId: id, mode: "out", amt: "", err: "" })}
            onEdit={openEdit}
            onNew={openNew}
            onDelete={(id) => void removeGoalById(id)}
          />
        </>
        <>
          <div style={{ gridColumn: 2, gridRow: 1, display: "flex", opacity: proud && blinkOff ? 0.45 : 1, transition: "opacity .22s ease" }}>
            <Terminal fill name="rabit@savings" greeting={botHead.replace(/^>\s*/, "")} line={botLine} />
          </div>
          <Calculator
            pending={pending}
            now={now}
            onJar={(r) =>
              setGform({
                id: null,
                name: "",
                target: String(Math.round(r.total)),
                mode: "amount",
                deadline: addDays(todayISO(), 90),
                freq: r.freq,
                n: String(r.n),
                per: String(r.per),
                color: JAR_COLORS[goals.length % JAR_COLORS.length],
                important: false,
                err: "",
              })
            }
          />
        </>
      </div>

      {move && moveGoal && <MoveModal form={move} setForm={setMove} goal={moveGoal} moves={moves} now={now} onClose={() => setMove(null)} onSave={() => void saveMove()} />}
      {gform && (
        <GoalModal
          form={gform}
          setForm={setGform}
          savedNow={editing?.saved ?? 0}
          now={now}
          onClose={() => setGform(null)}
          onSave={() => void saveGoal()}
          onDelete={gform.id ? () => void removeGoal() : null}
        />
      )}
    </div>
  );
}
