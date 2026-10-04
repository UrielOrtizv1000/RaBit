import { open } from "./helpers.mjs";
const { b, p, errors } = await open();
await p.evaluate(async () => {
  const d = window.__rabit.useData.getState();
  for (let i = 0; i < 4; i++) await d.addNote({ title: "Note " + i, body: "hello world ".repeat(10) });
  for (let i = 0; i < 6; i++) await d.addTask({ title: "Task " + i });
});
await p.waitForTimeout(1500);
const zs = [];
const sample = async () =>
  zs.push(
    await p.evaluate(() => {
      const el = document.querySelector(".rb-noscroll").firstElementChild;
      return [el.style.transform, el.style.width, el.style.height].join("|");
    }),
  );
const card = p.getByRole("button", { name: /Note 3|Note 2|Note 1|Note 0/ }).first();
const bb = await card.boundingBox();
const x = bb.x + bb.width * 0.5,
  y = bb.y + bb.height / 2;
await p.mouse.move(x, y);
await p.mouse.down();
await p.waitForTimeout(150);
await sample();
await p.waitForTimeout(250);
for (let i = 1; i <= 12; i++) {
  await p.mouse.move(x - i * 14, y);
  await p.waitForTimeout(60);
  await sample();
}
await p.mouse.up();
await p.waitForTimeout(800);
await sample();
console.log("distinct layout states during gesture:", new Set(zs).size);
console.log([...new Set(zs)].slice(0, 6));
console.log("errors", errors.slice(0, 3));
await b.close();
