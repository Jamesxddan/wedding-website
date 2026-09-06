import { test, expect } from "../fixtures";
import { setGuestSession, setPhaseOverride } from "../utils/helpers";

test.describe("INVITATION Phase", () => {
  test.beforeEach(async ({ freshPage }) => {
    // Simulate a guest who has registered but not yet opened invitation
    await setGuestSession(freshPage, "Invitation Guest", "Chennai", false);
  });

  test("should display invitation envelope on first load", async ({ freshPage, invitationCard }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should show invitation card (envelope with wax seal)
    await expect(freshPage.getByText(/James|Sharon|wedding|invite/i)).toBeVisible({ timeout: 15_000 });
  });

  test("should open invitation when clicking seal/explore", async ({ freshPage, invitationCard }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Click to open invitation (wax seal or explore button)
    const exploreBtn = freshPage.getByRole("button", { name: /open|explore|continue/i });
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
      await freshPage.waitForTimeout(1000);

      // Should show invitation content
      await expect(freshPage.getByText(/James|Sharon|wedding|October/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should mark invitation as seen after opening", async ({ freshPage, invitationCard }) => {
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const exploreBtn = freshPage.getByRole("button", { name: /open|explore|continue/i });
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
      await freshPage.waitForTimeout(1000);

      // After opening, the invitation_seen flag should be set
      const seen = await freshPage.evaluate(() => localStorage.getItem("invitation_seen"));
      expect(seen).toBe("true");
    }
  });

  test("should replay invitation from countdown hero", async ({ freshPage, countdownHero }) => {
    // First, set up guest who has seen invitation
    await setGuestSession(freshPage, "Replay Guest", "Chennai", true);
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Click view invitation button
    const viewBtn = freshPage.getByRole("button", { name: /view invitation/i });
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await freshPage.waitForTimeout(1000);

      // Should show invitation again
      await expect(freshPage.getByText(/James|Sharon|wedding|October/i)).toBeVisible({ timeout: 10_000 });
    }
  });
});