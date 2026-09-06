import { test, expect } from "../fixtures";
import { setGuestSession, setPhaseOverride } from "../utils/helpers";

test.describe("WEDDING_DAY Phase", () => {
  test.beforeEach(async ({ freshPage }) => {
    // Set guest session and force WEDDING_DAY phase via dev override
    await setGuestSession(freshPage, "Wedding Guest", "Chennai", true);
    await setPhaseOverride(freshPage, "WEDDING_DAY");
  });

  test("should display wedding day banner", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should show wedding day banner
    await expect(freshPage.getByText(/wedding day|live|stream/i)).toBeVisible({ timeout: 15_000 });
  });

  test("should show ceremony live stream embed", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Look for ceremony stream (St Andrews Kirk)
    const ceremonyStream = freshPage.getByText(/st andrews|kirk|ceremony/i).first();
    if (await ceremonyStream.isVisible()) {
      await ceremonyStream.scrollIntoViewIfNeeded();
      await freshPage.waitForTimeout(1000);

      // YouTube iframe or placeholder should be present
      const iframe = freshPage.frameLocator("iframe");
      await expect(iframe.locator("body")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("should show reception live stream embed", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Look for reception stream (BKN Auditorium)
    const receptionStream = freshPage.getByText(/bkn|auditorium|reception/i).first();
    if (await receptionStream.isVisible()) {
      await receptionStream.scrollIntoViewIfNeeded();
      await freshPage.waitForTimeout(1000);

      const iframe = freshPage.frameLocator("iframe");
      await expect(iframe.locator("body")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("should show live ticker if active", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Live ticker should be present
    await expect(freshPage.getByText(/live|ticker|updates/i)).toBeVisible({ timeout: 10_000 });
  });
});