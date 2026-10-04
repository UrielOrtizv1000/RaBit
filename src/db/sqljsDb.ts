/**
 * Adaptador SQL para navegador (desarrollo y pruebas e2e) basado en sql.js; persiste en localStorage.
 */
import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { SqlAdapter, SqlValue } from "./adapter";
import { logWarn } from "../lib/log";

const LS_KEY = "rabit.sqljs";

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(u: Uint8Array): string {
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}

/** Adaptador para navegador (dev / e2e) y tests. Mismo SQL que en Tauri. */
export async function openSqlJs(opts: { persist?: boolean; wasm?: string } = {}): Promise<SqlAdapter> {
  const SQL = await initSqlJs({ locateFile: () => opts.wasm ?? wasmUrl });
  let saved: Uint8Array | undefined;
  if (opts.persist) {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) saved = b64ToBytes(s);
    } catch (e) {
      logWarn("sqljs.load", e);
    }
  }
  const db: Database = new SQL.Database(saved);
  db.run("PRAGMA foreign_keys = ON");
  const flush = () => {
    if (opts.persist) {
      try {
        localStorage.setItem(LS_KEY, bytesToB64(db.export()));
      } catch (e) {
        logWarn("sqljs.save", e);
      }
    }
  };
  return {
    async execute(sql, params = []) {
      db.run(sql, params as SqlValue[]);
      flush();
    },
    async select<T>(sql: string, params: SqlValue[] = []) {
      const st = db.prepare(sql);
      st.bind(params as SqlValue[]);
      const rows: T[] = [];
      while (st.step()) rows.push(st.getAsObject() as T);
      st.free();
      return rows;
    },
  };
}
