import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

type Tab =
  | "guests"
  | "logs"
  | "flags"
  | "live"
  | "control"
  | "preview"
  | "admins"
  | "audit"
  | "comments"
  | "content";

export class AdminPage extends BasePage {
  readonly guestsTab: Locator;
  readonly logsTab: Locator;
  readonly flagsTab: Locator;
  readonly previewTab: Locator;
  readonly adminsTab: Locator;
  readonly auditTab: Locator;
  readonly commentsTab: Locator;
  readonly contentTab: Locator;
  readonly guestTable: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.guestsTab = page.getByRole("button", { name: /guests/i });
    this.logsTab = page.getByRole("button", { name: /logs/i });
    this.flagsTab = page.getByRole("button", { name: /flags/i });
    this.previewTab = page.getByRole("button", { name: /preview/i });
    this.adminsTab = page.getByRole("button", { name: /admins/i });
    this.auditTab = page.getByRole("button", { name: /audit/i });
    this.commentsTab = page.getByRole("button", { name: /comments/i });
    this.contentTab = page.getByRole("button", { name: /content/i });
    this.guestTable = page.getByRole("table");
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  async goto(): Promise<void> {
    await this.navigate("/admin");
  }

  async clickTab(tab: Tab): Promise<void> {
    const tabMap: Record<Tab, Locator> = {
      guests: this.guestsTab,
      logs: this.logsTab,
      flags: this.flagsTab,
      live: this.page.getByRole("button", { name: /live/i }),
      control: this.page.getByRole("button", { name: /control/i }),
      preview: this.previewTab,
      admins: this.adminsTab,
      audit: this.auditTab,
      comments: this.commentsTab,
      content: this.contentTab,
    };
    await tabMap[tab].click();
  }

  async expectGuestTableVisible(): Promise<void> {
    await expect(this.guestTable).toBeVisible({ timeout: 10_000 });
  }

  async searchGuest(name: string): Promise<void> {
    await this.searchInput.fill(name);
  }
}
