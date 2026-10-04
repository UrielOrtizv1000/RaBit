/**
 * Savings: página provisional «Próximamente» con la misma estructura que el resto de páginas.
 */
import { MONTHS, WEEKDAYS } from "../../domain/dates";
import { t } from "../../i18n";
import { PageHeader } from "../../components/ui/PageHeader";
import { Terminal } from "../../components/ui/Terminal";

/** Savings: próximamente. Página provisional con la misma estructura que las demás. */
export function SavingsPage() {
  const now = new Date();
  const kicker = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`.toUpperCase();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader eyebrow={kicker} title={t("Savings")} subtitle={t("Coming soon")} />
      <div
        data-rise="1"
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: 30,
          background: "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
          backdropFilter: "blur(24px) saturate(170%)",
          border: "1px solid rgba(255,255,255,.8)",
          boxShadow: "inset 0 1px 1px #fff,0 24px 48px -30px rgba(20,48,34,.3)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, maxWidth: 520 }}>
          <div style={{ position: "relative", display: "grid", placeItems: "center", width: 220, height: 200 }}>
            <div
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: "50%",
                background: "radial-gradient(circle,rgba(255,255,255,.9),rgba(214,242,227,.3) 62%,rgba(214,242,227,0) 72%)",
              }}
            />
            <img
              src="/rabit.png"
              alt="RaBit"
              style={{ position: "relative", width: 160, height: 160, objectFit: "contain", imageRendering: "pixelated", animation: "rb-float 5.4s ease-in-out infinite" }}
            />
          </div>
          <div style={{ width: 380, maxWidth: "100%", textAlign: "left" }}>
            <Terminal name="rabit@savings" greeting={t("HEY!")} line={t("SAVINGS IS COMING SOON.")} />
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#5d6f67" }}>
            {t("Set goals, track what you save and watch it grow. We are building it — it will show up right here.")}
          </div>
        </div>
      </div>
    </div>
  );
}
