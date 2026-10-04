import { chromium } from "@playwright/test";
export const SP = process.env.QA_OUT;
export async function open(opts = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: opts.w ?? 1600, height: opts.h ?? 980 }, locale: opts.locale ?? "en-US" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("PAGEERR " + e.message.slice(0, 200)));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 160));
  });
  await p.goto("http://localhost:1420/");
  await p.locator("input").first().fill("QA");
  await p.locator("input").first().press("Enter");
  await p.waitForTimeout(3600);
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => !!window.__rabit, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  return { b, p, errors };
}
export const nav = async (p, name) => {
  await p.getByRole("button", { name, exact: true }).click();
  await p.mouse.move(800, 300);
  await p.waitForTimeout(1200);
};
/** métricas: ¿algo se sale de la zona segura / hay scroll / solapes? */
export const metrics = (p) =>
  p.evaluate(() => {
    const box = document.querySelector(".rb-noscroll");
    const el = box.firstElementChild;
    const z = el.getBoundingClientRect().width / el.offsetWidth;
    let maxB = 0,
      maxR = 0;
    el.querySelectorAll("*").forEach((c) => {
      if (c.dataset && c.dataset.swipeLabel) return;
      const r = c.getBoundingClientRect();
      if (r.height > 40 && r.width > 120) {
        if (r.bottom <= window.innerHeight + 400 && r.bottom > maxB) maxB = r.bottom;
        if (r.right > maxR) maxR = r.right;
      }
    });
    return { z: +z.toFixed(3), bottomGap: Math.round(window.innerHeight - maxB), rightGap: Math.round(window.innerWidth - maxR), overflow: getComputedStyle(box).overflow };
  });
