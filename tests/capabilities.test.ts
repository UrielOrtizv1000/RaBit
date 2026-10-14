import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Los permisos de Tauri (src-tauri/capabilities/default.json) deben ser EXACTAMENTE los que usa el código.
 * Esto evita los dos fallos que ya ocurrieron: permisos de más («core:default» y compañía) y permisos de menos
 * (exportar un respaldo fallaba en la app instalada porque faltaba `fs:allow-write-text-file`; en el navegador no se nota).
 * Para añadir un plugin: impórtalo, añade su fila a REQUIRED y sus permisos al JSON (docs/ARCHITECTURE.md → Tauri permissions).
 */
const WINDOW_PERMS = [
  "core:window:allow-start-dragging",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-internal-toggle-maximize",
  "core:window:allow-close",
  "core:window:allow-destroy",
  // `onCloseRequested` (actualizador al cerrar) escucha el evento de cierre
  "core:event:allow-listen",
  "core:event:allow-unlisten",
];
const REQUIRED: Record<string, string[]> = {
  "@tauri-apps/plugin-sql": ["sql:allow-load", "sql:allow-select", "sql:allow-execute"],
  "@tauri-apps/plugin-fs": ["fs:allow-write-text-file"],
  "@tauri-apps/plugin-dialog": ["dialog:allow-save"],
  "@tauri-apps/plugin-notification": ["notification:allow-is-permission-granted", "notification:allow-request-permission", "notification:allow-notify"],
  "@tauri-apps/plugin-updater": ["updater:allow-check", "updater:allow-download", "updater:allow-install"],
  "@tauri-apps/plugin-process": ["process:allow-restart"],
  "@tauri-apps/api/app": ["core:app:allow-version"],
  "@tauri-apps/api/window": WINDOW_PERMS,
  // `invoke("set_glass")` es un comando propio de la app: no necesita permiso
  "@tauri-apps/api/core": [],
};

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

const imported = new Set<string>();
const unknown = new Set<string>();
for (const file of walk("src")) {
  for (const m of readFileSync(file, "utf8").matchAll(/["'](@tauri-apps\/(?:plugin-[a-z]+|api\/[a-z]+))["']/g)) {
    (m[1] in REQUIRED ? imported : unknown).add(m[1]);
  }
}
const caps = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8")) as { permissions: string[]; windows: string[] };

describe("tauri capabilities", () => {
  it("every Tauri module the frontend imports is covered by the table in this test", () => {
    expect([...unknown]).toEqual([]);
  });

  it("grants exactly the permissions the imported modules need (no more, no less)", () => {
    const needed = new Set([...imported].flatMap((i) => REQUIRED[i]));
    const granted = new Set(caps.permissions);
    expect({ missing: [...needed].filter((p) => !granted.has(p)), extra: [...granted].filter((p) => !needed.has(p)) }).toEqual({ missing: [], extra: [] });
  });

  it("never uses broad «default» permission sets and only targets the main window", () => {
    expect(caps.permissions.filter((p) => p.endsWith(":default"))).toEqual([]);
    expect(new Set(caps.permissions).size).toBe(caps.permissions.length); // sin duplicados
    expect(caps.windows).toEqual(["main"]);
  });
});
