import { open } from "./helpers.mjs";
import sharp from "sharp";
const { b, p } = await open();
await p.evaluate(async () => {
  const d = window.__rabit.useData.getState();
  for (let i = 0; i < 4; i++) await d.addNote({ title: "Note " + i, body: "hello world ".repeat(10) });
  for (let i = 0; i < 6; i++) await d.addTask({ title: "Task " + i });
});
await p.waitForTimeout(1500);
const card = p.getByRole("button", { name: /Note \d/ }).first();
const bb = await card.boundingBox();
const x = bb.x + bb.width * 0.5,
  y = bb.y + bb.height / 2;
await p.mouse.move(x, y);
await p.mouse.down();
await p.waitForTimeout(350);
for (let i = 1; i <= 8; i++) await p.mouse.move(x - i * 14, y);
const frames = [];
for (let i = 0; i < 6; i++) {
  frames.push(await p.screenshot());
  await p.waitForTimeout(37);
}
await p.mouse.up();
const raws = await Promise.all(frames.map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
const { width: W, height: H, channels: C } = raws[0].info;
// diff fuera del área de la tarjeta (con margen) entre fotogramas consecutivos
const inCard = (px, py) => px > bb.x - 60 && px < bb.x + bb.width + 60 && py > bb.y - 60 && py < bb.y + bb.height + 60;
for (let k = 1; k < raws.length; k++) {
  let diff = 0,
    n = 0;
  for (let py = 0; py < H; py += 2)
    for (let px = 0; px < W; px += 2) {
      if (inCard(px, py)) continue;
      const o = (py * W + px) * C;
      const d = Math.abs(raws[k].data[o] - raws[k - 1].data[o]) + Math.abs(raws[k].data[o + 1] - raws[k - 1].data[o + 1]);
      if (d > 12) diff++;
      n++;
    }
  let x0 = 1e9,
    x1 = 0,
    y0 = 1e9,
    y1 = 0;
  for (let py = 0; py < H; py += 2)
    for (let px = 0; px < W; px += 2) {
      if (inCard(px, py)) continue;
      const o = (py * W + px) * C;
      const d = Math.abs(raws[k].data[o] - raws[k - 1].data[o]) + Math.abs(raws[k].data[o + 1] - raws[k - 1].data[o + 1]);
      if (d > 12) {
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
        y0 = Math.min(y0, py);
        y1 = Math.max(y1, py);
      }
    }
  console.log("frame", k, diff, "bbox", x0, y0, x1, y1, "card", Math.round(bb.x), Math.round(bb.y), Math.round(bb.width), Math.round(bb.height));
}
await b.close();
