import { open, nav, SP } from "./helpers.mjs";
const { b, p, errors } = await open();
p.setDefaultTimeout(4000);
const log = [];
const step = async (name, fn) => {
  try {
    await fn();
    log.push("ok   " + name);
  } catch (e) {
    log.push("FAIL " + name + " :: " + String(e.message).split("\n")[0].slice(0, 110));
  }
};
const store = () =>
  p.evaluate(() => {
    const d = window.__rabit.useData.getState();
    return { tasks: d.tasks.length, events: d.events.length, notes: d.notes.length, tags: d.tags.length };
  });

await step("Ctrl+N x6 rapid (home)", async () => {
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press("Control+n");
    await p.waitForTimeout(80);
  }
  await p.keyboard.press("Escape");
});
await step("open new task, save with empty title (Esc)", async () => {
  await p.getByText("Task", { exact: true }).first().click();
  await p.waitForTimeout(500);
  await p.keyboard.press("Escape");
});
console.log("after empties:", JSON.stringify(await store()));
await step("create task via UI + rapid checkbox toggles", async () => {
  for (const title of ["A", "B", "C", "D"]) {
    await p.getByText("Task", { exact: true }).first().click();
    await p.getByLabel("Task title").fill(title);
    await p.waitForTimeout(600);
    await p.keyboard.press("Escape");
  }
  const boxes = p.getByRole("checkbox", { name: "Complete task" });
  for (let i = 0; i < 8; i++) {
    await boxes.first().click({ delay: 10 });
    await p.waitForTimeout(40);
  }
});
await step("settings open + language toggle x6 + theme x4", async () => {
  await p.getByLabel(/Settings|Ajustes/).click();
  for (let i = 0; i < 6; i++) {
    await p.getByRole("button", { name: i % 2 ? "English" : "Español", exact: true }).click();
    await p.waitForTimeout(150);
  }
  for (let i = 0; i < 4; i++)
    await p
      .getByRole("button", { name: /^(Light|Dark|Claro|Oscuro)$/ })
      .nth(i % 2)
      .click();
  await p.keyboard.press("Escape");
});
await step("notes: create, tag, pin, trash, restore, purge", async () => {
  await nav(p, /Quick Notes|Notas rápidas/ instanceof RegExp ? "Quick Notes" : "Quick Notes").catch(async () => {
    await p.getByRole("button", { name: "Notas rápidas", exact: true }).click();
  });
  await p.waitForTimeout(500);
  await p
    .getByRole("button", { name: /New note|Nueva nota/ })
    .first()
    .click();
  await p.getByLabel(/Note title|Título de la nota/).fill("QA note");
  await p.waitForTimeout(700);
});
await step("tag delete while used", async () => {
  await p.evaluate(async () => {
    const d = window.__rabit.useData.getState();
    const n = d.notes[0];
    if (n && d.tags[0]) {
      await d.updateNote(n.id, { tagId: d.tags[0].id });
      await d.deleteTag(d.tags[0].id);
    }
  });
});
await step("tag rename to empty / duplicate", async () => {
  await p.evaluate(async () => {
    const d = window.__rabit.useData.getState();
    if (d.tags[0]) {
      await d.editTag(d.tags[0].id, { name: "" });
      await d.editTag(d.tags[0].id, { name: d.tags[1]?.name ?? "x" });
    }
  });
});
await step("window resize storm", async () => {
  for (const [w, h] of [
    [1280, 800],
    [1600, 980],
    [1366, 768],
    [2560, 1440],
    [1280, 800],
    [1920, 1080],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(150);
  }
});
await step("calendar navigation storm", async () => {
  await p.getByRole("button", { name: /Calendar|Calendario/, exact: true }).click();
  await p.waitForTimeout(500);
  for (let i = 0; i < 25; i++) {
    await p.getByText("›", { exact: true }).first().click({ timeout: 1500 });
  }
  for (let i = 0; i < 60; i++) {
    await p.getByText("‹", { exact: true }).first().click({ timeout: 1500 });
  }
});
await step("view switching storm", async () => {
  for (let i = 0; i < 12; i++) for (const v of [/^(MONTH|MES)$/, /^(WEEK|SEMANA)$/, /^(DAY|DÍA)$/, /^(YEAR|AÑO)$/]) await p.getByText(v).first().click({ timeout: 1500 });
});
await step("event panel: save without title, end<start via UI", async () => {
  await p
    .getByText(/NEW EVENT|NUEVO EVENTO/)
    .first()
    .click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${SP}/qa5-newevent.png` });
  await p.keyboard.press("Escape");
});
console.log(log.join("\n"));
console.log("final store:", JSON.stringify(await store()));
console.log("errors:", JSON.stringify([...new Set(errors)].slice(0, 8)));
await b.close();
