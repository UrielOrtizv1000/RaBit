/**
 * Genera los instaladores de la versión beta con nombre fijo:
 *   installers/RaBit_beta.exe  (NSIS, el recomendado: instala por usuario, sin permisos de administrador)
 *   installers/RaBit_beta.msi  (MSI, para despliegues administrados)
 *
 * Uso: npm run package:beta        (compila con `tauri build` y copia los resultados)
 *      npm run package:beta -- --skip-build   (solo copia lo ya compilado)
 *      RABIT_TARGET_DIR=C:/ruta npm run package:beta   (compila en otra carpeta: útil si rabit.exe está abierta)
 *
 * Por qué se renombra después de compilar y no con `productName`: el nombre del producto es el que ve el usuario
 * en la ventana, el menú Inicio y «Aplicaciones»; el nombre del archivo es solo del instalador.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targetDir = process.env.RABIT_TARGET_DIR ?? join(root, "src-tauri", "target");
const bundle = join(targetDir, "release", "bundle");
const out = join(root, "installers");

if (!process.argv.includes("--skip-build")) {
  const r = spawnSync("npm", ["run", "tauri", "build"], { cwd: root, stdio: "inherit", shell: true, env: { ...process.env, CARGO_TARGET_DIR: targetDir } });
  if (r.status !== 0) {
    console.error("\n`tauri build` falló. Si RaBit está abierta, ciérrala (Windows no deja sobrescribir rabit.exe en uso).");
    process.exit(r.status ?? 1);
  }
}

/** Primer archivo con la extensión dada dentro de bundle/<carpeta>. */
function find(dir, ext) {
  const d = join(bundle, dir);
  if (!existsSync(d)) return null;
  const f = readdirSync(d).find((n) => n.toLowerCase().endsWith(ext));
  return f ? join(d, f) : null;
}

mkdirSync(out, { recursive: true });
let copied = 0;
for (const [dir, ext, name] of [
  ["nsis", ".exe", "RaBit_beta.exe"],
  ["msi", ".msi", "RaBit_beta.msi"],
]) {
  const src = find(dir, ext);
  if (!src) {
    console.warn(`No se encontró el instalador ${ext} en ${join(bundle, dir)}`);
    continue;
  }
  copyFileSync(src, join(out, name));
  console.log(`✔ ${join(out, name)}`);
  copied++;
}
if (copied === 0) process.exit(1);
