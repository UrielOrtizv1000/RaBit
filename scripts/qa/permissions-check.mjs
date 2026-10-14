/**
 * Prueba REAL de los permisos de Tauri (src-tauri/capabilities/default.json) sobre el ejecutable compilado.
 * En el navegador los permisos no se ejercitan, así que una prueba de interfaz no basta: aquí se lanza `rabit.exe`
 * (con otro identificador, `app.rabit.permtest`, para no tocar los datos del RaBit real), se maneja por CDP y se
 * comprueba que:
 *   - todo lo que la app usa sigue permitido (base de datos, ventana, notificaciones, actualizador, comando propio…),
 *   - todo lo que no usa está denegado (ACL), incluida la lectura/escritura de archivos y los diálogos,
 *   - escribir un respaldo ya no dice «not allowed» (solo el alcance bloquea rutas arbitrarias; la ruta que elige el
 *     usuario en «Guardar» la agrega el plugin de diálogo),
 *   - los botones de la barra de título y el cierre funcionan sin comandos denegados.
 * Uso:   npm run qa:permissions                    (compila la build de pruebas y la prueba; ~2 min)
 *        npm run qa:permissions -- --skip-build    (reutiliza el ejecutable ya compilado)
 * Solo Windows (WebView2). Con RABIT_TARGET_DIR=ruta compila en otra carpeta y NO pisa `target/release/rabit.exe`;
 * si no, ese ejecutable queda siendo la build de pruebas: vuelve a compilar con `npm run package`.
 * Limitación: el diálogo nativo «Guardar» no se automatiza (sale en pantalla) y `process:allow-restart` no se
 * ejercita (reiniciaría la app): ambos se comprueban por la tabla de permisos (tests/capabilities.test.ts).
 */
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  console.log("Esta prueba solo corre en Windows (necesita WebView2). Omitida.");
  process.exit(0);
}

const root = fileURLToPath(new URL("../..", import.meta.url));
const targetDir = process.env.RABIT_TARGET_DIR ?? join(root, "src-tauri", "target");
const exe = join(targetDir, "release", "rabit.exe");
const PORT = 9333;
const ID = "app.rabit.permtest";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wipe = async () => {
  for (const base of [process.env.APPDATA, process.env.LOCALAPPDATA]) {
    if (!base) continue;
    for (let i = 0; i < 10; i++) {
      try {
        rmSync(join(base, ID), { recursive: true, force: true });
        break;
      } catch {
        await sleep(500); // Windows tarda un instante en soltar los archivos de un proceso recién cerrado
      }
    }
  }
};

// --- seguridad: nunca tocar un RaBit real que esté abierto
const running = spawnSync("tasklist", ["/FI", "IMAGENAME eq rabit.exe", "/NH"], { encoding: "utf8" }).stdout ?? "";
if (/rabit\.exe/i.test(running)) {
  console.error("Hay un rabit.exe abierto (podría ser tu RaBit real). Ciérralo y vuelve a ejecutar.");
  process.exit(2);
}

