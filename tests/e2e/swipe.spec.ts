import { expect, test } from "@playwright/test";

test("calendar: hold an event and swipe left to delete it (undo brings it back)", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();

  const chip = page.locator(".rbc-chip", { hasText: "Dentist" }).first();
  await expect(chip).toBeVisible();
  const b = (await chip.boundingBox())!;
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;

  // un clic corto NO elimina (abre el panel)
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // mantener + deslizar a la izquierda = eliminar
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(450);
  for (let i = 1; i <= 10; i++) await page.mouse.move(x - i * 22, y);
  await page.mouse.up();
  await expect(page.getByText("Deleted “Dentist”")).toBeVisible();
  await expect(page.locator(".rbc-chip", { hasText: "Dentist" })).toHaveCount(0);

  await page.getByRole("button", { name: "UNDO" }).click();
  await expect(page.locator(".rbc-chip", { hasText: "Dentist" }).first()).toBeVisible();
});

test("home: hold + swipe left shows 'DELETE' behind the row, then deletes tasks and notes", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("How should RaBit call you?").fill("Tester");
  await page.getByRole("button", { name: "Start locally" }).click();
  await page.getByRole("button", { name: "Let's go" }).click({ timeout: 15_000 });
  await page.getByLabel("Settings").click();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done", exact: true }).click();

  const swipe = async (loc: ReturnType<typeof page.locator>, check = false) => {
    const b = (await loc.boundingBox())!;
    const x = b.x + b.width * 0.7,
      y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(350);
    for (let i = 1; i <= 8; i++) await page.mouse.move(x - i * 20, y);
    if (check) await expect(page.locator("[data-swipe-label]")).toBeVisible();
    await page.mouse.up();
  };

  // tarea pendiente (muestra el aviso detrás y elimina)
  const row = page.locator("[data-tid]", { hasText: "Reply to emails" });
  await expect(row).toBeVisible();
  await swipe(row, true);
  await expect(page.getByText("Deleted “Reply to emails”")).toBeVisible();
  await expect(page.locator("[data-tid]", { hasText: "Reply to emails" })).toHaveCount(0);

  // nota rápida (va a la papelera, con Undo)
  const note = page.getByRole("button", { name: /Project ideas/ }).first();
  await swipe(note);
  await expect(page.getByText("Deleted “Project ideas”")).toBeVisible();
});
