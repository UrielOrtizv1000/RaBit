/**
 * Genera las capturas del README: Inicio, Calendario, Rutina, Notas rápidas y Ahorros, en tema claro y oscuro, con los datos de ejemplo
 * de la app (Ajustes → Probar RaBit) y una fecha fija para que el resultado sea reproducible.
 * Uso: npm run screenshots   (guarda WebP en docs/assets/screenshots/)
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const OUT = new URL("../../docs/assets/screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PAGES = [
  ["home", "Home"],
  ["calendar", "Calendar"],
  ["routine", "Routine"],
  ["notes", "Quick Notes"],
  ["savings", "Savings"],
] as const;

test("README screenshots", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-14T10:00:00") });
  await page.addInitScript(() => localStorage.setItem("rabit.tutorial.seen", "off"));
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Alex");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).waitFor();
  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByText("Demo data loaded").waitFor({ timeout: 15_000 });
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done", exact: true }).click();
  await page.clock.runFor(6000); // el aviso «Demo data loaded» se va solo
  mkdirSync(OUT, { recursive: true });

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByTitle("Switch light / dark").click();
    for (const [file, label] of PAGES) {
      await page.getByRole("button", { name: label, exact: true }).click();
      if (file === "notes") await page.getByText("Project ideas").first().click(); // abre una nota para mostrar el detalle
      await page.mouse.move(800, 972); // sin etiquetas de hover sobre el menú
      await page.clock.runFor(2000);
      const png = await page.screenshot({ animations: "disabled" });
      await sharp(png).webp({ quality: 88, effort: 6 }).toFile(`${OUT}${file}-${theme}.webp`);
    }
  }
});
