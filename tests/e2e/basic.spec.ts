import { expect, test } from "@playwright/test";

test("onboarding, create a task, complete it and it sinks to the end", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await expect(page.getByText(/GOOD (MORNING|AFTERNOON|EVENING), TESTER!/)).toBeVisible();

  for (const [title, hasTime] of [
    ["First task", "09:00"],
    ["Second task", "10:00"],
  ] as const) {
    await page.getByText("Task", { exact: true }).first().click();
    await page.getByLabel("Task title").fill(title);
    await page.getByLabel("Time (optional)").fill(hasTime);
    await page.waitForTimeout(700); // autosave
    await page.keyboard.press("Escape");
  }

  const boxes = page.getByRole("checkbox", { name: "Complete task" });
  await expect(boxes).toHaveCount(2);
  const y = async (t: string) => (await page.getByText(t, { exact: true }).first().boundingBox())!.y;
  expect(await y("First task")).toBeLessThan(await y("Second task"));

  await boxes.first().click();
  await expect.poll(async () => (await y("First task")) > (await y("Second task")), { timeout: 5000 }).toBe(true);
});
