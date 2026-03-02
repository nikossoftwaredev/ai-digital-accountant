import "dotenv/config";
import { startScanWorker } from "./workers/scan-worker";
import { shutdownBrowser } from "./utils/browser";
import { logger } from "./utils/logger";

// ── Start ─────────────────────────────────────────────────────────

logger.info("@repo/bot starting...");

const worker = startScanWorker();

// ── Graceful Shutdown ─────────────────────────────────────────────

const shutdown = async () => {
  logger.info("Shutting down...");
  await worker.close();
  await shutdownBrowser();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
