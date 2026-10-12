import { expect, test } from "@playwright/test";

// The first-run tutorial overlays the app; this test is not about it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rabit.tutorial.seen", "off"));
});

test("savings: create a jar, fill it, RaBit celebrates, and the jar survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(page.getByText("CREATE YOUR FIRST JAR.")).toBeVisible();

  // incomplete form is refused with a hint
  await page.getByRole("button", { name: "Create new" }).click();
  await page.getByRole("button", { name: "Create jar" }).click();
  await expect(page.getByRole("alert")).toContainText("Add a name and an amount");
  await page.getByLabel("Jar name").fill("Bike");
  await page.getByLabel("Goal amount").fill("100");
  await page.getByRole("button", { name: "Create jar" }).click();
  await expect(page.getByText("Bike jar created")).toBeVisible();
  await expect(page.getByText("$0", { exact: true }).first()).toBeVisible();

  // withdrawing more than saved is refused; filling it completes the goal
  await page.getByRole("button", { name: "Withdraw" }).first().click();
  await page.getByLabel("Amount", { exact: true }).fill("5");
  await page.getByRole("dialog").getByRole("button", { name: "Withdraw" }).last().click();
  await expect(page.getByRole("dialog")).toContainText("You only have $0 in this jar.");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add money" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Add to jar" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText(/BIKE IS DONE/)).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(page.getByText("Bike", { exact: true })).toBeVisible();
  await expect(page.getByText("$100", { exact: true }).first()).toBeVisible();
});

test("savings: a deadline jar says how much to save per week, lands in the Calendar, and can be pulled up to delete (with undo)", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Savings", exact: true }).click();

  await page.getByRole("button", { name: "Create new" }).click();
  await page.getByLabel("Jar name").fill("Moto");
  await page.getByLabel("Goal amount").fill("5200");
  await page.getByRole("button", { name: "Deadline" }).click();
  await expect(page.getByRole("dialog")).toContainText("per week until");
  await expect(page.getByRole("dialog")).toContainText("The deadline is added to your Calendar.");
  await page.getByRole("button", { name: "Create jar" }).click();
  await expect(page.getByText(/Save \$\d+\/wk until /)).toBeVisible();

  // the Calendar event was written to the (browser) database
  const stored = await page.evaluate(() => localStorage.getItem("rabit.sqljs") ?? "");
  expect(atob(stored)).toContain("Savings deadline: Moto");

  // hold the jar and pull it up: it shows the hint, then is deleted with an Undo
  const title = (await page.getByText("Moto", { exact: true }).first().boundingBox())!;
  const x = title.x + 20;
  const y = title.y - 120;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 60, { steps: 6 });
  await page.mouse.move(x, y - 150, { steps: 8 });
  await expect(page.getByText("Release to delete")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText("Moto deleted")).toBeVisible();
  await expect(page.getByText("Moto", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "UNDO" }).click();
  await expect(page.getByText("Moto", { exact: true }).first()).toBeVisible();
});

test("savings: the blurred backdrop of its windows covers the whole app, like Home or Calendar", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await page.getByRole("button", { name: "Create new" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(600); // let the fade-in finish
  const host = (await page.locator("#rb-overlay").boundingBox())!;
  const backdrop = (await page.locator("#rb-overlay > div").last().boundingBox())!;
  expect(Math.round(backdrop.x)).toBe(Math.round(host.x));
  expect(Math.round(backdrop.y)).toBe(Math.round(host.y));
  expect(Math.round(backdrop.width)).toBe(Math.round(host.width));
  expect(Math.round(backdrop.height)).toBe(Math.round(host.height));
});
