import { test as setup, expect } from "@playwright/test";

setup("admin login", async ({ page }) => {
  await page.goto("/admin");
  // In dev (non-production), admin login bypasses auth and shows login form
  // Admin credentials are seeded via scripts/seed-super-admin.mjs
  const emailInput = page.getByPlaceholder("Admin email");
  const passwordInput = page.getByPlaceholder("Password");
  const submitBtn = page.getByRole("button", { name: /sign in/i });

  if (await emailInput.isVisible({ timeout: 5000 })) {
    // Fill admin credentials from env
    await emailInput.fill(process.env.ADMIN_EMAIL || "jdj123.1997@gmail.com");
    await passwordInput.fill(process.env.ADMIN_PASSWORD || "");
    await submitBtn.click();
    // Wait for dashboard to load
    await expect(page.getByText(/admin dashboard|guests|site control/i)).toBeVisible({ timeout: 15_000 });
  }
});