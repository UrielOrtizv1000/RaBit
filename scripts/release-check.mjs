/**
 * Comprueba que la versión coincide en package.json, src-tauri/tauri.conf.json y src-tauri/Cargo.toml (y, si se pasa,
 * con el tag: `npm run release:check -- v1.3.0`, o la variable GITHUB_REF_NAME en el workflow de publicación).
 * Termina con código 1 si algo no cuadra.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const read = (p) => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

const pkg = JSON.parse(read("package.json")).version;
const tauri = JSON.parse(read("src-tauri/tauri.conf.json")).version;
// `version = "x"` dentro de [package] (la primera aparición en Cargo.toml)
const cargo = /^\s*version\s*=\s*"([^"]+)"/m.exec(read("src-tauri/Cargo.toml"))?.[1];

const found = { "package.json": pkg, "src-tauri/tauri.conf.json": tauri, "src-tauri/Cargo.toml": cargo };
const tag = (process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "").replace(/^refs\/tags\//, "");
if (tag.startsWith("v")) found[`tag ${tag}`] = tag.slice(1);

const versions = new Set(Object.values(found));
for (const [file, v] of Object.entries(found)) console.log(`${versions.size === 1 ? "✔" : "·"} ${file.padEnd(28)} ${v ?? "(no encontrada)"}`);

if (versions.size !== 1 || versions.has(undefined)) {
  console.error("\nLas versiones no coinciden. Súbelas juntas (package.json, tauri.conf.json y Cargo.toml) antes de publicar.");
  process.exit(1);
}
// El actualizador no debe publicarse con los valores de ejemplo (la app no podría actualizarse y no avisaría).
const conf = read("src-tauri/tauri.conf.json");
const placeholders = ["<OWNER>", "<REPO>", "<PUBLIC_KEY_HERE>"].filter((p) => conf.includes(p));
if (placeholders.length > 0) {
  console.error(`\ntauri.conf.json aún tiene valores de ejemplo del actualizador: ${placeholders.join(", ")}. Ver docs/UPDATES.md.`);
  process.exit(1);
}

console.log(`\nTodo en la versión ${[...versions][0]}.`);
