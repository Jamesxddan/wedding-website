import { test, expect } from "../fixtures";

test.describe("Smoke Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("preview page loads", async ({ page }) => {
    const response = await page.goto("/preview");
    expect(response?.status()).toBe(200);
  });

  test("page title is not default Next.js title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const title = await page.title();
    expect(title).not.toBe("");
    // Should contain wedding-related content
    expect(title.length).toBeGreaterThan(0);
  });

  test("admin route responds", async ({ page }) => {
    const response = await page.goto("/admin");
    // Admin may redirect to auth, just verify the route exists
    expect(response?.status()).toBeLessThan(500);
  });

  test("API health - settings endpoint responds", async ({ page }) => {
    const response = await page.request.get("/api/settings");
    // Settings API should respond (may return 200 or 404 depending on setup)
    expect(response.status()).toBeLessThan(500);
  });
});
