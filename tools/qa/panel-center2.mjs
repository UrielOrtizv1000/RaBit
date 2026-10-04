import { open, SP } from "./helpers.mjs";
for (const [w, h] of [
  [1600, 980],
  [1280, 800],
  [1920, 1080],
]) {
  const { b, p } = await open({ w, h });
  await p.evaluate(async () => {
    const d = window.__rabit.useData.getState();
    await d.addEvent({ title: "E", date: new Date().toISOString().slice(0, 10) });
    await d.addNote({ title: "N", body: "b" });
    await d.addTask({ title: "T" });
  });
  for (const kind of ["event", "note", "task"]) {
    for (const mode of ["existing", "new"]) {
      await p.evaluate(
        ([k, m]) => {
          const d = window.__rabit.useData.getState();
          const list = k === "event" ? d.events : k === "note" ? d.notes : d.tasks;
          window.__rabit.useUi.getState().openPanel(k, m === "new" ? null : list[0].id);
        },
        [kind, mode],
      );
      await p.waitForTimeout(900);
      const r = await p.evaluate(() => {
        const o = document.querySelector("div[style*='z-index: 58']");
        const d = o.firstElementChild.getBoundingClientRect();
        const win = { w: window.innerWidth, h: window.innerHeight };
        const c = o.getBoundingClientRect();
        return {
          top: Math.round(d.top - c.top),
          bottom: Math.round(c.bottom - d.bottom),
          left: Math.round(d.left - c.left),
          right: Math.round(c.right - d.right),
          winCenterY: Math.round((d.top + d.bottom) / 2) + 0,
          winH: win.h,
        };
      });
      console.log(`${w}x${h} ${kind}/${mode}`, JSON.stringify(r));
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    }
  }
  await b.close();
}
