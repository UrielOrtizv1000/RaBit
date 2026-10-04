import { expect, test } from "@playwright/test";

test("dark/light theme toggle persists and demo data can be loaded and cleared", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).waitFor();

  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  expect(await theme()).toBe("light");
  await page.getByTitle("Switch light / dark").click();
  expect(await theme()).toBe("dark");
  await page.reload();
  await expect.poll(theme).toBe("dark");
  await page.getByTitle("Switch light / dark").click();
  expect(await theme()).toBe("light");

  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Submit report").first()).toBeVisible();

  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Sure?" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Submit report")).toHaveCount(0);
});
