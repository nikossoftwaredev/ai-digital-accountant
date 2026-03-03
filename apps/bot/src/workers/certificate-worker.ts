import { Worker, type Job } from "bullmq";
import {
  getRedisConnectionOptions,
  prisma,
  CERTIFICATE_QUEUE_NAME,
  type CertificateJobPayload,
} from "@repo/shared";
import { createBrowserContext, closeBrowserContext } from "../utils/browser";
import { getClientCredentials } from "../utils/credentials";
import { uploadFileToStorage } from "../utils/storage";
import {
  InsuranceClearanceScraper,
  type CertificateScrapeResult,
} from "../scrapers/insurance-clearance";
import type { ScrapedFile } from "../ai";
import { logger } from "../utils/logger";

// ── Certificate Type → Scraper Mapping ───────────────────────────

type CertScraperFactory = (
  ...args: ConstructorParameters<typeof InsuranceClearanceScraper>
) => { run: () => Promise<CertificateScrapeResult> };

const CERT_SCRAPER_MAP: Record<string, CertScraperFactory> = {
  INSURANCE_CLEARANCE: (context, credentials, purposeFlag) =>
    new InsuranceClearanceScraper(context, credentials, purposeFlag),
};

// ── Upload files and create ClientFile records ───────────────────

const uploadAndLinkCertFiles = async (
  files: ScrapedFile[],
  clientId: string,
  requestId: string,
) => {
  if (files.length === 0) return;

  const log = logger.child({ module: "cert-file-upload", clientId, requestId });

  for (const file of files) {
    try {
      const uploaded = await uploadFileToStorage(
        file.buffer,
        clientId,
        requestId,
        file.fileName,
        file.contentType,
      );

      await prisma.clientFile.create({
        data: {
          clientId,
          certificateRequestId: requestId,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          fileType: uploaded.fileType,
        },
      });

      log.info({ fileName: uploaded.fileName }, "Certificate file uploaded and linked");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn({ fileName: file.fileName, error: message }, "Certificate file upload failed, continuing");
    }
  }
};

// ── Process a single certificate job ─────────────────────────────

const processCertificateJob = async (job: Job<CertificateJobPayload>) => {
  const { requestId, clientId, certificateType, params } = job.data;
  const log = logger.child({ requestId, clientId, certificateType, jobId: job.id });

  log.info({ params }, "Processing certificate job");

  // Mark as RUNNING
  await prisma.certificateRequest.update({
    where: { id: requestId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  let credentials;
  try {
    credentials = await getClientCredentials(clientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to decrypt credentials";
    log.error({ error: message }, "Credential decryption failed");

    await prisma.certificateRequest.update({
      where: { id: requestId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message,
        errorType: "LOGIN_FAILED",
      },
    });
    return;
  }

  const context = await createBrowserContext();

  try {
    const scraperFactory = CERT_SCRAPER_MAP[certificateType];
    if (!scraperFactory) {
      throw new Error(`No scraper available for certificate type: ${certificateType}`);
    }

    // Extract purpose flag from params (for insurance clearance)
    const purposeFlag = (params.purposeFlag as string) ?? "flagEkkath";

    const scraper = scraperFactory(context, credentials, purposeFlag);
    const result = await scraper.run();

    if (result.success) {
      // Upload files to storage and create ClientFile records
      await uploadAndLinkCertFiles(result.files, clientId, requestId);

      await prisma.certificateRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      log.info({ fileCount: result.files.length }, "Certificate job completed successfully");
    } else {
      await prisma.certificateRequest.update({
        where: { id: requestId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: result.error,
          errorType: result.errorType,
        },
      });

      log.warn({ error: result.error }, "Certificate scrape failed");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message }, "Certificate job crashed");

    await prisma.certificateRequest.update({
      where: { id: requestId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message,
      },
    });
  } finally {
    await closeBrowserContext(context);
    // Clear credentials from memory
    credentials.username = "";
    credentials.password = "";
    credentials.amka = null;
  }
};

// ── Start Worker ─────────────────────────────────────────────────

export const startCertificateWorker = () => {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<CertificateJobPayload>(
    CERTIFICATE_QUEUE_NAME,
    processCertificateJob,
    {
      connection,
      concurrency: 2,
      limiter: { max: 5, duration: 60_000 },
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Certificate job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, "Certificate job failed");
  });

  worker.on("error", (error) => {
    logger.error({ error: error.message }, "Certificate worker error");
  });

  logger.info("Certificate worker started");
  return worker;
};
