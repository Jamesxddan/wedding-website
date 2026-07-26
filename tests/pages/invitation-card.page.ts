import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class InvitationCardPage extends BasePage {
  readonly waxSeal: Locator;
  readonly guestName: Locator;
  readonly exploreButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.waxSeal = page.getByRole("button", { name: /open|explore/i }).or(
      page.locator('[class*="seal"]')
    );
    this.guestName = page.locator("text=/Dear|Welcome|Friend/");
    this.exploreButton = page.getByRole("button", { name: /explore|continue/i });
    this.backButton = page.getByRole("button", { name: /back/i });
  }

  async expectInvitationVisible(): Promise<void> {
    // Invitation should show the couple names or invitation content
    await expect(
      this.page.getByText(/James|Sharon|wedding|invite/i)
    ).toBeVisible({ timeout: 10_000 });
  }

  async clickExplore(): Promise<void> {
    await this.exploreButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  async expectGuestName(name: string): Promise<void> {
    await expect(this.page.getByText(name)).toBeVisible();
  }
}
