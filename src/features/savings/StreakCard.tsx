/**
 * Tarjeta de la racha semanal: semanas con depósitos, mejor racha, metas completadas y lo ahorrado esta semana frente a lo planeado.
 */
import { weekLabel, money } from "../../domain/savings";
import { t, tn } from "../../i18n";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { silk } from "../../components/ui/glass";
import type { streakOf } from "../../domain/savings";

export function StreakCard({
  streak,
  doneCount,
  weekIn,
  weekPlan,
  weekOk,
}: {
  streak: ReturnType<typeof streakOf>;
  doneCount: number;
  weekIn: number;
  weekPlan: number;
  weekOk: boolean;
}) {
  return (
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
            <div style={silk(8, { letterSpacing: ".06em", color: w.current ? "var(--rb-green-deep)" : "#9aa8a1" })}>{w.current ? t("NOW") : weekLabel(w.w).split(" ")[1]}</div>
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
  );
}
