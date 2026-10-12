import { expect, test } from "@playwright/test";

// The first-run tutorial overlays the app; these tests are not about it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rabit.tutorial.seen", "off"));
});

test("language switch (English ⇄ Español) persists, and Savings opens its jars page", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Calendar", exact: true }).waitFor();

  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(page.getByText("CREATE YOUR FIRST JAR.")).toBeVisible();

  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ajustes" })).toBeVisible();
  await page.getByRole("dialog", { name: "Ajustes" }).getByRole("button", { name: "Listo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ahorros", exact: true })).toBeVisible();
  await expect(page.getByText("CREA TU PRIMER FRASCO.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Calendario", exact: true })).toBeVisible();
});
