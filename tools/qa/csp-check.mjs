/**
 * Comprueba que la interfaz compilada (dist/) funciona bajo la CSP de tauri.conf.json: sirve dist/ con esa CSP
 * como cabecera y abre la app con Playwright buscando violaciones. (En el navegador se usa sql.js, que necesita
 * 'wasm-unsafe-eval'; en la app de escritorio no se carga, por eso solo se añade aquí.)
 * Uso: npm run build && node tools/qa/csp-check.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";

const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const csp = conf.app.security.csp + "; script-src 'self' 'wasm-unsafe-eval'";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const server = createServer((req, res) => {
  const p = join("dist", decodeURIComponent((req.url ?? "/").split("?")[0]));
  const file = existsSync(p) && statSync(p).isFile() ? p : join("dist", "index.html");
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Content-Security-Policy": csp });
  res.end(readFileSync(file));
}).listen(4173);

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on("console", (m) => {
  if (/content security policy|refused to/i.test(m.text())) problems.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => problems.push("PAGEERR " + e.message.slice(0, 160)));
await page.goto("http://localhost:4173/");
await page.waitForSelector("input", { timeout: 15000 });
await page.waitForTimeout(1500);
const fontsOk = await page.evaluate(() => document.fonts.check("12px Silkscreen") && document.fonts.check("12px 'Plus Jakarta Sans'"));
console.log(problems.length ? "VIOLACIONES:\n" + problems.join("\n") : "CSP OK: sin violaciones", "| fuentes cargadas:", fontsOk);
await browser.close();
server.close();
process.exit(problems.length ? 1 : 0);
