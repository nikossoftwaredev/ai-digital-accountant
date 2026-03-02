import type { Platform } from "@repo/shared";
import {
  extractDebtsFromScreenshot,
  downloadAndAnalyzeDocuments,
  captureScreenshotFile,
  mapAIDebtToScrapedDebt,
  type ScrapedFile,
} from "../ai";
import { BaseScraper, type ScrapedDebt } from "./base-scraper";
import { logger } from "../utils/logger";

// ── AADE / TaxisNet Scraper ───────────────────────────────────────
//
// Two-phase AI extraction:
//   Phase 1: Screenshot → Claude identifies debts + downloadable documents
//   Phase 2: Playwright downloads identified docs → Claude reads PDFs → enriches data
//
// NOTE: Login selectors are still placeholders — update during live testing.

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

  protected extractDebts = async (): Promise<{ debts: ScrapedDebt[]; files: ScrapedFile[] }> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });
    const files: ScrapedFile[] = [];

    await this.page.goto(AADE_DEBTS_URL, { waitUntil: "networkidle" });
    await this.page.waitForTimeout(3_000);

    // Phase 1: Screenshot → AI identifies debts + downloadable documents
    const screenshot = await this.page.screenshot({ fullPage: true });
    log.info("Screenshot captured for AI analysis");

    // Save screenshot as a file
    files.push(await captureScreenshotFile(this.page, "aade-debts"));

    const aiResult = await extractDebtsFromScreenshot(
      screenshot,
      "AADE (Greek Tax Authority / ΑΑΔΕ) debts page. This shows tax debts including: VAT (ΦΠΑ), income tax (φόρος εισοδήματος), ENFIA property tax, professional tax (τέλος επιτηδεύματος), certified debts (βεβαιωμένες οφειλές). Extract all visible debt entries with amounts and categories. Also identify any clickable PDF downloads or document links."
    );

    let debts = aiResult.debts.map((d) => mapAIDebtToScrapedDebt(d, "AADE"));
    log.info(
      { count: debts.length, totalAmount: aiResult.totalAmount, documents: aiResult.downloadableDocuments.length },
      "Phase 1: AI page analysis complete"
    );

    // Phase 2: Download identified documents → AI reads them → enrich
    if (aiResult.downloadableDocuments.length > 0) {
      const { enrichedDebts, files: docFiles } = await downloadAndAnalyzeDocuments(
        this.page,
        aiResult.downloadableDocuments,
        "AADE (Greek Tax Authority) document"
      );

      files.push(...docFiles);

      // Merge enriched debts (from PDFs) with existing debts
      if (enrichedDebts.length > 0) {
        const pdfDebts = enrichedDebts.map((d) => mapAIDebtToScrapedDebt(d, "AADE"));
        debts = mergeDebts(debts, pdfDebts);
        log.info({ enrichedCount: pdfDebts.length }, "Phase 2: PDF debts merged");
      }
    }

    log.info({ totalDebts: debts.length, totalFiles: files.length }, "AADE extraction complete");
    return { debts, files };
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

/** Merge debts from page screenshot and PDF analysis, avoiding duplicates by description+amount */
function mergeDebts(pageDebts: ScrapedDebt[], pdfDebts: ScrapedDebt[]): ScrapedDebt[] {
  const existing = new Set(
    pageDebts.map((d) => `${d.amount}|${d.category}`)
  );

  const newDebts = pdfDebts.filter(
    (d) => !existing.has(`${d.amount}|${d.category}`)
  );

  return [...pageDebts, ...newDebts];
}
