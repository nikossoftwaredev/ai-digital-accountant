import type { Platform } from "@repo/shared";
import { BaseScraper, type ScrapedDebt } from "./base-scraper";
import { logger } from "../utils/logger";

// ── EFKA Scraper ─────────────────────────────────────────────────
//
// Flow:
//   1. Go to EFKA OAuth entry point
//   2. Dismiss cookie banner
//   3. Click "ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET"
//   4. Fill TaxisNet username + password → "Σύνδεση"
//   5. Click "Αποστολή" (OAuth consent)
//   6. Fill AMKA → "Είσοδος"
//   7. Navigate to Debts page

const EFKA_ENTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Account/GsisOAuth2Authenticate.aspx";
const EFKA_DEBTS_URL =
  "https://www.idika.org.gr/EfkaServices/Application/Debts.aspx";

export class EFKAScraper extends BaseScraper {
  readonly platform: Platform = "EFKA";
  readonly name = "EFKA";

  protected login = async (): Promise<void> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    if (!this.credentials.amka) {
      throw new Error("Client has no AMKA — required for EFKA login");
    }

    // Step 1: Navigate to EFKA entry point
    await this.page.goto(EFKA_ENTRY_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(2_000);
    log.info("Loaded EFKA entry page");

    // Step 2: Dismiss cookie banner if blocking
    try {
      const closeBtn = this.page.locator("text=ΚΛΕΙΣΙΜΟ");
      await closeBtn.click({ timeout: 3_000 });
      log.info("Dismissed cookie banner");
    } catch {
      // No cookie banner
    }

    // Step 3: Click "ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET" (DevExpress button wrapper)
    await this.page.locator("#ContentPlaceHolder1_btnGGPSAuth").click();
    log.info("Clicked ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET");

    // Step 4: Fill TaxisNet credentials
    const usernameField = this.page.getByRole("textbox", {
      name: "Χρήστης:",
    });
    await usernameField.waitFor({ state: "visible", timeout: 15_000 });
    await usernameField.fill(this.credentials.username);

    await this.page
      .getByRole("textbox", { name: "Κωδικός:" })
      .fill(this.credentials.password);

    await this.page.getByRole("button", { name: "Σύνδεση" }).click();
    log.info("Submitted TaxisNet credentials");

    // Step 5: OAuth consent — click "Αποστολή"
    const consentBtn = this.page.getByRole("button", { name: "Αποστολή" });
    await consentBtn.waitFor({ state: "visible", timeout: 15_000 });
    await consentBtn.click();
    log.info("OAuth consent granted");

    // Step 6: Fill AMKA and enter
    const amkaField = this.page.getByRole("textbox", { name: "AMKA:" });
    await amkaField.waitFor({ state: "visible", timeout: 15_000 });
    await amkaField.fill(this.credentials.amka);

    await this.page
      .locator("span")
      .filter({ hasText: "Εισοδος" })
      .click();
    log.info("AMKA submitted");

    // Wait for page to settle
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(2_000);
    log.info("Logged into EFKA");
  };

  protected extractDebts = async (): Promise<ScrapedDebt[]> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    // Navigate to the Debts page
    await this.page.goto(EFKA_DEBTS_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(3_000);
    log.info("Navigated to Debts page");

    // Try to find debt tables
    const rows = await this.page.$$("table tbody tr");

    if (rows.length === 0) {
      log.info("No debt rows found on EFKA debts page");
      return [];
    }

    const debts: ScrapedDebt[] = [];

    for (const row of rows) {
      try {
        const cells = await row.$$("td");
        if (cells.length < 2) continue;

        const descriptionText =
          (await cells[0]?.textContent())?.trim() ?? "";
        const amountText =
          (await cells[cells.length - 1]?.textContent())?.trim() ?? "0";

        const amount = parseGreekAmount(amountText);
        if (amount <= 0) continue;

        debts.push({
          category: "EFKA",
          amount,
          platform: "EFKA",
          priority:
            amount > 5000 ? "HIGH" : amount > 1000 ? "MEDIUM" : "LOW",
          description: descriptionText || null,
          dueDate: null,
        });
      } catch (error) {
        log.warn({ error }, "Failed to parse EFKA debt row");
      }
    }

    log.info({ count: debts.length }, "Debts extracted from EFKA");
    return debts;
  };

  protected logout = async (): Promise<void> => {
    if (!this.page) return;

    try {
      const logoutLink = await this.page.$(
        'a[href*="logout"], a[href*="Logout"], a[href*="SignOut"]'
      );
      if (logoutLink) {
        await logoutLink.click();
        await this.page.waitForLoadState("domcontentloaded");
      }
    } catch {
      // Best effort
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────

const parseGreekAmount = (text: string): number => {
  const cleaned = text.replace(/[€\s]/g, "");
  // Greek format: 1.234,56 → 1234.56
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  return isNaN(amount) ? 0 : amount;
};
