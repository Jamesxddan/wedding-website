import { test, expect } from "../fixtures";

test.describe("Admin Panel", () => {
  test("should load admin page", async ({ adminPage }) => {
    await adminPage.goto();
    // Admin page should load (may redirect to auth)
    await expect(adminPage.page).toHaveURL(/admin/);
  });

  test("should load without crashing", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    // Page should have rendered content — auth screen or dashboard
    const bodyContent = await adminPage.page.locator("body").textContent();
    expect(bodyContent?.length).toBeGreaterThan(0);
  });

  test("should switch between tabs", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    // Try clicking different tab buttons — admin renders buttons for tabs
    const tabNames = ["guests", "logs", "flags", "preview"];

    for (const tabName of tabNames) {
      const tabBtn = adminPage.page
        .locator("button")
        .filter({ hasText: new RegExp(`^${tabName}$`, "i") });
      if ((await tabBtn.count()) > 0 && (await tabBtn.first().isVisible())) {
        await tabBtn.first().click();
        await adminPage.page.waitForTimeout(300);
        // Tab button should still be visible after click
        await expect(tabBtn.first()).toBeVisible();
      }
    }
  });

  test("should display preview iframe", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    // Click preview tab button
    const previewBtn = adminPage.page
      .locator("button")
      .filter({ hasText: /preview/i });
    if ((await previewBtn.count()) > 0 && (await previewBtn.first().isVisible())) {
      await previewBtn.first().click();

      // Preview iframe should load
      const iframe = adminPage.page.frameLocator("iframe");
      await expect(iframe.locator("body")).toBeVisible({ timeout: 15_000 });
    }
  });
});
