/**
 * Ajustes › Probar RaBit: cargar datos de ejemplo o borrar todo (con confirmación en dos clics).
 */
import { useState } from "react";
import { useUi } from "../../store/ui";
import { clearAllData, seedDemoData } from "../../services/seed";
import { t } from "../../i18n";
import { label, row } from "./settingsParts";

export function TrySection() {
  const showToast = useUi((s) => s.showToast);
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      {label("TRY RABIT")}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Demo data")}</div>
            <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>
              {t("Fills every module with sample tasks, events, notes, routine and stocks.")}
            </div>
          </div>
          <button
            onClick={() => void seedDemoData().then(() => showToast(t("Demo data loaded")))}
            style={{
              padding: "8px 14px",
              border: 0,
              borderRadius: 999,
              background: "var(--rb-green-grad)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {t("Load")}
          </button>
        </div>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Clear all data")}</div>
            <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>
              {t("Removes tasks, events, notes, routine and savings. Your name and settings stay.")}
            </div>
          </div>
          <button
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              setConfirmClear(false);
              void clearAllData().then(() => showToast(t("All data cleared")));
            }}
            onBlur={() => setConfirmClear(false)}
            style={{
              padding: "8px 14px",
              border: 0,
              borderRadius: 999,
              background: confirmClear ? "var(--rb-danger)" : "#fff",
              boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: confirmClear ? "#fff" : "var(--rb-danger)",
              cursor: "pointer",
            }}
          >
            {confirmClear ? t("Sure?") : t("Clear")}
          </button>
        </div>
      </div>
    </>
  );
}
