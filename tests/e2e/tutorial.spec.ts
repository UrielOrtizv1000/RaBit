import { expect, test } from "@playwright/test";

test("first run shows the guided tutorial once; it glides to each tool and Settings can replay it", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });

  const tour = page.getByRole("dialog", { name: "Tutorial" });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("Welcome to RaBit")).toBeVisible();
  const centerX = async () => (await tour.boundingBox())!.x + (await tour.boundingBox())!.width / 2;
  const vw = page.viewportSize()!.width;
  expect(Math.abs((await centerX()) - vw / 2)).toBeLessThan(40); // la bienvenida va al centro

  await tour.getByRole("button", { name: "Next" }).click(); // logo
  await page.waitForTimeout(800);
  const logo = (await page.locator('[data-tour="logo"]').boundingBox())!;
  const card = (await tour.boundingBox())!;
  expect(card.y).toBeGreaterThan(logo.y + logo.height); // la tarjeta se movió bajo el logo
  expect(card.x).toBeLessThan(vw / 2 - 100);

  for (let n = 0; n < 3; n++) await tour.getByRole("button", { name: "Next" }).click(); // search, create, calendar
  await page.waitForTimeout(800);
  const dock = (await page.locator('[data-tour="nav-calendar"]').boundingBox())!;
  expect((await tour.boundingBox())!.x).toBeGreaterThan(dock.x + dock.width); // junto al dock, a su derecha

  await tour.getByRole("button", { name: "Skip" }).click();
  await expect(tour).toBeHidden();

  await page.reload();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("dialog", { name: "Tutorial" })).toBeHidden();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("dialog", { name: "Tutorial" })).toBeVisible();
});

test("each page and window has its own first-visit tutorial, shown once, after the main one", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  const tour = page.getByRole("dialog", { name: "Tutorial" });
  await expect(tour.getByText("Welcome to RaBit")).toBeVisible();
  await tour.getByRole("button", { name: "Skip" }).click();
  await expect(tour).toBeHidden();

  // first visit to Savings → its tour (pointing at real elements), then the jar window has its own
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(tour.getByText("Each goal is a jar. Add money and watch the coins pile up")).toBeVisible();
  await tour.getByRole("button", { name: "Next" }).click();
  await expect(tour.getByText("Create a jar")).toBeVisible();
  await tour.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Create new" }).click();
  await expect(tour.getByText("Three ways to plan")).toBeVisible();
  await tour.getByRole("button", { name: "Skip" }).click();
  await page.keyboard.press("Escape");

  // leaving and coming back does not repeat it
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await page.waitForTimeout(1300);
  await expect(tour).toBeHidden();

  // Calendar has its own
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(tour.getByText("Your month, week, day or year at a glance")).toBeVisible();
});
