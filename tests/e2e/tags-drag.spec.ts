import { test, expect } from "@playwright/test";

// The first-run tutorial overlays the app; these tests are not about it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rabit.tutorial.seen", "off"));
});
test("note tags stay on one row and can be dragged sideways", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/?seed");
  await page.getByPlaceholder("How should RaBit call you?").fill("T");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.mouse.click(58, 534 * 0.8 + 40);
  await page.waitForTimeout(600);
  await page.getByText("Project ideas").first().click();
  for (const n of ["Alpha long tag", "Beta long tag", "Gamma long tag", "Delta long tag"]) {
    await page.getByRole("button", { name: "New tag" }).click();
    await page.getByLabel("Tag name").fill(n);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
  }
  const g = page.getByRole("radiogroup", { name: "Tag" });
  const box = (await g.boundingBox())!;
  expect(box.height).toBeLessThan(40); // una sola fila
  const before = await g.evaluate((e) => e.scrollLeft);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const after = await g.evaluate((e) => e.scrollLeft);
  expect(after).toBeGreaterThan(before);
});
