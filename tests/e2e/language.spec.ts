import { expect, test } from "@playwright/test";

test("language switch (English ⇄ Español) persists, and Savings is marked as coming soon", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).waitFor();

  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(page.getByText("SAVINGS IS COMING SOON.")).toBeVisible();

  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ajustes" })).toBeVisible();
  await page.getByRole("dialog", { name: "Ajustes" }).getByRole("button", { name: "Listo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ahorros", exact: true })).toBeVisible();
  await expect(page.getByText("AHORROS LLEGA PRONTO.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Calendario", exact: true })).toBeVisible();
});
