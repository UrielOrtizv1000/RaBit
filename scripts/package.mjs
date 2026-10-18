/**
 * Genera los instaladores de la plataforma actual con nombre fijo, en installers/:
 *   Windows  RaBit-Setup.exe  (NSIS: instala por usuario, sin permisos de administrador)
 *   Linux    RaBit-x86_64.AppImage, RaBit-x86_64.deb, RaBit-x86_64.rpm  (el sufijo sigue a la arquitectura: aarch64 en ARM)
 *
 * Uso: npm run package                 (compila con `tauri build` y copia el resultado)
 *      npm run package -- --skip-build (solo copia lo ya compilado)
 *      RABIT_TARGET_DIR=C:/ruta npm run package   (compila en otra carpeta: útil si rabit.exe está abierta; en Linux, para no mezclar con otra compilación)
 *
 * Por qué se renombra después de compilar y no con `productName`: el nombre del producto es el que ve el usuario
 * en la ventana, el menú Inicio y «Aplicaciones»; el nombre del archivo es solo del instalador.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targetDir = process.env.RABIT_TARGET_DIR ?? join(root, "src-tauri", "target");
const bundle = join(targetDir, "release", "bundle");
const out = join(root, "installers");
const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
/** [carpeta de bundle, extensión, nombre final] de lo que genera esta plataforma. */
const outputs =
  process.platform === "win32"
    ? [["nsis", ".exe", "RaBit-Setup.exe"]]
    : process.platform === "linux"
      ? [
          ["appimage", ".appimage", `RaBit-${arch}.AppImage`],
          ["deb", ".deb", `RaBit-${arch}.deb`],
          ["rpm", ".rpm", `RaBit-${arch}.rpm`],
        ]
      : [];
if (outputs.length === 0) {
  console.error(`npm run package solo genera instaladores para Windows y Linux (esta plataforma: ${process.platform}).`);
  process.exit(1);
}

if (!process.argv.includes("--skip-build")) {
  // `createUpdaterArtifacts` (tauri.conf.json) exige la clave privada de firma. En un build local sin ella se desactiva
  // solo para esta ejecución; los instaladores funcionan igual (el release oficial los firma, ver docs/UPDATES.md).
  const args = ["run", "tauri", "build"];
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
    const cfg = join(tmpdir(), "rabit-local-build.json");
    writeFileSync(cfg, JSON.stringify({ bundle: { createUpdaterArtifacts: false } }));
    args.push("--", "--config", cfg);
    console.log("Sin TAURI_SIGNING_PRIVATE_KEY: build local sin artefactos del actualizador.");
  }
  // en Linux no hace falta construir los .rpm si falta `rpmbuild`: tauri avisa y sigue con los demás
  const r = spawnSync("npm", args, { cwd: root, stdio: "inherit", shell: true, env: { ...process.env, CARGO_TARGET_DIR: targetDir } });
  if (r.status !== 0) {
    console.error("\n`tauri build` falló. En Windows, si RaBit está abierta, ciérrala (no deja sobrescribir rabit.exe en uso).");
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
for (const [dir, ext, name] of outputs) {
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
if (copied < outputs.length) console.warn(`Solo ${copied} de ${outputs.length} instaladores generados.`);
