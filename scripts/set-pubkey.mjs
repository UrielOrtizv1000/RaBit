/**
 * Copia la clave PÚBLICA del actualizador a src-tauri/tauri.conf.json (plugins.updater.pubkey).
 * Solo lee el archivo .pub (público); nunca toca la clave privada.
 * Uso: npm run release:set-pubkey                    (lee ~/.tauri/rabit.key.pub)
 *      npm run release:set-pubkey -- C:/ruta/otra.key.pub
 * Úsalo después de regenerar el par de claves (npx tauri signer generate -w ~/.tauri/rabit.key).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pubPath = process.argv[2] ?? join(homedir(), ".tauri", "rabit.key.pub");
const confPath = fileURLToPath(new URL("../src-tauri/tauri.conf.json", import.meta.url));

const pub = readFileSync(pubPath, "utf8").trim();
if (!pub || pubPath.endsWith(".key")) {
  console.error("Pasa el archivo .pub (la clave pública), nunca la privada.");
  process.exit(1);
}
const conf = readFileSync(confPath, "utf8");
if (!/"pubkey":\s*"[^"]*"/.test(conf)) {
  console.error("No encontré plugins.updater.pubkey en tauri.conf.json.");
  process.exit(1);
}
writeFileSync(confPath, conf.replace(/("pubkey":\s*)"[^"]*"/, `$1${JSON.stringify(pub)}`));
console.log(`✔ pubkey actualizada desde ${pubPath}`);
