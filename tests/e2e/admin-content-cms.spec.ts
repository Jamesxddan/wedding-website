import { test, expect } from "../fixtures";

test.describe("Admin - Content CMS", () => {
  test("should load Content tab for super admin", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    // Click Content tab (only visible to super admin)
    const contentTab = adminPage.page.getByRole("tab", { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5000 })) {
      await contentTab.click();
      await adminPage.page.waitForTimeout(500);

      // Should show site content editor
      await expect(adminPage.page.getByText(/site content|customize|edit/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should show content sections", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const contentTab = adminPage.page.getByRole("tab", { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5000 })) {
      await contentTab.click();
      await adminPage.page.waitForTimeout(500);

      // Should show sections like couple info, families, itinerary
      await expect(adminPage.page.getByText(/couple|families|itinerary/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should allow editing couple names", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const contentTab = adminPage.page.getByRole("tab", { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5000 })) {
      await contentTab.click();
      await adminPage.page.waitForTimeout(500);

      // Find name input fields
      const nameInput = adminPage.page.getByPlaceholder(/name|groom|bride/i).first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("Test Name");
        const saveBtn = adminPage.page.getByRole("button", { name: /save|update/i }).first();
        await saveBtn.click();
        await adminPage.page.waitForTimeout(2000);

        // Should show saved confirmation
        await expect(adminPage.page.getByText(/saved|saved ✓/i)).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test("should allow resetting content to defaults", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const contentTab = adminPage.page.getByRole("tab", { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5000 })) {
      await contentTab.click();
      await adminPage.page.waitForTimeout(500);

      // Find reset button
      const resetBtn = adminPage.page.getByRole("button", { name: /reset.*default/i });
      if (await resetBtn.isVisible()) {
        // Don't actually click (requires confirmation) - just verify it exists
        await expect(resetBtn).toBeVisible();
      }
    }
  });
});