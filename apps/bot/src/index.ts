import "dotenv/config";
import { startScanWorker } from "./workers/scan-worker";
import { startLookupWorker } from "./workers/lookup-worker";
import { startCertificateWorker } from "./workers/certificate-worker";
import { shutdownBrowser } from "./utils/browser";
import { logger } from "./utils/logger";

// ── Start ─────────────────────────────────────────────────────────

logger.info("@repo/bot starting...");

const worker = startScanWorker();
const lookupWorker = startLookupWorker();
const certificateWorker = startCertificateWorker();

// ── Graceful Shutdown ─────────────────────────────────────────────

const shutdown = async () => {
  logger.info("Shutting down...");
  await worker.close();
  await lookupWorker.close();
  await certificateWorker.close();
  await shutdownBrowser();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
