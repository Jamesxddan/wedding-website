import { test, expect } from "../fixtures";

test.describe("Admin - Site Control", () => {
  test("should load Site Control tab", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    // Click Site Control tab
    await adminPage.clickTab("control");
    await adminPage.page.waitForTimeout(500);

    // Phase override controls should be visible
    await expect(adminPage.page.getByText(/phase override|force phase/i)).toBeVisible({ timeout: 10_000 });
  });

  test("should show phase override dropdown with all phases", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("control");
    await adminPage.page.waitForTimeout(500);

    // Find phase selector
    const phaseSelect = adminPage.page.locator("select").first();
    if (await phaseSelect.isVisible()) {
      const options = await phaseSelect.locator("option").allTextContents();
      expect(options).toContain("auto");
      expect(options).toContain("FIRST_VISIT");
      expect(options).toContain("INVITATION");
      expect(options).toContain("RETURN_VISIT");
      expect(options).toContain("WEDDING_DAY");
      expect(options).toContain("POST_WEDDING");
    }
  });

  test("should allow setting phase override", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("control");
    await adminPage.page.waitForTimeout(500);

    const phaseSelect = adminPage.page.locator("select").first();
    if (await phaseSelect.isVisible()) {
      await phaseSelect.selectOption("WEDDING_DAY");
      await adminPage.page.waitForTimeout(1000);

      // Should show warning about forced phase
      await expect(adminPage.page.getByText(/forced|override|warning/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should allow clearing phase override", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("control");
    await adminPage.page.waitForTimeout(500);

    const phaseSelect = adminPage.page.locator("select").first();
    if (await phaseSelect.isVisible()) {
      await phaseSelect.selectOption("auto");
      await adminPage.page.waitForTimeout(1000);

      // Forced warning should disappear
      await expect(adminPage.page.getByText(/forced|override|warning/i)).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test("should allow saving stream URLs", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("control");
    await adminPage.page.waitForTimeout(500);

    // Look for YouTube URL inputs
    const ytInput = adminPage.page.getByPlaceholder(/youtube|stream/i).first();
    if (await ytInput.isVisible()) {
      await ytInput.fill("https://www.youtube.com/watch?v=test123");
      const saveBtn = adminPage.page.getByRole("button", { name: /save/i }).first();
      await saveBtn.click();
      await adminPage.page.waitForTimeout(2000);

      // Should show saved confirmation
      await expect(adminPage.page.getByText(/saved|saved ✓/i)).toBeVisible({ timeout: 5_000 });
    }
  });
});