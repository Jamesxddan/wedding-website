import { test as setup, expect } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "./auth-storage";

setup("admin login", async ({ page }) => {
  await page.goto("/admin");
  // The page renders nothing until it has checked for an existing session
  // (GET /api/admin/me), then shows either the login form or the dashboard.
  const emailInput = page.getByPlaceholder("Email");
  const passwordInput = page.getByPlaceholder("Password");
  const submitBtn = page.getByRole("button", { name: /sign in/i });
  const dashboardMarker = page.getByRole("button", { name: /guests|live stream/i });

  await expect(emailInput.or(dashboardMarker)).toBeVisible({ timeout: 15_000 });

  if (await emailInput.isVisible()) {
    // Admin credentials are seeded via scripts/seed-super-admin.mjs
    await emailInput.fill(process.env.ADMIN_EMAIL || "jdj123.1997@gmail.com");
    await passwordInput.fill(process.env.ADMIN_PASSWORD || "");
    await submitBtn.click();
    await expect(dashboardMarker).toBeVisible({ timeout: 15_000 });
  }

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});