import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  readonly loadingSpinner: Locator;
  readonly preparingText: Locator;

  constructor(page: Page) {
    super(page);
    this.loadingSpinner = page.locator(".animate-loading-ring");
    this.preparingText = page.getByText("preparing your invitation");
  }

  async goto(): Promise<void> {
    await this.navigate("/");
  }

  async waitForLoadingComplete(): Promise<void> {
    // Wait for the loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: "hidden", timeout: 15_000 });
  }

  async expectLoadingVisible(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible();
    await expect(this.preparingText).toBeVisible();
  }
}
