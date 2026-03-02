import type { Platform } from "@repo/shared";
import type { ScrapedFile } from "../ai";
import { BaseScraper, type ScrapedDebt } from "./base-scraper";
import { logger } from "../utils/logger";
import { saveDebugMarkdown } from "../utils/debug-log";
import { loginViaTaxisNet } from "../utils/taxisnet-login";

// ── EFKA Scraper ─────────────────────────────────────────────────
//
// Uses Contributions.aspx which has everything on one page:
//   - Current debt amount, RF code, due date (reliable CSS selectors)
//   - PDF "Ειδοποιητήριο" download button
//   - Monthly contributions grid
//
// Flow:
//   1. Login via TaxisNet → AMKA entry
//   2. Navigate to Contributions.aspx
//   3. Extract debt from known selectors (amount, RF code, due date)
//   4. Download PDF via the "Ειδοποιητήριο" button
//   5. Capture screenshot for debug

const EFKA_CONTRIBUTIONS_URL =
  "https://www.idika.org.gr/EfkaServices/Application/Contributions.aspx";

// ── Known selectors on Contributions.aspx ──
const SELECTORS = {
  rfCode: "#ContentPlaceHolder1_panelEidop_maineFormLayout_elabelRFcode",
  amount: "#ContentPlaceHolder1_panelEidop_maineFormLayout_elabelAmount",
  dueDate: "#ContentPlaceHolder1_panelEidop_maineFormLayout_elabelPaymentExpireDate",
  pdfButton: "#ContentPlaceHolder1_panelEidop_maineFormLayout_ebtnEidopoiitirio",
  contributionsGrid: "#ContentPlaceHolder1_GridE20MonthlyContributions",
} as const;

export class EFKAScraper extends BaseScraper {
  readonly platform: Platform = "EFKA";
  readonly name = "EFKA";

  protected login = async (): Promise<void> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    if (!this.credentials.amka) {
      throw new Error("Client has no AMKA — required for EFKA login");
    }

    // Shared TaxisNet OAuth flow (entry → credentials → consent)
    await loginViaTaxisNet(this.page, {
      username: this.credentials.username,
      password: this.credentials.password,
    });

    // EFKA-specific: Fill AMKA and enter
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

