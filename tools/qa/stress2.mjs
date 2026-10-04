import { open, nav, metrics, SP } from "./helpers.mjs";
const { b, p, errors } = await open();
const long = "W".repeat(60),
  words = "Quarterly planning meeting with the whole extended team about budgets";
await p.evaluate(
  async ({ long, words }) => {
    const d = window.__rabit.useData.getState();
    const iso = (n) => {
      const x = new Date();
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };
    await d.addEvent({
      title: long,
      date: iso(0),
      start: "10:00",
      end: "11:00",
      description: "Long description ".repeat(80),
      remind: { n: 3, unit: "days", freq: "daily" },
      recurring: true,
      repeat: "weekly",
      important: true,
    });
    await d.addNote({ title: long, body: ("Line of text that is rather long and goes on and on without a break. ".repeat(6) + "\n").repeat(40), pinned: true });
    await d.addTask({ title: long, description: "Task desc ".repeat(200), date: iso(0), time: "09:00", important: true });
    for (let i = 0; i < 12; i++) await d.addTag("Tag number " + i + " long name here", ["#17b866", "#4b7fd6"][i % 2]);
    for (let i = 0; i < 40; i++) await d.addEvent({ title: `E${i} ${words}`.slice(0, 40), date: iso((i % 28) - 6), start: "09:00", end: "10:00" });
  },
  { long, words },
);
await p.waitForTimeout(800);
await nav(p, "Quick Notes");
await p
  .locator("[role=button],button")
  .filter({ hasText: /^W{10}/ })
  .first()
  .click()
  .catch(() => {});
await p.waitForTimeout(800);
await p.screenshot({ path: `${SP}/qa2-notes-long.png` });
await nav(p, "Home");
await p.evaluate(() => {
  const u = window.__rabit.useUi.getState();
  const ev = window.__rabit.useData.getState().events[0];
  u.openPanel("event", ev.id);
});
await p.waitForTimeout(900);
await p.screenshot({ path: `${SP}/qa2-event-panel.png` });
await p.evaluate(() => {
  const u = window.__rabit.useUi.getState();
  const t = window.__rabit.useData.getState().tasks[0];
  u.openPanel("task", t.id);
});
await p.waitForTimeout(900);
await p.screenshot({ path: `${SP}/qa2-task-panel.png` });
await p.keyboard.press("Escape");
for (const [w, h] of [
  [1280, 800],
  [2560, 1440],
]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(700);
  for (const n of ["Home", "Calendar", "Routine", "Quick Notes"]) {
    await nav(p, n);
    console.log(w + "x" + h, n, JSON.stringify(await metrics(p)));
    if (n === "Home" || n === "Calendar") await p.screenshot({ path: `${SP}/qa2-${w}-${n}.png` });
  }
}
console.log("errors:", JSON.stringify(errors.slice(0, 5)));
await b.close();
