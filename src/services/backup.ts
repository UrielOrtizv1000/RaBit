/**
 * Exportar/importar todos los datos a un .json (diálogo nativo en Tauri; descarga en el navegador).
 * Se valida la forma del archivo antes de tocar la base de datos.
 */
import type { BackupFile } from "../store/data";
import { isTauri } from "./boot";
import { t } from "../i18n";

/** Exporta el respaldo a un .json (diálogo nativo en Tauri; descarga en navegador). */
export async function downloadBackup(b: BackupFile): Promise<boolean> {
  const text = JSON.stringify(b, null, 2);
  const name = `rabit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: name, filters: [{ name: t("RaBit backup"), extensions: ["json"] }] });
    if (!path) return false;
    await writeTextFile(path, text);
    return true;
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function readBackupFile(f: File): Promise<BackupFile> {
  const data: unknown = JSON.parse(await f.text());
  if (typeof data !== "object" || data === null || (data as { app?: unknown }).app !== "rabit") throw new Error(t("That is not a RaBit backup"));
  const b = data as BackupFile;
  for (const k of ["tags", "tasks", "events", "notes", "routine"] as const) if (!Array.isArray(b[k])) throw new Error(t("Backup is incomplete"));
  return b;
}
