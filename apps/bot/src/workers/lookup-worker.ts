import { Worker, type Job } from "bullmq";
import {
  LOOKUP_QUEUE_NAME,
  getRedisConnectionOptions,
  type LookupJobPayload,
  type LookupJobResult,
} from "@repo/shared";
import { createBrowserContext, closeBrowserContext } from "../utils/browser";
import { logger } from "../utils/logger";
import { loginViaTaxisNet } from "../utils/taxisnet-login";

// ── EFKA Registry Selectors ──────────────────────────────────────

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
    // Shared TaxisNet OAuth flow (entry → credentials → consent)
    await loginViaTaxisNet(page, {
      username: taxisnetUsername,
      password: taxisnetPassword,
    });

    // Navigate directly to Registry
    await page.goto(EFKA_REGISTRY_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);
    log.info("Navigated to EFKA Registry");

    // Extract data from Registry page
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
    // Clear sensitive credentials from memory
    job.data.taxisnetUsername = "";
    job.data.taxisnetPassword = "";
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
