/**
 * Ajustes › Datos: respaldo (exportar/importar), tutorial, actualizaciones y sincronización (próximamente).
 */
import { useRef, useState } from "react";
import { useData, type BackupFile } from "../../store/data";
import { useUi } from "../../store/ui";
import { downloadBackup, readBackupFile } from "../../services/backup";
import { silk } from "../../components/ui/glass";
import { pillButton } from "../../components/ui/buttons";
import { t } from "../../i18n";
import { resetTours } from "../../components/tourState";
import { useUpdater } from "../../services/updater";
import { label, row } from "./settingsParts";

export function DataSection({ close }: { close: () => void }) {
  const openTour = useUi((s) => s.openTour);
  const showToast = useUi((s) => s.showToast);
  const { exportAll, importAll } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(false);

  const checkUpdates = async () => {
    setChecking(true);
    await useUpdater.api.check();
    setChecking(false);
    const { next, supported } = useUpdater.getState();
    showToast(!supported ? t("Updates come from your package manager") : next ? t("Update available — use the download icon") : t("You're up to date"));
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b: BackupFile = await readBackupFile(f);
      await importAll(b);
      showToast(t("Backup imported"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("Could not import that file"));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      {label("DATA")}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Backup")}</div>
            <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("Everything lives on this device. Export a .json to keep a copy.")}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => void downloadBackup(exportAll()).then((ok) => ok && showToast(t("Backup exported")))} style={pillButton}>
              {t("Export")}
            </button>
            <button onClick={() => fileRef.current?.click()} style={pillButton}>
              {t("Import")}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
          </div>
        </div>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Tutorial")}</div>
            <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("A quick tour of the gestures and tools.")}</div>
          </div>
          <button
            onClick={() => {
              close();
              resetTours();
              openTour("main");
            }}
            style={pillButton}
          >
            {t("Show")}
          </button>
        </div>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Updates")}</div>
            <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t("RaBit checks quietly at start. Nothing else is sent.")}</div>
          </div>
          <button
            onClick={() => void checkUpdates()}
            disabled={checking}
            style={{
              padding: "8px 14px",
              border: 0,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "inset 0 1px 1px #fff,0 6px 14px -8px rgba(20,48,34,.4)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--rb-green-deep)",
              cursor: checking ? "default" : "pointer",
              opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? t("Checking…") : t("Check for updates")}
          </button>
        </div>
        <div style={{ ...row, justifyContent: "space-between", opacity: 0.8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>{t("Cloud sync")}</div>
          <span style={{ ...silk(9, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "4px 8px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
            {t("COMING SOON")}
          </span>
        </div>
      </div>
    </>
  );
}
