import { open, nav, metrics, SP } from "./helpers.mjs";
const { b, p, errors } = await open();
const iso = (n) => {
  const x = new Date();
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const res = await p.evaluate(async () => {
  const d = window.__rabit.useData.getState();
  const out = [];
  const t = async (name, fn) => {
    try {
      await fn();
      out.push("ok " + name);
    } catch (e) {
      out.push("FAIL " + name + ": " + e.message);
    }
  };
  const iso = (n) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  };
  await t("event end before start", () => d.addEvent({ title: "Backwards", date: iso(0), start: "15:00", end: "14:00" }));
  await t("event crossing midnight", () => d.addEvent({ title: "Overnight", date: iso(0), start: "23:30", end: "00:30" }));
  await t("event zero length", () => d.addEvent({ title: "Zero", date: iso(0), start: "12:00", end: "12:00" }));
  await t("empty title event", () => d.addEvent({ title: "", date: iso(0) }));
  await t("space title task", () => d.addTask({ title: "   ", date: iso(0) }));
  await t("empty note", () => d.addNote({ title: "", body: "" }));
  await t("far past/future", async () => {
    await d.addTask({ title: "Past", date: "1999-01-01" });
    await d.addTask({ title: "Future", date: "2099-12-31" });
    await d.addEvent({ title: "Far", date: "2099-12-31", start: "09:00", end: "10:00" });
  });
  await t("yearly feb 29", () => d.addEvent({ title: "Leap", date: "2024-02-29", recurring: true, repeat: "yearly" }));
  await t("monthly day 31", () => d.addEvent({ title: "Day31", date: "2026-01-31", recurring: true, repeat: "monthly" }));
  await t("routine zero/backwards", async () => {
    await d.addRoutine({ title: "RBack", day: 0, start: "10:00", end: "09:00" });
    await d.addRoutine({ title: "RZero", day: 1, start: "10:00", end: "10:00" });
    await d.addRoutine({ title: "RLate", day: 2, start: "23:00", end: "23:59" });
  });
  await t("html/script in title", () => d.addNote({ title: "<img src=x onerror=alert(1)>", body: "<script>alert(1)</script>" }));
  await t("emoji + rtl title", () => d.addTask({ title: "😀🎉 שלום مرحبا", date: iso(0) }));
  await t("update non-existent", async () => {
    await d.updateTask("nope", { title: "x" });
    await d.deleteEvent("nope");
    await d.restoreNote("nope");
  });
  await t("import garbage", async () => {
    try {
      await d.importAll({ app: "x" });
    } catch {
      /* esperado */
    }
  });
  await t("import partial backup", async () => {
    const b = d.exportAll();
    await window.__rabit.useData.getState().importAll({ ...b, routine: [], tasks: b.tasks });
  });
  return out;
});
console.log(res.join("\n"));
for (const n of ["Home", "Calendar", "Routine", "Quick Notes", "Savings"]) {
  await nav(p, n);
  console.log(n, JSON.stringify(await metrics(p).catch((e) => e.message)));
  await p.screenshot({ path: `${SP}/qa3-${n.replace(" ", "")}.png` });
}
await nav(p, "Calendar");
for (const v of ["WEEK", "DAY", "YEAR"]) {
  await p.getByText(v, { exact: true }).first().click();
  await p.waitForTimeout(700);
}
await p.getByText("MONTH", { exact: true }).first().click();
for (let i = 0; i < 40; i++) {
  await p
    .locator("button, [role=button]")
    .filter({ hasText: "›" })
    .first()
    .click()
    .catch(() => {});
}
await p.waitForTimeout(500);
console.log("errors:", JSON.stringify(errors.slice(0, 6)));
await b.close();
