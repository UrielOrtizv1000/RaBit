/**
 * Imprime las notas de una versión tomándolas de CHANGELOG.md (la sección «## <versión>»).
 * Son las que el workflow de publicación pone en el release y la app muestra como «What's new».
 * Uso: node scripts/release-notes.mjs v1.3.0   (si no hay sección, imprime un texto genérico)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const version = (process.argv[2] ?? "").replace(/^refs\/tags\//, "").replace(/^v/, "");
const changelog = readFileSync(fileURLToPath(new URL("../CHANGELOG.md", import.meta.url)), "utf8");

const lines = changelog.split(/\r?\n/);
const start = lines.findIndex((l) => new RegExp(`^##\\s+v?${version.replace(/\./g, "\\.")}(\\s|$)`).test(l));
let body = [];
if (start >= 0) {
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  body = lines.slice(start + 1, end < 0 ? undefined : end);
}
const text = body.join("\n").trim();
console.log(text || `RaBit ${version || ""}`.trim());
