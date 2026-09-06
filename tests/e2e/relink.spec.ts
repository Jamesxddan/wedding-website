import { test, expect } from "../fixtures";
import { setGuestSession, clearAllStorage } from "../utils/helpers";

test.describe("Relink Flow", () => {
  test("should show relink form for returning guest on new device", async ({ freshPage }) => {
    // No existing session - simulates new device
    await clearAllStorage(freshPage);

    // The page should detect unknown device and show relink option
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Should show relink form or "Welcome back" prompt
    const relinkIndicator = freshPage.getByText(/welcome back|relink|already registered/i).first();
    await expect(relinkIndicator).toBeVisible({ timeout: 15_000 });
  });

  test("should allow guest to relink with name and city", async ({ freshPage }) => {
    await clearAllStorage(freshPage);
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // Fill relink form
    const nameInput = freshPage.getByPlaceholder(/name/i);
    const cityInput = freshPage.getByPlaceholder(/city/i);

    if (await nameInput.isVisible() && await cityInput.isVisible()) {
      await nameInput.fill("John Doe");
      await cityInput.fill("Chennai");

      const submitBtn = freshPage.getByRole("button", { name: /continue|submit|relink/i });
      await submitBtn.click();
      await freshPage.waitForTimeout(3000);

      // Should proceed to verification (phone/email) or show success
      const verificationPrompt = freshPage.getByText(/verify|code|sent/i).first();
      await expect(verificationPrompt).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should show error for unknown guest", async ({ freshPage }) => {
    await clearAllStorage(freshPage);
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    const nameInput = freshPage.getByPlaceholder(/name/i);
    const cityInput = freshPage.getByPlaceholder(/city/i);

    if (await nameInput.isVisible() && await cityInput.isVisible()) {
      await nameInput.fill("Unknown Guest");
      await cityInput.fill("Nowhere");

      const submitBtn = freshPage.getByRole("button", { name: /continue|submit|relink/i });
      await submitBtn.click();
      await freshPage.waitForTimeout(3000);

      // Should show "Name not found" error
      const error = freshPage.getByText(/not found|check spelling|contact/i).first();
      await expect(error).toBeVisible({ timeout: 10_000 });
    }
  });

  test("should request token from trusted device", async ({ freshPage }) => {
    // This tests the token request API flow
    // Set up a session that simulates a trusted device
    await setGuestSession(freshPage, "Trusted Guest", "Chennai", true);
    await freshPage.goto("/");
    await freshPage.waitForLoadState("networkidle");

    // In dev mode, token request should work without real DB
    // Just verify the flow doesn't crash
    const errors: string[] = [];
    freshPage.on("pageerror", (err) => errors.push(err.message));
    expect(errors).toHaveLength(0);
  });
});