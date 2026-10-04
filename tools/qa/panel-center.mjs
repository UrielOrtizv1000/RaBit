import { open, SP } from "./helpers.mjs";
for (const [w, h] of [
  [1600, 980],
  [1280, 800],
]) {
  const { b, p } = await open({ w, h });
  await p.evaluate(() => window.__rabit.useUi.getState().openPanel("event", null));
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('[role="dialog"]') || document.querySelector("div[style*='z-index: 58'] > div");
    const o = document.querySelector("div[style*='z-index: 58']");
    const a = d.getBoundingClientRect(),
      c = o.getBoundingClientRect();
    return { top: Math.round(a.top - c.top), bottom: Math.round(c.bottom - a.bottom), h: Math.round(a.height) };
  });
  console.log(w + "x" + h, JSON.stringify(r));
  await p.screenshot({ path: `${SP}/pc-${w}.png` });
  await b.close();
}
