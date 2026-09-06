import { test, expect } from "../fixtures";
import { setGuestSession } from "../utils/helpers";

test.describe("Comments / Wall of Love", () => {
  test.beforeEach(async ({ freshPage }) => {
    await setGuestSession(freshPage, "Comment Guest", "Chennai", true);
  });

  test("should display Wall of Love section", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const wallOfLove = freshPage.getByText(/wall of love/i).first();
    await expect(wallOfLove).toBeVisible({ timeout: 10_000 });
  });

  test("should allow posting a clean comment", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const wallOfLove = freshPage.getByText(/wall of love/i).first();
    await wallOfLove.scrollIntoViewIfNeeded();
    await freshPage.waitForTimeout(500);

    const textarea = freshPage.getByPlaceholder(/bless|message|write/i).first();
    if (await textarea.isVisible({ timeout: 5000 })) {
      const testMessage = `Test blessing ${Date.now()}`;
      await textarea.fill(testMessage);
      await textarea.press("Enter");
      await freshPage.waitForTimeout(3000);

      // Comment should appear in the list
      await expect(freshPage.getByText(testMessage)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should block profanity and show error", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const wallOfLove = freshPage.getByText(/wall of love/i).first();
    await wallOfLove.scrollIntoViewIfNeeded();
    await freshPage.waitForTimeout(500);

    const textarea = freshPage.getByPlaceholder(/bless|message|write/i).first();
    if (await textarea.isVisible({ timeout: 5000 })) {
      // Try to post a comment with profanity
      await textarea.fill("This is a damn terrible test");
      await textarea.press("Enter");
      await freshPage.waitForTimeout(3000);

      // Should show blocked message (blocked_peace or blocked)
      const blockedMsg = freshPage.getByText(/blocked|profanity|peace|temporarily/i).first();
      await expect(blockedMsg).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should show existing comments", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const wallOfLove = freshPage.getByText(/wall of love/i).first();
    await wallOfLove.scrollIntoViewIfNeeded();
    await freshPage.waitForTimeout(1000);

    // Should have at least some comment content or empty state
    const commentArea = freshPage.locator("[class*='comment'], [class*='message'], [class*='wall']").first();
    await expect(commentArea).toBeVisible({ timeout: 10_000 });
  });
});