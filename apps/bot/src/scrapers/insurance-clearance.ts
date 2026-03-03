import type { BrowserContext, Page } from "playwright";
import type { ErrorType } from "@repo/shared";
import type { ClientCredentials } from "../utils/credentials";
import type { ScrapedFile } from "../ai";
import { fillTaxisNetCredentials } from "../utils/taxisnet-login";
import { logger } from "../utils/logger";
import { resetDebugLog, saveDebugMarkdown } from "../utils/debug-log";

// ── Insurance Clearance Certificate Scraper ──────────────────────
//
// Portal: apps.e-efka.gov.gr/eClearanceCertTaxis/
// Flow:
//   1. Navigate to entry page → TaxisNet login
//   2. Navigate to insurance request form
//   3. Select the purpose flag checkbox
//   4. Submit the form
//   5. Wait for result page
//   6. Capture screenshot + PDF if available
//

const ENTRY_URL =
  "https://apps.e-efka.gov.gr/eClearanceCertTaxis/";
const REQUEST_PAGE_URL =
  "https://apps.e-efka.gov.gr/eClearanceCertTaxis/faces/secureUser/insuranceRequestCommonOper.xhtml";

const SCRAPE_TIMEOUT = 120_000;

// ── Result Type ──────────────────────────────────────────────────

export interface CertificateScrapeResult {
  success: boolean;
  files: ScrapedFile[];
  error?: string;
  errorType?: ErrorType;
}

// ── Scraper ──────────────────────────────────────────────────────

export class InsuranceClearanceScraper {
  private context: BrowserContext;
  private page: Page | null = null;
  private credentials: ClientCredentials;
  private purposeFlag: string;

  constructor(
    context: BrowserContext,
    credentials: ClientCredentials,
    purposeFlag: string,
  ) {
    this.context = context;
    this.credentials = credentials;
    this.purposeFlag = purposeFlag;
  }

