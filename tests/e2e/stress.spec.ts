import { expect, test } from "@playwright/test";

/** Parte del store que usan estas pruebas (expuesto solo en desarrollo como window.__rabit). */
interface DevStore {
  addEvent: (e: { title: string; date: string; start?: string; end?: string }) => Promise<unknown>;
  addTask: (t: { title: string; date?: string; time?: string | null }) => Promise<unknown>;
  addNote: (n: { title: string; body?: string }) => Promise<unknown>;
}

async function boot(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.waitForFunction(() => !!(window as unknown as { __rabit?: unknown }).__rabit);
}
const scale = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const el = document.querySelector(".rb-noscroll")!.firstElementChild as HTMLElement;
    return el.getBoundingClientRect().width / el.offsetWidth;
  });

test("lots of items never shrink or stretch the layout (lists scroll inside their cards)", async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(800);
  const base = await scale(page);
  await page.evaluate(async () => {
    const d = (window as unknown as { __rabit: { useData: { getState: () => DevStore } } }).__rabit.useData.getState();
    const iso = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 30; i++) await d.addEvent({ title: `Event ${i}`, date: iso, start: "09:00", end: "10:00" });
    for (let i = 0; i < 40; i++) await d.addTask({ title: `Task ${i}`, date: iso, time: "10:00" });
    for (let i = 0; i < 20; i++) await d.addNote({ title: `Note ${i}`, body: "x ".repeat(100) });
  });
  await page.waitForTimeout(800);
  expect(await scale(page)).toBeGreaterThan(base * 0.95);
  for (const name of ["Calendar", "Routine", "Quick Notes"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(700);
    expect(await scale(page)).toBeGreaterThan(base * 0.8);
  }
});

test("holding a card does not make the page re-layout (no shaking)", async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const d = (window as unknown as { __rabit: { useData: { getState: () => DevStore } } }).__rabit.useData.getState();
    for (let i = 0; i < 3; i++) await d.addNote({ title: `Note ${i}`, body: "hello" });
    for (let i = 0; i < 4; i++) await d.addTask({ title: `Task ${i}` });
  });
  await page.waitForTimeout(800);
  const card = page.getByRole("button", { name: /Note \d/ }).first();
  const b = (await card.boundingBox())!;
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  const layout = () =>
    page.evaluate(() => {
      const el = document.querySelector(".rb-noscroll")!.firstElementChild as HTMLElement;
      return `${el.style.transform}|${el.style.width}|${el.style.height}`;
    });
  const start = await layout();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.documentElement.dataset.swiping)).toBe("1");
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x - i * 12, y);
    expect(await layout()).toBe(start);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.dataset.swiping)).toBeUndefined();
});
