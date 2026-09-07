import { test, expect } from "@playwright/test";

test.describe("Relink email-OTP escape hatch", () => {
  test("verifying an unrecognized email routes to registration with email pre-filled", async ({ page }) => {
    await page.goto("/relink/verify-email");

    const testEmail = `otp-test-${Date.now()}@example.com`;
    await page.getByPlaceholder("your@email.com").fill(testEmail);

    // Set up the response listener BEFORE triggering the click, so we
    // reliably capture the request/response pair instead of racing it.
    const [requestRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/relink/email-otp/request")),
      page.getByRole("button", { name: /send code/i }).click(),
    ]);

    // Dev/staging returns debug_code so we don't need a real inbox.
    await expect(page.getByPlaceholder("123456")).toBeVisible({ timeout: 10_000 });

    const requestJson = await requestRes.json().catch(() => null);
    const code = requestJson?.debug_code ?? "";
    expect(code).toMatch(/^\d{6}$/);

    await page.getByPlaceholder("123456").fill(code);
    await page.getByRole("button", { name: /verify/i }).click();

    // No guest exists for this fresh test email → routed to registration.
    await expect(page).toHaveURL("/");
    const emailInput = page.locator("#guest-email");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toHaveValue(testEmail);
    await expect(emailInput).toHaveAttribute("readonly", "");
  });

  test("resend button is disabled during the cooldown window", async ({ page }) => {
    await page.goto("/relink/verify-email");
    const testEmail = `otp-cooldown-${Date.now()}@example.com`;
    await page.getByPlaceholder("your@email.com").fill(testEmail);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/relink/email-otp/request")),
      page.getByRole("button", { name: /send code/i }).click(),
    ]);
    await expect(page.getByPlaceholder("123456")).toBeVisible({ timeout: 10_000 });

    // Accessible name includes the live countdown (e.g. "Resend code (60s)"),
    // but the regex substring match still catches it regardless of the digit.
    const resendButton = page.getByRole("button", { name: /resend code/i });
    await expect(resendButton).toBeDisabled();
  });

  test("rejects a disposable email domain", async ({ page }) => {
    await page.goto("/relink/verify-email");
    await page.getByPlaceholder("your@email.com").fill("someone@mailinator.com");
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page.getByText(/temporary\/disposable addresses aren't supported/i)).toBeVisible({ timeout: 10_000 });
  });
});