if (!process.argv.includes("--skip-build")) {
  const cfg = join(tmpdir(), "rabit-permtest.json");
  writeFileSync(cfg, JSON.stringify({ identifier: ID, bundle: { createUpdaterArtifacts: false } }));
  console.log("Compilando la build de pruebas (identificador " + ID + ")…");
  const r = spawnSync("npm", ["run", "tauri", "build", "--", "--no-bundle", "--config", cfg], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CARGO_TARGET_DIR: targetDir },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// --- lo que la app usa (debe estar permitido) y lo que no (debe estar denegado). Las ventanas inexistentes
// responden «window not found» DESPUÉS de comprobar el permiso, así que no hay efectos secundarios.
const ghost = { label: "no-existe" };
const rid = { rid: 987654 };
const USED = {
  "app:version": ["plugin:app|version"],
  "sql:load": ["plugin:sql|load", { db: "sqlite:rabit.db" }],
  "sql:select": ["plugin:sql|select", { db: "sqlite:rabit.db", query: "SELECT 1", values: [] }],
  "sql:execute": ["plugin:sql|execute", { db: "sqlite:rabit.db", query: "SELECT 1", values: [] }],
  "event:listen": ["plugin:event|listen", { event: "x", target: { kind: "Any" }, handler: 0 }],
  "event:unlisten": ["plugin:event|unlisten", { event: "x", eventId: 1 }],
  "window:start_dragging": ["plugin:window|start_dragging", ghost],
  "window:minimize": ["plugin:window|minimize", ghost],
  "window:toggle_maximize": ["plugin:window|toggle_maximize", ghost],
  "window:internal_toggle_maximize": ["plugin:window|internal_toggle_maximize", ghost],
  "window:close": ["plugin:window|close", ghost],
  "window:destroy": ["plugin:window|destroy", ghost],
  "notification:is_permission_granted": ["plugin:notification|is_permission_granted"],
  "notification:request_permission": ["plugin:notification|request_permission"],
  "notification:notify": ["plugin:notification|notify", {}],
  "updater:check": ["plugin:updater|check", {}],
  "updater:download": ["plugin:updater|download", rid],
  "updater:install": ["plugin:updater|install", rid],
  "dialog:save": null, // abre un diálogo nativo: se comprueba por la tabla de permisos
  "fs:write_text_file (el permiso; la ruta la limita el alcance)": [
    "plugin:fs|write_text_file",
    new TextEncoder().encode("{}"),
    { headers: { path: encodeURIComponent(join(tmpdir(), "rabit-permtest.json")), options: "{}" } },
  ],
  "set_glass (comando propio)": ["set_glass", { enabled: true }],
};
const DENIED = {
  "updater:download_and_install": ["plugin:updater|download_and_install", rid],
  "resources:close": ["plugin:resources|close", rid],
  "window:is_maximized": ["plugin:window|is_maximized", ghost],
  "window:title": ["plugin:window|title", ghost],
  "window:inner_size": ["plugin:window|inner_size", ghost],
  "window:theme": ["plugin:window|theme", ghost],
  "window:current_monitor": ["plugin:window|current_monitor", ghost],
  "webview:internal_toggle_devtools": ["plugin:webview|internal_toggle_devtools", { label: "no-existe" }],
  "app:name": ["plugin:app|name"],
  "app:identifier": ["plugin:app|identifier"],
  "event:emit": ["plugin:event|emit", { event: "x" }],
  "path:resolve_directory": ["plugin:path|resolve_directory", { directory: 1 }],
  "image:from_path": ["plugin:image|from_path", { path: "x" }],
  "menu:new": ["plugin:menu|new", {}],
  "tray:new": ["plugin:tray|new", {}],
  "notification:show": ["plugin:notification|show", {}],
  "notification:cancel": ["plugin:notification|cancel", {}],
  "notification:create_channel": ["plugin:notification|create_channel", {}],
  "sql:close": ["plugin:sql|close", { db: "sqlite:no-existe.db" }],
  "fs:read_text_file": ["plugin:fs|read_text_file", { path: "x" }],
  "fs:mkdir": ["plugin:fs|mkdir", { path: "x" }],
  "fs:remove": ["plugin:fs|remove", { path: "x" }],
  "log:log": ["plugin:log|log", {}],
  "dialog:open": ["plugin:dialog|open", { options: {} }],
  "dialog:message": ["plugin:dialog|message", { message: "x" }],
  "dialog:ask": ["plugin:dialog|ask", { message: "x" }],
  "dialog:confirm": ["plugin:dialog|confirm", { message: "x" }],
};

await wipe();
const child = spawn(exe, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT} --lang=en-US` }, stdio: "ignore" });
let exited = false;
child.on("exit", () => (exited = true));
const failures = [];
const check = (ok, text) => {
  console.log(`${ok ? "✔" : "✘"} ${text}`);
  if (!ok) failures.push(text);
};

let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
    } catch {
      /* todavía arrancando */
    }
    await sleep(500);
  }
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  let page;
  for (let i = 0; i < 40 && !page; i++) {
    page = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => /tauri|localhost/.test(p.url()));
    if (!page) await sleep(500);
  }
  if (!page) throw new Error("No se encontró la ventana de la app");
  page.setDefaultTimeout(20000);

  // 1) base de datos real: onboarding → recargar → la sesión debe seguir guardada
  const nameBox = page.getByPlaceholder("How should RaBit call you?");
  const calBtn = page.getByRole("button", { name: "Calendar", exact: true });
  try {
    await nameBox.or(calBtn).first().waitFor({ timeout: 30000 });
  } catch (e) {
    console.log("La app no llegó a mostrar el onboarding ni Calendar. Texto visible:", JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 300)));
    throw e;
  }
  // sin recargar aquí: dos arranques simultáneos intentarían la misma migración de la base a la vez
  await page.evaluate(() => localStorage.setItem("rabit.tutorial.seen", "off"));
  await nameBox.fill("PermTest");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await calBtn.waitFor();
  await page.reload();
  await nameBox.or(calBtn).first().waitFor({ timeout: 30000 });
  check(await calBtn.isVisible(), "la base de datos funciona: la sesión sigue guardada tras recargar");

  // 2) sondas: «not allowed» = permiso ausente; cualquier otro resultado = permitido
  const probe = (cmd, args, opts) =>
    page.evaluate(
      async ([cmd, args, opts]) => {
        const call = window.__TAURI_INTERNALS__.invoke(cmd, args ?? {}, opts);
        const timeout = new Promise((r) => setTimeout(() => r("__abrió_algo__"), 4000));
        try {
          const r = await Promise.race([call, timeout]);
          return { allowed: true, note: r === "__abrió_algo__" ? "no respondió en 4 s (¿abrió un diálogo?)" : "" };
        } catch (e) {
          const m = String(e?.message ?? e);
          return { allowed: !/not allowed/i.test(m), note: m.replace(/\s+/g, " ").slice(0, 100) };
        }
      },
      [cmd, args, opts],
    );
  for (const [name, spec] of Object.entries(USED)) {
    if (!spec) continue;
    const r = await probe(...spec);
    check(r.allowed, `usado y permitido: ${name}`);
  }
  for (const [name, spec] of Object.entries(DENIED)) {
    const r = await probe(...spec);
    check(!r.allowed, `no usado y denegado: ${name}${r.allowed ? " (¡SIGUE PERMITIDO! " + r.note + ")" : ""}`);
  }

  // 3) barra de título: botones y doble clic en la barra, sin comandos denegados
  await page.evaluate(() => {
    window.__denied = [];
    const orig = window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__);
    window.__TAURI_INTERNALS__.invoke = async (...a) => {
      try {
        return await orig(...a);
      } catch (e) {
        if (/not allowed/i.test(String(e?.message ?? e))) window.__denied.push(String(a[0]));
        throw e;
      }
    };
  });
  await page.getByRole("button", { name: "Maximize" }).click();
  await sleep(500);
  await page.getByRole("button", { name: "Maximize" }).click();
  await sleep(500);
  for (let i = 0; i < 2; i++) {
    await page
      .locator("[data-tauri-drag-region]")
      .first()
      .dblclick({ position: { x: 300, y: 8 } });
    await sleep(700);
  }
  await page.getByRole("button", { name: "Minimize" }).click();
  await sleep(700);
  const denied = await page.evaluate(() => window.__denied);
  check(denied.length === 0, `barra de título (maximizar, doble clic, minimizar) sin comandos denegados${denied.length ? ": " + denied.join(", ") : ""}`);
  await page
    .getByRole("button", { name: "Close" })
    .click({ timeout: 5000 })
    .catch(() => undefined);
  for (let i = 0; i < 20 && !exited; i++) await sleep(500);
  check(exited, "el botón Close cierra la app (close + destroy + eventos)");
} catch (e) {
  check(false, "la prueba no pudo completarse: " + String(e?.message ?? e).split("\n")[0]);
} finally {
  try {
    await browser?.close();
  } catch {
    /* la app ya cerró */
  }
  if (!exited) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  await sleep(1500);
  await wipe();
}

console.log(failures.length ? `\n${failures.length} comprobación(es) fallaron.` : "\nPermisos correctos: todo lo usado funciona y todo lo demás está denegado.");
if (!process.env.RABIT_TARGET_DIR) console.log("Nota: target/release/rabit.exe ahora es la build de pruebas; vuelve a compilar con `npm run package`.");
process.exit(failures.length ? 1 : 0);
