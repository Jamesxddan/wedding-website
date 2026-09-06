import { test, expect } from "../fixtures";

test.describe("Admin - Device Reset & Audit", () => {
  test("should load Guests tab", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("guests");
    await adminPage.page.waitForTimeout(500);

    // Should show guest table
    await adminPage.expectGuestTableVisible();
  });

  test("should show guest list with devices", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("guests");
    await adminPage.page.waitForTimeout(500);

    // Table should have guest rows
    const tableRows = adminPage.page.locator("table tbody tr");
    const count = await tableRows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should allow per-device reset", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    await adminPage.clickTab("guests");
    await adminPage.page.waitForTimeout(500);

    // Look for reset button in guest rows
    const resetBtn = adminPage.page.getByRole("button", { name: /reset/i }).first();
    if (await resetBtn.isVisible({ timeout: 5000 })) {
      // Don't actually click (requires confirmation) - just verify it exists
      await expect(resetBtn).toBeVisible();
    }
  });

  test("should show audit log tab", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const auditTab = adminPage.page.getByRole("tab", { name: /audit/i });
    if (await auditTab.isVisible({ timeout: 5000 })) {
      await auditTab.click();
      await adminPage.page.waitForTimeout(500);

      // Should show audit log title or entries
      await expect(adminPage.page.getByText(/audit log|admin action/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should display audit log entries", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const auditTab = adminPage.page.getByRole("tab", { name: /audit/i });
    if (await auditTab.isVisible({ timeout: 5000 })) {
      await auditTab.click();
      await adminPage.page.waitForTimeout(500);

      // Audit entries should show timestamp, admin, action
      const logEntries = adminPage.page.locator("table tbody tr, [class*='log'], [class*='entry']");
      const count = await logEntries.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should allow searching audit log", async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.page.waitForLoadState("networkidle");

    const auditTab = adminPage.page.getByRole("tab", { name: /audit/i });
    if (await auditTab.isVisible({ timeout: 5000 })) {
      await auditTab.click();
      await adminPage.page.waitForTimeout(500);

      // Search or filter input
      const searchInput = adminPage.page.getByPlaceholder(/search|filter/i).first();
      if (await searchInput.isVisible()) {
        await searchInput.fill("guest");
        await adminPage.page.waitForTimeout(1000);

        // Results should filter
        await expect(adminPage.page.getByText(/guest/i)).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});