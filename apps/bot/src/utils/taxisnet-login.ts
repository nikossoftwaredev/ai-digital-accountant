import type { Page } from "playwright";
import { logger } from "./logger";

const EFKA_ENTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Account/GsisOAuth2Authenticate.aspx";

/**
 * Perform the TaxisNet OAuth login flow via the EFKA entry page.
 *
 * Steps: EFKA entry → cookie banner → ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET
 *        → fill credentials → OAuth consent
 *
 * After this the browser session is authenticated with EFKA.
 * Callers can then navigate to any EFKA page (Registry, Contributions, etc.).
 */
export const loginViaTaxisNet = async (
  page: Page,
  credentials: { username: string; password: string },
): Promise<void> => {
  const log = logger.child({ util: "taxisnet-login" });

  // Step 1: Navigate to EFKA entry point
  await page.goto(EFKA_ENTRY_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);
  log.info("Loaded EFKA entry page");

  // Step 2: Dismiss cookie banner if blocking
  try {
    await page.locator("text=ΚΛΕΙΣΙΜΟ").click({ timeout: 3_000 });
    log.info("Dismissed cookie banner");
  } catch {
    // No cookie banner
  }

  // Step 3: Click "ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET"
  await page.locator("#ContentPlaceHolder1_btnGGPSAuth").click();
  log.info("Clicked ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET");

  // Step 4: Fill TaxisNet credentials
  const usernameField = page.getByRole("textbox", { name: "Χρήστης:" });
  await usernameField.waitFor({ state: "visible", timeout: 15_000 });
  await usernameField.fill(credentials.username);
  await page.getByRole("textbox", { name: "Κωδικός:" }).fill(credentials.password);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  log.info("Submitted TaxisNet credentials");

  // Step 5: OAuth consent — click "Αποστολή"
  const consentBtn = page.getByRole("button", { name: "Αποστολή" });
  await consentBtn.waitFor({ state: "visible", timeout: 15_000 });
  await consentBtn.click();
  log.info("OAuth consent granted");

  // Wait for redirect to settle
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2_000);
  log.info("TaxisNet login complete");
};
