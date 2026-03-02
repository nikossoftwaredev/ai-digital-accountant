import type { Platform } from "@repo/shared";
import { BaseScraper, type ScrapedDebt } from "./base-scraper";
import { logger } from "../utils/logger";

// ── AADE / TaxisNet Scraper ───────────────────────────────────────
//
// This scraper logs into the AADE (Ανεξάρτητη Αρχή Δημοσίων Εσόδων)
// portal via TaxisNet credentials and extracts debt information.
//
// NOTE: Exact selectors will need to be refined against the real
// AADE site. This implementation provides the structural framework
// with placeholder selectors that must be updated during live testing.

const AADE_LOGIN_URL = "https://www1.aade.gr/taxisnet/";
const AADE_DEBTS_URL =
  "https://www1.aade.gr/taxisnet/info/protected/displayDebts.htm";

export class AADEScraper extends BaseScraper {
  readonly platform: Platform = "AADE";
  readonly name = "AADE";

  protected login = async (): Promise<void> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    await this.page.goto(AADE_LOGIN_URL, { waitUntil: "networkidle" });

    // Check for captcha
    const captcha = await this.page.$('[id*="captcha"], [class*="captcha"]');
    if (captcha) throw new Error("Captcha detected — manual intervention required");

    // Fill credentials
    // NOTE: These selectors are placeholders — update after inspecting the real login form
    await this.page.fill(
      'input[name="username"], #username',
      this.credentials.username
    );
    await this.page.fill(
      'input[name="password"], #password',
      this.credentials.password
    );
    await this.page.click('button[type="submit"], input[type="submit"]');

    // Wait for navigation after login
    await this.page.waitForNavigation({
      waitUntil: "networkidle",
      timeout: 15_000,
    });

    // Verify login succeeded
    const errorElement = await this.page.$(
      '.error, .login-error, [class*="error-message"]'
    );
    if (errorElement) {
      const errorText = await errorElement.textContent();
      throw new Error(
        `Login failed: ${errorText?.trim() || "Invalid credentials"}`
      );
    }

    log.info("AADE login successful");
  };

  protected extractDebts = async (): Promise<ScrapedDebt[]> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    await this.page.goto(AADE_DEBTS_URL, { waitUntil: "networkidle" });

    // NOTE: These selectors are placeholders — update after inspecting the real debts page
    const rows = await this.page.$$("table tbody tr, .debt-row");

    if (rows.length === 0) {
      log.info("No debt rows found");
      return [];
    }

    const debts: ScrapedDebt[] = [];

    for (const row of rows) {
      try {
        const cells = await row.$$("td");
        if (cells.length < 3) continue;

        const descriptionText =
          (await cells[0]?.textContent())?.trim() ?? "";
        const amountText =
          (await cells[1]?.textContent())?.trim() ?? "0";

        // Parse Greek-formatted amount: "1.234,56" → 1234.56
        const amount = parseGreekAmount(amountText);
        if (amount <= 0) continue;

        const category = classifyDebtCategory(descriptionText);

        debts.push({
          category,
          amount,
          platform: "AADE",
          priority: amount > 5000 ? "HIGH" : amount > 1000 ? "MEDIUM" : "LOW",
          description: descriptionText || null,
          dueDate: null,
        });
      } catch (error) {
        log.warn({ error }, "Failed to parse debt row");
      }
    }

    log.info({ count: debts.length }, "Debts extracted from AADE");
    return debts;
  };

  protected logout = async (): Promise<void> => {
    if (!this.page) return;

    try {
      await this.page.click('a[href*="logout"], .logout-btn, #logout');
      await this.page.waitForNavigation({ timeout: 5_000 });
    } catch {
      // Best effort logout
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────

const parseGreekAmount = (text: string): number => {
  // Remove currency symbols and whitespace
  const cleaned = text.replace(/[€\s]/g, "");
  // Greek format: 1.234,56 → 1234.56
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  return isNaN(amount) ? 0 : amount;
};

const classifyDebtCategory = (
  description: string
): ScrapedDebt["category"] => {
  const lower = description.toLowerCase();

  if (lower.includes("φπα") || lower.includes("vat")) return "VAT";
  if (lower.includes("εφκα") || lower.includes("ασφαλιστικ"))
    return "EFKA";
  if (lower.includes("φόρος εισοδήματος") || lower.includes("εισόδημα"))
    return "INCOME_TAX";
  if (lower.includes("ενφια") || lower.includes("ακίνητ")) return "ENFIA";
  if (lower.includes("τέλη κυκλοφορίας") || lower.includes("κυκλοφορ"))
    return "VEHICLE_TAX";
  if (lower.includes("γεμη") || lower.includes("gemi")) return "GEMI";
  if (lower.includes("επιτήδευμα") || lower.includes("επαγγελματικ"))
    return "PROFESSIONAL_TAX";
  if (lower.includes("προκαταβολ")) return "TAX_PREPAYMENT";
  if (lower.includes("δημοτικ") || lower.includes("τέλη δήμου"))
    return "MUNICIPAL_TAX";

  return "CERTIFIED_DEBTS";
};
