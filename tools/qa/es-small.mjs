import { open, nav, metrics, SP } from "./helpers.mjs";
const { b, p, errors } = await open({ w: 1280, h: 800, locale: "es-MX" });
await p.evaluate(async () => {
  const m = await import("/src/services/seed.ts");
  await m.seedDemoData();
  await window.__rabit.useData.getState().updateSettings({ theme: "dark" });
});
await p.waitForTimeout(1200);
for (const n of ["Inicio", "Calendario", "Rutina", "Notas rápidas"]) {
  await p.getByRole("button", { name: n, exact: true }).click();
  await p.mouse.move(800, 300);
  await p.waitForTimeout(1200);
  console.log(n, JSON.stringify(await metrics(p)));
  await p.screenshot({ path: `${SP}/qa6-${n.replace(/\W/g, "")}.png` });
}
await p.evaluate(() => {
  const u = window.__rabit.useUi.getState();
  const e = window.__rabit.useData.getState().events[1];
  u.openPanel("event", e.id);
});
await p.waitForTimeout(900);
await p.screenshot({ path: `${SP}/qa6-panel.png` });
console.log("errors", JSON.stringify(errors.slice(0, 4)));
await b.close();
