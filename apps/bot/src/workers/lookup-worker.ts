import { Worker, type Job } from "bullmq";
import {
  LOOKUP_QUEUE_NAME,
  getRedisConnectionOptions,
  type LookupJobPayload,
  type LookupJobResult,
} from "@repo/shared";
import { createBrowserContext, closeBrowserContext } from "../utils/browser";
import { logger } from "../utils/logger";

// ── EFKA Registry Selectors ──────────────────────────────────────

const EFKA_ENTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Account/GsisOAuth2Authenticate.aspx";
const EFKA_REGISTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Application/EfkaRegistry.aspx";

const REGISTRY_SELECTORS = {
  amka: "#ContentPlaceHolder1_dAMKA",
  afm: "#ContentPlaceHolder1_dAFM",
  lastName: "#ContentPlaceHolder1_dLastName",
  firstName: "#ContentPlaceHolder1_dFirstName",
  lastNameLatin: "#ContentPlaceHolder1_dLastNameLatin",
  firstNameLatin: "#ContentPlaceHolder1_dFirstNameLatin",
} as const;

// ── Job Processor ────────────────────────────────────────────────

const processLookupJob = async (job: Job<LookupJobPayload>): Promise<LookupJobResult> => {
  const log = logger.child({ jobId: job.id, worker: "lookup" });
  const { taxisnetUsername, taxisnetPassword } = job.data;

  log.info("Starting client lookup via EFKA Registry");

  const context = await createBrowserContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to EFKA entry
    await page.goto(EFKA_ENTRY_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Dismiss cookie banner
    try {
      await page.locator("text=ΚΛΕΙΣΙΜΟ").click({ timeout: 3_000 });
    } catch { /* no banner */ }

    // Step 2: Click ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET
    await page.locator("#ContentPlaceHolder1_btnGGPSAuth").click();

    // Step 3: Fill TaxisNet credentials
    const usernameField = page.getByRole("textbox", { name: "Χρήστης:" });
    await usernameField.waitFor({ state: "visible", timeout: 15_000 });
    await usernameField.fill(taxisnetUsername);
    await page.getByRole("textbox", { name: "Κωδικός:" }).fill(taxisnetPassword);
    await page.getByRole("button", { name: "Σύνδεση" }).click();
    log.info("TaxisNet credentials submitted");

    // Step 4: OAuth consent
    const consentBtn = page.getByRole("button", { name: "Αποστολή" });
    await consentBtn.waitFor({ state: "visible", timeout: 15_000 });
    await consentBtn.click();
    log.info("OAuth consent granted");

    // Step 5: Wait for page to settle after OAuth
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    // Navigate directly to Registry
    await page.goto(EFKA_REGISTRY_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);
    log.info("Navigated to EFKA Registry");

    // Step 6: Extract data from Registry page
    const getValue = async (selector: string): Promise<string> => {
      const el = await page.$(selector);
      if (!el) return "";
      const value = await el.getAttribute("value");
      return value?.trim() ?? "";
    };

    const result: LookupJobResult = {
      amka: await getValue(REGISTRY_SELECTORS.amka),
      afm: await getValue(REGISTRY_SELECTORS.afm),
      lastName: await getValue(REGISTRY_SELECTORS.lastName),
      firstName: await getValue(REGISTRY_SELECTORS.firstName),
      lastNameLatin: await getValue(REGISTRY_SELECTORS.lastNameLatin),
      firstNameLatin: await getValue(REGISTRY_SELECTORS.firstNameLatin),
    };

    log.info({ result }, "Client data extracted from EFKA Registry");

    if (!result.afm && !result.amka) {
      throw new Error("No data found on EFKA Registry — login may have failed or AMKA step required");
    }

    return result;
  } finally {
    await page.close().catch(() => {});
    await closeBrowserContext(context);
  }
};

// ── Worker ───────────────────────────────────────────────────────

export const startLookupWorker = () => {
  const worker = new Worker<LookupJobPayload, LookupJobResult>(
    LOOKUP_QUEUE_NAME,
    processLookupJob,
    {
      connection: getRedisConnectionOptions(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "Lookup job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Lookup job failed");
  });

  logger.info("Lookup worker started");
  return worker;
};
