import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The simulation offers the next minor version, so the expected texts follow package.json instead of a fixed number.
const current: string = JSON.parse(readFileSync("package.json", "utf8")).version;
const [major, minor] = current.split(".").map(Number);
const next = `${major}.${minor + 1}.0`;

// The update SIMULATION (dev only, `?update-sim`) walks the real UI: icon → panel → download → ready → restart → "UPDATED TO".
test("updates: the icon appears, downloads with progress, restarts, and the terminal announces the new version once", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rabit.tutorial.seen", "off"));
  await page.goto("/?update-sim");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });

  // silent until a new version exists, then the glass icon (same 42px size as the bell) fades in
  const icon = page.getByRole("button", { name: "Update available" });
  await expect(icon).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(700); // let the fade + scale finish
  const size = (await icon.boundingBox())!;
  const bell = (await page.getByRole("button", { name: "Notifications" }).boundingBox())!;
  expect(Math.round(size.width)).toBe(42);
  expect(size.x + size.width).toBeLessThanOrEqual(bell.x); // to the left of the bell, same row
  expect(Math.round(size.y)).toBe(Math.round(bell.y));

  await icon.click();
  const panel = page.getByRole("dialog", { name: "Update available" });
  await expect(panel).toContainText(`v${next}`);
  await expect(panel).toContainText(`You have v${current}`);
  await expect(panel).toContainText("WHAT'S NEW");
  await expect(panel.getByRole("button", { name: "Later" })).toBeVisible();

  await panel.getByRole("button", { name: "Update" }).click();
  await expect(panel.getByRole("progressbar")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Restart to update" })).toBeVisible({ timeout: 15_000 });

  // "Later" closes the panel but the icon stays
  await panel.getByRole("button", { name: "Later" }).click();
  await expect(panel).toBeHidden();
  await expect(icon).toBeVisible();

  await icon.click();
  await page.getByRole("button", { name: "Restart to update" }).click();

  // the simulated restart reloads the app "as the next version": the terminal types the notice, then goes back to normal
  await expect(page.getByText(`> UPDATED TO v${next}`)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("SIMULATED RELEASE NOTES")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Update available" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(/GOOD (MORNING|AFTERNOON|EVENING), TESTER!/)).toBeVisible();
  await expect(page.getByText("> UPDATED TO")).toHaveCount(0);
});
