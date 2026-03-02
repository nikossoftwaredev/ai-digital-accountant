import { Worker, type Job } from "bullmq";
import {
  getRedisConnectionOptions,
  prisma,
  SCAN_QUEUE_NAME,
  type ScanJobPayload,
} from "@repo/shared";
import { createBrowserContext, closeBrowserContext } from "../utils/browser";
import { getClientCredentials } from "../utils/credentials";
import { AADEScraper } from "../scrapers/aade";
import { EFKAScraper } from "../scrapers/efka";
import { VehicleTaxScraper } from "../scrapers/vehicle-tax";
import type { BaseScraper, ScrapeResult } from "../scrapers/base-scraper";
import { logger } from "../utils/logger";

// ── Platform → Scraper Mapping ────────────────────────────────────

const SCRAPER_MAP: Record<
  string,
  new (...args: ConstructorParameters<typeof AADEScraper>) => BaseScraper
> = {
  AADE: AADEScraper,
  EFKA: EFKAScraper,
  MUNICIPALITY: VehicleTaxScraper,
};

// ── Process a single scan job ─────────────────────────────────────

const processScanJob = async (job: Job<ScanJobPayload>) => {
  const { scanId, clientId, platforms } = job.data;
  const log = logger.child({ scanId, clientId, jobId: job.id });

  log.info({ platforms }, "Processing scan job");

  // Mark scan as RUNNING
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  let credentials;
  try {
    credentials = await getClientCredentials(clientId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to decrypt credentials";
    log.error({ error: message }, "Credential decryption failed");

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message,
        errorType: "LOGIN_FAILED",
      },
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: "ERROR" },
    });

    return;
  }

  const context = await createBrowserContext();
  const platformResults: Array<{ platform: string; result: ScrapeResult }> = [];

  try {
    for (const platform of platforms) {
      const ScraperClass = SCRAPER_MAP[platform];
      if (!ScraperClass) {
        log.warn({ platform }, "No scraper available for platform");
        continue;
      }

      const scraper = new ScraperClass(context, credentials);
      const result = await scraper.run();
      platformResults.push({ platform, result });

      // Save debts to DB
      if (result.debts.length > 0) {
        await prisma.debt.createMany({
          data: result.debts.map((d) => ({
            clientId,
            scanId,
            category: d.category,
            amount: d.amount,
            platform: d.platform,
            priority: d.priority,
            description: d.description,
            dueDate: d.dueDate,
            documentUrl: d.documentUrl ?? null,
          })),
        });
      }

      // Update platform status in JSON
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          platformStatuses: platformResults.map((pr) => ({
            platform: pr.platform,
            success: pr.result.success,
            error: pr.result.error,
            debtCount: pr.result.debts.length,
          })),
        },
      });
    }

    // Calculate totals
    const totalDebts = platformResults.reduce(
      (sum, pr) => sum + pr.result.debts.reduce((s, d) => s + d.amount, 0),
      0
    );
    const hasErrors = platformResults.some((pr) => !pr.result.success);
    const firstError = platformResults.find((pr) => !pr.result.success);

    // Update scan record
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: hasErrors ? "FAILED" : "COMPLETED",
        completedAt: new Date(),
        totalDebtsFound: totalDebts,
        errorMessage: firstError?.result.error,
        errorType: firstError?.result.errorType,
      },
    });

    // Update client totals and status
    await prisma.client.update({
      where: { id: clientId },
      data: {
        lastScanAt: new Date(),
        totalDebts: totalDebts,
        status: hasErrors ? "ERROR" : "ACTIVE",
      },
    });

    log.info(
      { totalDebts, status: hasErrors ? "FAILED" : "COMPLETED" },
      "Scan job complete"
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message }, "Scan job crashed");

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message,
      },
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: "ERROR" },
    });
  } finally {
    await closeBrowserContext(context);
    // Clear credentials from memory
    credentials.username = "";
    credentials.password = "";
    credentials.amka = null;
  }
};

// ── Start Worker ──────────────────────────────────────────────────

export const startScanWorker = () => {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<ScanJobPayload>(
    SCAN_QUEUE_NAME,
    processScanJob,
    {
      connection,
      concurrency: 3,
      limiter: { max: 10, duration: 60_000 },
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, "Job failed");
  });

  worker.on("error", (error) => {
    logger.error({ error: error.message }, "Worker error");
  });

  logger.info("Scan worker started");
  return worker;
};
