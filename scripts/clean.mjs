/**
 * Borra las salidas de compilación y de pruebas (todas están en .gitignore): dist, test-results, installers y src-tauri/target*.
 * Uso: npm run clean
 */
import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const tauri = join(root, "src-tauri");
const targets = [join(root, "dist"), join(root, "test-results"), join(root, "installers")];
for (const d of readdirSync(tauri)) if (d === "target" || d.startsWith("target-")) targets.push(join(tauri, d));
for (const t of targets) {
  rmSync(t, { recursive: true, force: true });
  console.log(`✔ ${t}`);
}