  protected extractDebts = async (): Promise<{ debts: ScrapedDebt[]; files: ScrapedFile[] }> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });
    const files: ScrapedFile[] = [];

    // Navigate to Contributions page (has everything we need)
    await this.page.goto(EFKA_CONTRIBUTIONS_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(3_000);
    log.info("Navigated to Contributions page");

    // Capture screenshot for debug/storage
    const screenshotBuffer = await this.page.screenshot({ fullPage: true });
    files.push({
      buffer: screenshotBuffer,
      fileName: this.buildFileName("contributions", "png"),
      contentType: "image/png",
    });

    // Extract debt from known selectors
    const debts: ScrapedDebt[] = [];

    try {
      const { amount, rfCode, dueDate } = await this.extractFromSelectors();

      if (amount > 0) {
        debts.push({
          category: "EFKA",
          amount,
          platform: "EFKA",
          priority: amount > 5000 ? "HIGH" : amount > 1000 ? "MEDIUM" : "LOW",
          description: "Εισφορές ΕΦΚΑ",
          dueDate,
          rfCode,
        });
        log.info({ amount, rfCode, dueDate }, "Main debt extracted from selectors");
      } else {
        log.info("No current debt amount found (amount is 0 or missing)");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn({ error: msg }, "Selector extraction failed, falling back to table parsing");
      const fallbackDebts = await this.fallbackTableParse();
      debts.push(...fallbackDebts);
    }

    // Try to download the PDF "Ειδοποιητήριο"
    try {
      const pdfFile = await this.downloadEidopoiitirio();
      if (pdfFile) {
        files.push(pdfFile);
        log.info({ fileName: pdfFile.fileName }, "PDF Ειδοποιητήριο downloaded");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn({ error: msg }, "PDF download failed, continuing without PDF");
    }

    // Debug: save extraction summary
    saveDebugMarkdown(this.name, "extraction-summary", {
      parsedResult: { debts, fileCount: files.length },
      notes: `Debts: ${debts.length}\nFiles: ${files.length}\nTotal: ${debts.reduce((s, d) => s + d.amount, 0)}`,
    });

    log.info({ totalDebts: debts.length, totalFiles: files.length }, "EFKA extraction complete");
    return { debts, files };
  };

  /** Extract amount, RF code, and due date from known CSS selectors */
  private extractFromSelectors = async (): Promise<{
    amount: number;
    rfCode: string | null;
    dueDate: Date | null;
  }> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    // Amount
    const amountText = await this.getTextFromSelector(SELECTORS.amount);
    const amount = amountText ? parseGreekAmount(amountText) : 0;
    log.info({ amountText, amount }, "Amount extracted");

    // RF Code
    const rfCode = await this.getTextFromSelector(SELECTORS.rfCode);
    log.info({ rfCode }, "RF code extracted");

    // Due Date
    const dueDateText = await this.getTextFromSelector(SELECTORS.dueDate);
    const dueDate = dueDateText ? parseGreekDate(dueDateText) : null;
    log.info({ dueDateText, dueDate }, "Due date extracted");

    // Debug log all extracted values
    saveDebugMarkdown(this.name, "selector-extraction", {
      parsedResult: { amountText, amount, rfCode, dueDateText, dueDate },
      notes: `Amount: ${amountText} → ${amount}\nRF: ${rfCode}\nDue: ${dueDateText} → ${dueDate}`,
    });

    return { amount, rfCode, dueDate };
  };

  /** Get text content from a selector, returns null if not found */
  private getTextFromSelector = async (selector: string): Promise<string | null> => {
    if (!this.page) return null;
    try {
      const element = await this.page.$(selector);
      if (!element) return null;
      const text = await element.textContent();
      return text?.trim() || null;
    } catch {
      return null;
    }
  };

  /** Download the PDF "Ειδοποιητήριο" from the button on Contributions.aspx */
  private downloadEidopoiitirio = async (): Promise<ScrapedFile | null> => {
    if (!this.page) return null;
    const log = logger.child({ scraper: this.name });

    const button = await this.page.$(SELECTORS.pdfButton);
    if (!button) return null;

    // The button opens the PDF in a NEW TAB (form target="_blank" via PrintePDFNotification).
    // Listen at the browser context level to catch the new page.
    const context = this.page.context();
    const newPagePromise = context.waitForEvent("page", { timeout: 30_000 });

    await button.click();
    log.info("Clicked PDF button, waiting for new tab...");

    const pdfPage = await newPagePromise;
    log.info({ url: pdfPage.url() }, "New tab opened");

    // Wait for the PDF page to fully load
    await pdfPage.waitForLoadState("load");
    const pdfUrl = pdfPage.url();
    log.info({ pdfUrl }, "PDF tab loaded");

    // Fetch the PDF bytes using the context's request API (keeps session cookies)
    const response = await context.request.get(pdfUrl);
    const buffer = Buffer.from(await response.body());
    log.info({ size: buffer.length }, "PDF bytes captured");

    await pdfPage.close();

    return { buffer, fileName: this.buildFileName("eidopoiitirio", "pdf"), contentType: "application/pdf" };
  };

  /** Fallback: parse the contributions grid table if selectors fail */
  private fallbackTableParse = async (): Promise<ScrapedDebt[]> => {
    if (!this.page) return [];
    const log = logger.child({ scraper: this.name });

    const rows = await this.page.$$(`${SELECTORS.contributionsGrid} tbody tr`);
    if (rows.length === 0) {
      // Try generic table as last resort
      const genericRows = await this.page.$$("table tbody tr");
      if (genericRows.length === 0) {
        log.info("No table rows found on Contributions page");
        return [];
      }
      return this.parseTableRows(genericRows);
    }

    return this.parseTableRows(rows);
  };

  /** Parse table rows into ScrapedDebt[] */
  private parseTableRows = async (rows: Awaited<ReturnType<NonNullable<typeof this.page>["$$"]>>): Promise<ScrapedDebt[]> => {
    const log = logger.child({ scraper: this.name });
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
        log.warn({ error }, "Failed to parse table row");
      }
    }

    log.info({ count: debts.length }, "Debts extracted via fallback table parsing");
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

/** Parse Greek-formatted amount: "160,46" or "1.234,56" → number */
const parseGreekAmount = (text: string): number => {
  const cleaned = text.replace(/[€\s]/g, "");
  // Greek format: 1.234,56 → 1234.56
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  return isNaN(amount) ? 0 : amount;
};

/** Parse Greek date format: "27/02/2026" → Date */
const parseGreekDate = (text: string): Date | null => {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}`);
  return isNaN(date.getTime()) ? null : date;
};