  run = async (): Promise<CertificateScrapeResult> => {
    const log = logger.child({ scraper: "InsuranceClearance" });

    const scrapePromise = this.doScrape(log);
    const timeoutPromise = new Promise<CertificateScrapeResult>((_, reject) =>
      setTimeout(() => reject(new Error("Scrape timeout exceeded")), SCRAPE_TIMEOUT),
    );

    try {
      return await Promise.race([scrapePromise, timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log.error({ error: message }, "Insurance clearance scrape failed");
      const errorType = this.classifyError(message);
      return { success: false, files: [], error: message, errorType };
    } finally {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
    }
  };

  private doScrape = async (log: typeof logger): Promise<CertificateScrapeResult> => {
    resetDebugLog();
    this.page = await this.context.newPage();
    const files: ScrapedFile[] = [];

    log.info({ purposeFlag: this.purposeFlag }, "Starting insurance clearance scrape");

    saveDebugMarkdown("InsuranceClearance", "start", {
      notes: `Scraper: InsuranceClearance\nPurpose: ${this.purposeFlag}\nStarted: ${new Date().toISOString()}`,
    });

    // ── Step 1: Login via TaxisNet ──
    await this.login(log);

    // ── Step 2: Navigate to the request form ──
    await this.page.goto(REQUEST_PAGE_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(3_000);
    log.info("Navigated to insurance request form");

    // Capture screenshot of form page
    const formScreenshot = await this.page.screenshot({ fullPage: true });
    files.push({
      buffer: formScreenshot,
      fileName: this.buildFileName("form", "png"),
      contentType: "image/png",
    });

    saveDebugMarkdown("InsuranceClearance", "form-page", {
      notes: "Insurance request form loaded",
    });

    // ── Step 3: Select the purpose flag checkbox ──
    await this.selectPurposeFlag(log);

    // ── Step 4: Submit the form ──
    await this.submitForm(log);

    // ── Step 5: Capture the result ──
    const resultFiles = await this.captureResult(log);
    files.push(...resultFiles);

    saveDebugMarkdown("InsuranceClearance", "complete", {
      notes: `Scrape complete. Files: ${files.length}`,
    });

    log.info({ fileCount: files.length }, "Insurance clearance scrape complete");
    return { success: true, files };
  };

  private login = async (log: typeof logger): Promise<void> => {
    if (!this.page) throw new Error("No page available");

    // Navigate to the eClearanceCert entry page
    await this.page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(2_000);
    log.info("Loaded eClearanceCert entry page");

    // Dismiss cookie banner if present
    try {
      await this.page.locator("text=ΚΛΕΙΣΙΜΟ").click({ timeout: 3_000 });
      log.info("Dismissed cookie banner");
    } catch {
      // No cookie banner
    }

    // The entry page should redirect to or contain a TaxisNet login button.
    // Try common patterns for the TaxisNet redirect button.
    try {
      // Pattern 1: Direct link/button to TaxisNet
      const taxisnetBtn = this.page.locator(
        'a:has-text("TAXISNET"), button:has-text("TAXISNET"), a:has-text("TaxisNet"), button:has-text("TaxisNet"), a:has-text("Είσοδος"), input[type="submit"]',
      ).first();
      await taxisnetBtn.waitFor({ state: "visible", timeout: 5_000 });
      await taxisnetBtn.click();
      log.info("Clicked TaxisNet login button");
    } catch {
      // The page may auto-redirect to TaxisNet; proceed to fill credentials
      log.info("No explicit TaxisNet button found, page may auto-redirect");
    }

    await this.page.waitForTimeout(2_000);

    // Fill TaxisNet credentials (reusable utility)
    await fillTaxisNetCredentials(this.page, {
      username: this.credentials.username,
      password: this.credentials.password,
    });

    log.info("TaxisNet login complete for eClearanceCert");

    saveDebugMarkdown("InsuranceClearance", "login-success", {
      notes: "Login completed successfully",
    });
  };

  private selectPurposeFlag = async (log: typeof logger): Promise<void> => {
    if (!this.page) throw new Error("No page available");

    // The form has checkboxes with IDs matching the flag names (e.g. "flagEkkath").
    // Try by ID first, then by label text.
    const checkbox = this.page.locator(`#${this.purposeFlag}, input[name*="${this.purposeFlag}"], input[id*="${this.purposeFlag}"]`).first();

    try {
      await checkbox.waitFor({ state: "visible", timeout: 10_000 });
      await checkbox.check();
      log.info({ purposeFlag: this.purposeFlag }, "Purpose flag checkbox selected");
    } catch {
      // Fallback: try clicking a label that contains the flag
      log.warn({ purposeFlag: this.purposeFlag }, "Direct checkbox selector failed, trying label click");
      const label = this.page.locator(`label[for*="${this.purposeFlag}"]`).first();
      await label.click({ timeout: 5_000 });
      log.info({ purposeFlag: this.purposeFlag }, "Purpose flag selected via label");
    }

    await this.page.waitForTimeout(1_000);
  };

  private submitForm = async (log: typeof logger): Promise<void> => {
    if (!this.page) throw new Error("No page available");

    // Look for submit button — common patterns in Greek government portals
    const submitBtn = this.page.locator(
      'button:has-text("Υποβολή"), input[type="submit"]:has-text("Υποβολή"), button:has-text("Αίτηση"), a:has-text("Υποβολή"), input[value="Υποβολή"]',
    ).first();

    try {
      await submitBtn.waitFor({ state: "visible", timeout: 10_000 });
      await submitBtn.click();
      log.info("Clicked submit button");
    } catch {
      // Fallback: try any submit button on the page
      log.warn("Named submit button not found, trying generic submit");
      await this.page.locator('input[type="submit"], button[type="submit"]').first().click();
      log.info("Clicked generic submit button");
    }

    // Wait for result page to load
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(5_000);
    log.info("Form submitted, result page loaded");
  };

  private captureResult = async (log: typeof logger): Promise<ScrapedFile[]> => {
    if (!this.page) return [];
    const files: ScrapedFile[] = [];

    // Capture full-page screenshot of the result
    const resultScreenshot = await this.page.screenshot({ fullPage: true });
    files.push({
      buffer: resultScreenshot,
      fileName: this.buildFileName("result", "png"),
      contentType: "image/png",
    });
    log.info("Result screenshot captured");

    // Try to find and download a PDF link/button
    try {
      const pdfLink = this.page.locator(
        'a[href*=".pdf"], a:has-text("PDF"), a:has-text("Εκτύπωση"), button:has-text("PDF"), a:has-text("Λήψη")',
      ).first();

      const isVisible = await pdfLink.isVisible().catch(() => false);
      if (isVisible) {
        // Try downloading via new tab
        const context = this.page.context();
        const newPagePromise = context.waitForEvent("page", { timeout: 15_000 });
        await pdfLink.click();
        log.info("Clicked PDF link, waiting for new tab...");

        try {
          const pdfPage = await newPagePromise;
          await pdfPage.waitForLoadState("load");
          const pdfUrl = pdfPage.url();

          const response = await context.request.get(pdfUrl);
          const buffer = Buffer.from(await response.body());

          if (buffer.length > 0) {
            files.push({
              buffer,
              fileName: this.buildFileName("certificate", "pdf"),
              contentType: "application/pdf",
            });
            log.info({ size: buffer.length }, "PDF certificate captured");
          }

          await pdfPage.close();
        } catch {
          // PDF might open in same tab or download directly
          log.warn("PDF download via new tab failed, continuing with screenshot only");
        }
      } else {
        log.info("No PDF link found on result page");
      }
    } catch {
      log.info("No PDF available, screenshot only");
    }

    return files;
  };

  /** Generate a compact filename: INSURANCE_CERT_{LastName}_{flag}_{DD-MM-YY}.{ext} */
  private buildFileName = (label: string, ext: string): string => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const lastName = this.credentials.clientLastName.replace(/\s+/g, "-");
    return `INSURANCE_CERT_${lastName}_${label}_${dd}-${mm}-${yy}.${ext}`;
  };

  private classifyError = (message: string): ErrorType => {
    const lower = message.toLowerCase();
    if (lower.includes("captcha")) return "CAPTCHA";
    if (lower.includes("login") || lower.includes("credentials")) return "LOGIN_FAILED";
    if (lower.includes("timeout") || lower.includes("navigation")) return "TIMEOUT";
    return "UI_CHANGED";
  };
}
