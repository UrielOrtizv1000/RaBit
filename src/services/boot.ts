/**
 * Arranque: abre la base correcta (Tauri o sql.js), migra, carga el store y, solo en desarrollo, expone `window.__rabit`.
 * `boot()` es idempotente porque React StrictMode monta dos veces en desarrollo.
 */
import { migrate, type SqlAdapter } from "../db/adapter";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { seedDemoData } from "./seed";

export const isTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function openDb(): Promise<SqlAdapter> {
  if (isTauri()) {
    const { openTauriDb } = await import("../db/tauriDb");
    return openTauriDb();
  }
  const { openSqlJs } = await import("../db/sqljsDb");
  return openSqlJs({ persist: true });
}

let booting: Promise<void> | null = null;

/** Idempotente: StrictMode monta dos veces en dev. */
export function boot(): Promise<void> {
  return (booting ??= doBoot());
}

async function doBoot(): Promise<void> {
  const db = await openDb();
  await migrate(db);
  await useData.getState().init(db);
  // solo desarrollo: acceso al store desde las pruebas (Playwright / consola)
  if (import.meta.env.DEV) (window as unknown as { __rabit?: unknown }).__rabit = { useData, useUi };
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("seed")) {
    if (!useData.getState().tasks.length) await seedDemoData();
  }
}
