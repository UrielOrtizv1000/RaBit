/**
 * Interfaz mínima de acceso SQL (`execute`/`select`) y ejecución de migraciones.
 * La app depende de ESTA interfaz, no de un motor: Tauri usa SQLite real y los tests/navegador usan sql.js.
 */
import { MIGRATIONS } from "./migrations";

export type SqlValue = string | number | null;
export interface SqlAdapter {
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  select<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

/** Aplica las migraciones pendientes (control con PRAGMA user_version). */
export async function migrate(db: SqlAdapter): Promise<void> {
  const rows = await db.select<{ user_version: number }>("PRAGMA user_version");
  const current = Number(rows[0]?.user_version ?? 0);
  for (const m of MIGRATIONS.filter((x) => x.version > current)) {
    for (const stmt of m.sql) await db.execute(stmt);
    await db.execute(`PRAGMA user_version = ${m.version}`);
  }
}
