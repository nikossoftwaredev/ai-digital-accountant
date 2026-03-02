import type { Platform } from "@repo/shared";
import {
  extractDebtsFromPdf,
  captureScreenshotFile,
  mapAIDebtToScrapedDebt,
  type ScrapedFile,
} from "../ai";
import { BaseScraper, type ScrapedDebt } from "./base-scraper";
import { logger } from "../utils/logger";

// ── Vehicle Tax (Τέλη Κυκλοφορίας) Scraper ─────────────────────
//
// Flow:
//   1. Go to gov.gr vehicle tax page
//   2. Click "Είσοδος στην υπηρεσία"
//   3. Fill TaxisNet username + password → "Συνδεση"
//   4. Click "Τέλη Κυκλοφορίας Οχημάτων"
//   5. Click "Ειδοποιητήρια Τελών Κυκλοφορίας Οχημάτων"
//   6. Click "Ειδοποιητήριο Τελών Κυκλοφορίας" → downloads PDF
//   7. Read PDF into buffer → AI extracts amounts
//   8. Return debts + PDF file buffer (uploaded to Supabase by scan-worker)

const VEHICLE_TAX_ENTRY_URL =
  "https://www.gov.gr/arxes/anexartete-arkhe-demosion-esodon-aade/anexartete-arkhe-demosion-esodon-aade/tele-kuklophorias";

export class VehicleTaxScraper extends BaseScraper {
  readonly platform: Platform = "MUNICIPALITY";
  readonly name = "VehicleTax";

  protected login = async (): Promise<void> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

    // Step 1: Navigate to gov.gr vehicle tax page
    await this.page.goto(VEHICLE_TAX_ENTRY_URL, {
      waitUntil: "domcontentloaded",
    });
    await this.page.waitForTimeout(2_000);
    log.info("Loaded gov.gr vehicle tax page");

    // Step 2: Click "Είσοδος στην υπηρεσία"
    const entryLink = this.page.getByRole("link", {
      name: "Είσοδος στην υπηρεσία",
    });
    await entryLink.waitFor({ state: "visible", timeout: 15_000 });
    await entryLink.click();
    log.info("Clicked Είσοδος στην υπηρεσία");

    // Step 3: Fill TaxisNet credentials
    const usernameField = this.page.getByRole("textbox", {
      name: "Όνομα χρήστη",
    });
    await usernameField.waitFor({ state: "visible", timeout: 15_000 });
    await usernameField.fill(this.credentials.username);

    await this.page
      .getByRole("textbox", { name: "Κωδικός πρόσβασης" })
      .fill(this.credentials.password);

    // Step 4: Click "Συνδεση"
    await this.page.getByRole("button", { name: "Συνδεση" }).click();
    log.info("Submitted TaxisNet credentials");

    // Wait for post-login page to load
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3_000);
    log.info("Logged into vehicle tax portal");
  };

  protected extractDebts = async (): Promise<{ debts: ScrapedDebt[]; files: ScrapedFile[] }> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });
    const files: ScrapedFile[] = [];

    // Step 5: Click "Τέλη Κυκλοφορίας Οχημάτων"
    const vehicleTaxLink = this.page.getByText("ΤέληΚυκλοφορίας Οχημάτων");
    await vehicleTaxLink.waitFor({ state: "visible", timeout: 15_000 });
    await vehicleTaxLink.click();
    log.info("Clicked Τέλη Κυκλοφορίας Οχημάτων");
    await this.page.waitForTimeout(2_000);

    // Step 6: Click "Ειδοποιητήρια Τελών Κυκλοφορίας Οχημάτων"
    const notificationsLink = this.page.getByText(
      "Ειδοποιητήρια ΤελώνΚυκλοφορίας Οχημάτων"
    );
    await notificationsLink.waitFor({ state: "visible", timeout: 15_000 });
    await notificationsLink.click();
    log.info("Clicked Ειδοποιητήρια Τελών Κυκλοφορίας Οχημάτων");
    await this.page.waitForTimeout(3_000);

    // Capture screenshot before download
    files.push(await captureScreenshotFile(this.page, "vehicle-tax-page"));

    // Step 7: Click the download button — triggers PDF download
    const downloadButton = this.page.getByRole("button", {
      name: "Ειδοποιητήριο Τελών Κυκλοφορίας",
    });
    await downloadButton.waitFor({ state: "visible", timeout: 15_000 });

    // Set up download + popup listeners before clicking
    const popupPromise = this.page.waitForEvent("popup", { timeout: 30_000 }).catch(() => null);
    const [download] = await Promise.all([
      this.page.waitForEvent("download", { timeout: 30_000 }),
      downloadButton.click(),
    ]);

    log.info("PDF download started");

    // Close the popup tab if one opened
    const popup = await popupPromise;
    if (popup) {
      await popup.close().catch(() => {});
      log.info("Closed popup tab");
    }

    // Read download into buffer (no local filesystem save)
    const suggestedName = download.suggestedFilename() || "vehicle-tax.pdf";
    const stream = await download.createReadStream();
    if (!stream) {
      log.warn("Could not read download stream");
      return { debts: [], files };
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `vehicle-tax_${timestamp}_${suggestedName}`;
    log.info({ fileName, size: pdfBuffer.length }, "PDF downloaded into buffer");

    // Add PDF to files for Supabase upload
    files.push({
      buffer: pdfBuffer,
      fileName,
      contentType: "application/pdf",
    });

    // AI extraction: send PDF to Claude for structured extraction
    try {
      const aiResult = await extractDebtsFromPdf(
        pdfBuffer,
        "Greek vehicle tax (Τέλη Κυκλοφορίας) notification document. Extract the total amount owed, vehicle plate numbers in description, and any RF payment codes."
      );

      const debts = aiResult.debts.map((d) => ({
        ...mapAIDebtToScrapedDebt(d, "MUNICIPALITY"),
        category: "VEHICLE_TAX" as const,
      }));

      if (debts.length > 0) {
        log.info({ count: debts.length, totalAmount: aiResult.totalAmount }, "AI extracted vehicle tax debts from PDF");
        return { debts, files };
      }

      // AI found no individual entries but may have a total
      if (aiResult.totalAmount > 0) {
        log.info({ totalAmount: aiResult.totalAmount }, "AI found total amount but no individual debts");
        return {
          debts: [{
            category: "VEHICLE_TAX",
            amount: aiResult.totalAmount,
            platform: "MUNICIPALITY",
            priority: aiResult.totalAmount > 5000 ? "HIGH" : aiResult.totalAmount > 1000 ? "MEDIUM" : "LOW",
            description: `Ειδοποιητήριο Τελών Κυκλοφορίας — ${suggestedName}`,
            dueDate: null,
          }],
          files,
        };
      }
    } catch (error) {
      log.warn({ error }, "AI PDF extraction failed, falling back to amount=0");
    }

    // Fallback: return with amount=0
    return {
      debts: [{
        category: "VEHICLE_TAX",
        amount: 0,
        platform: "MUNICIPALITY",
        priority: "LOW",
        description: `Ειδοποιητήριο Τελών Κυκλοφορίας — ${suggestedName}`,
        dueDate: null,
      }],
      files,
    };
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
