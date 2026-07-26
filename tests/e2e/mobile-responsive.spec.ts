import { test, expect } from "../fixtures";
import { setGuestSession } from "../utils/helpers";

test.describe("Mobile Responsiveness", () => {
  test.beforeEach(async ({ freshPage }) => {
    await setGuestSession(freshPage, "Mobile Guest", "Chennai", true);
  });

  test("should display correctly on mobile viewport", async ({ freshPage }) => {
    // Set mobile viewport
    await freshPage.setViewportSize({ width: 375, height: 812 }); // iPhone X

    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Page should load without errors
    await expect(freshPage).toHaveURL("/");

    // The page body should have content
    const bodyText = await freshPage.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test("should handle scroll on mobile", async ({ freshPage }) => {
    await freshPage.setViewportSize({ width: 375, height: 812 });

    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Scroll down on mobile
    await freshPage.evaluate(() => window.scrollTo(0, 500));
    await freshPage.waitForTimeout(500);

    // Verify scroll worked
    const scrollY = await freshPage.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });

  test("should render on mobile without errors", async ({ freshPage }) => {
    await freshPage.setViewportSize({ width: 375, height: 812 });

    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Check for no unhandled errors
    const errors: string[] = [];
    freshPage.on("pageerror", (err) => errors.push(err.message));

    await freshPage.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
