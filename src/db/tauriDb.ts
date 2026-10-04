/**
 * Adaptador SQL para la app de escritorio: SQLite real (`rabit.db`) en el directorio de datos de la app.
 */
import Database from "@tauri-apps/plugin-sql";
import type { SqlAdapter, SqlValue } from "./adapter";

/** SQLite real en el directorio de datos de la app (rabit.db). */
export async function openTauriDb(): Promise<SqlAdapter> {
  const db = await Database.load("sqlite:rabit.db");
  await db.execute("PRAGMA foreign_keys = ON");
  return {
    async execute(sql, params = []) {
      await db.execute(sql, params);
    },
    async select<T>(sql: string, params: SqlValue[] = []) {
      return db.select<T[]>(sql, params);
    },
  };
}
