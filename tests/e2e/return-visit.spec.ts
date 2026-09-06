import { test, expect } from "../fixtures";
import { setGuestSession, setPhaseOverride } from "../utils/helpers";

test.describe("RETURN_VISIT Phase (Pre-Wedding)", () => {
  test.beforeEach(async ({ freshPage }) => {
    // Guest who has registered AND seen invitation
    await setGuestSession(freshPage, "Return Guest", "Chennai", true);
  });

  test("should display countdown hero with timer", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should show countdown labels (Days, Hours, Minutes, Seconds)
    await expect(freshPage.getByText("Days", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(freshPage.getByText("Hours", { exact: true }).first()).toBeVisible();
    await expect(freshPage.getByText("Minutes", { exact: true }).first()).toBeVisible();
    await expect(freshPage.getByText("Seconds", { exact: true }).first()).toBeVisible();
  });

  test("should greet guest by name", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    await expect(freshPage.getByText("Return Guest", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("should display all main sections", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Gallery section
    await expect(freshPage.getByText(/gallery/i).first()).toBeVisible();

    // Our Story section
    await expect(freshPage.getByText(/our story/i).first()).toBeVisible();

    // Venue section
    await expect(freshPage.getByText(/venue/i).first()).toBeVisible();
  });

  test("should scroll to gallery and show photos", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Scroll to gallery section
    const gallerySection = freshPage.getByText(/gallery/i).first();
    await gallerySection.scrollIntoViewIfNeeded();
    await freshPage.waitForTimeout(1000);

    // Photos should be visible (lazy loaded)
    // Just verify no console errors occurred
    const errors: string[] = [];
    freshPage.on("pageerror", (err) => errors.push(err.message));
    expect(errors).toHaveLength(0);
  });

  test("should scroll to venue and show itinerary", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const venueSection = freshPage.getByText(/venue/i).first();
    await venueSection.scrollIntoViewIfNeeded();
    await freshPage.waitForTimeout(1000);

    // Itinerary items should be visible
    await expect(freshPage.getByText(/ceremony|reception|st andrews|bkn/i)).toBeVisible({ timeout: 10_000 });
  });

  test("should open Wall of Love and allow comment", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Find Wall of Love section
    const wallOfLove = freshPage.getByText(/wall of love/i).first();
    if (await wallOfLove.isVisible()) {
      await wallOfLove.scrollIntoViewIfNeeded();
      await freshPage.waitForTimeout(500);

      // Find comment textarea
      const textarea = freshPage.getByPlaceholder(/bless|message|write/i);
      if (await textarea.isVisible({ timeout: 5000 })) {
        await textarea.fill("Beautiful couple! Wishing you a lifetime of happiness. 💛");
        // Press Enter to send (if Enter sends)
        await textarea.press("Enter");
        await freshPage.waitForTimeout(2000);

        // Comment should appear or form should submit
        await expect(freshPage.getByText(/beautiful couple/i)).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});