import { open, nav, metrics, SP } from "./helpers.mjs";
const { b, p, errors } = await open();
const long = "W".repeat(60),
  words = "Quarterly planning meeting with the whole extended team about budgets";
await p.evaluate(
  async ({ long, words }) => {
    const d = window.__rabit.useData.getState();
    const t = new Date();
    const iso = (n) => {
      const x = new Date(t);
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };
    for (let i = 0; i < 24; i++)
      await d.addEvent({
        title: i === 0 ? long : `Event ${i} ${words}`.slice(0, 60),
        date: iso(0),
        start: `${String(7 + (i % 12)).padStart(2, "0")}:00`,
        end: `${String(8 + (i % 12)).padStart(2, "0")}:00`,
        color: ["#17b866", "#4b7fd6", "#8a6fd6", "#2aa6a0", "#c98a1e", "#a8443a"][i % 6],
      });
    for (let i = 0; i < 4; i++) await d.addEvent({ title: `Overlap ${i}`, date: iso(1), start: "10:00", end: "11:30" });
    for (let i = 0; i < 40; i++)
      await d.addTask({ title: i === 0 ? long : `Task number ${i} ${words}`.slice(0, 60), date: iso((i % 5) - 1), time: i % 2 ? "09:30" : null, important: i % 7 === 0 });
    for (let i = 0; i < 30; i++)
      await d.addNote({ title: i === 0 ? long : `Note ${i} ${words}`.slice(0, 60), body: "Lorem ipsum dolor sit amet ".repeat(30), pinned: i % 9 === 0 });
    for (let i = 0; i < 6; i++) await d.addRoutine({ title: `Routine ${i} ${words}`.slice(0, 40), day: i % 7, start: "08:00", end: "09:30", color: "#2aa6a0" });
  },
  { long, words },
);
await p.waitForTimeout(800);
for (const [n, f] of [
  ["Home", "home"],
  ["Calendar", "cal-month"],
  ["Routine", "routine"],
  ["Quick Notes", "notes"],
]) {
  await nav(p, n);
  console.log(n, JSON.stringify(await metrics(p)));
  await p.screenshot({ path: `${SP}/qa1-${f}.png` });
}
await nav(p, "Calendar");
for (const v of ["WEEK", "DAY", "YEAR"]) {
  await p.getByText(v, { exact: true }).first().click();
  await p.waitForTimeout(900);
  console.log("cal", v, JSON.stringify(await metrics(p)));
  await p.screenshot({ path: `${SP}/qa1-cal-${v}.png` });
}
console.log("errors:", JSON.stringify(errors.slice(0, 5)));
await b.close();
