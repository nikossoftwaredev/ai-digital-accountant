import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import type { Platform } from "@repo/shared";
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
//   7. Save PDF locally for the user

const VEHICLE_TAX_ENTRY_URL =
  "https://www.gov.gr/arxes/anexartete-arkhe-demosion-esodon-aade/anexartete-arkhe-demosion-esodon-aade/tele-kuklophorias";

const DOWNLOADS_DIR = resolve(process.cwd(), "..", "..", "data", "downloads");

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

  protected extractDebts = async (): Promise<ScrapedDebt[]> => {
    if (!this.page) throw new Error("No page available");
    const log = logger.child({ scraper: this.name });

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

    // Step 7: Click the download button — triggers PDF download
    const downloadButton = this.page.getByRole("button", {
      name: "Ειδοποιητήριο Τελών Κυκλοφορίας",
    });
    await downloadButton.waitFor({ state: "visible", timeout: 15_000 });

    // Set up download + popup listeners before clicking
    // The button opens both a popup (new tab) and triggers a download
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

    // Ensure downloads directory exists
    if (!existsSync(DOWNLOADS_DIR)) {
      mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    // Save with structured filename: vehicle-tax_<clientAfm>_<timestamp>.pdf
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const suggestedName = download.suggestedFilename() || "vehicle-tax.pdf";
    const ext = suggestedName.endsWith(".pdf") ? "" : ".pdf";
    const filename = `vehicle-tax_${this.credentials.username}_${timestamp}${ext}`;
    const savePath = resolve(DOWNLOADS_DIR, filename);

    await download.saveAs(savePath);
    log.info({ savePath }, "PDF saved");

    // Return a single debt entry with the document path
    // Amount is 0 since we can't parse the PDF — the accountant will see the PDF
    const debts: ScrapedDebt[] = [
      {
        category: "VEHICLE_TAX",
        amount: 0,
        platform: "MUNICIPALITY",
        priority: "LOW",
        description: `Ειδοποιητήριο Τελών Κυκλοφορίας — ${suggestedName}`,
        dueDate: null,
        documentUrl: `/api/downloads/${filename}`,
      },
    ];

    log.info("Vehicle tax PDF debt record created");
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
