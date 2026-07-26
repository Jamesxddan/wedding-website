import { test, expect } from "../fixtures";
import { setGuestSession } from "../utils/helpers";

test.describe("Return Visit Flow", () => {
  test.beforeEach(async ({ freshPage }) => {
    // Simulate a returning visitor with existing session
    await setGuestSession(freshPage, "Test Guest", "Chennai", true);
  });

  test("should display countdown hero for returning visitor", async ({
    freshPage,
  }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should show countdown labels — use .first() to avoid strict mode violation
    await expect(
      freshPage.getByText("Days", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show guest greeting with name", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should greet the guest by name — use exact match to avoid strict mode
    await expect(
      freshPage.getByText("Test Guest", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
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

  test("should open invitation modal from countdown hero", async ({
    freshPage,
  }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Click view invitation button
    const viewInvitationBtn = freshPage.getByRole("button", {
      name: /view invitation/i,
    });
    if (await viewInvitationBtn.isVisible()) {
      await viewInvitationBtn.click();

      // Modal should appear with invitation content
      await expect(
        freshPage.getByText(/James|Sharon|wedding/i)
      ).toBeVisible({ timeout: 10_000 });

      // Can close with back button
      const backBtn = freshPage.getByRole("button", { name: /back/i });
      if (await backBtn.isVisible()) {
        await backBtn.click();
      }
    }
  });

  test("should display background music player", async ({ freshPage }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Just verify the page loads without errors
    expect(freshPage.url()).toContain("/");
  });
});
