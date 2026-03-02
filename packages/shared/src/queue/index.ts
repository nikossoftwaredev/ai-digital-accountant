import { Queue } from "bullmq";

// ── Constants ─────────────────────────────────────────────────────

export const SCAN_QUEUE_NAME = "scan-jobs";

// ── Types ─────────────────────────────────────────────────────────

export interface ScanJobPayload {
  scanId: string;
  clientId: string;
  accountantId: string;
  platforms: string[];
}

// ── Redis Connection Options ──────────────────────────────────────

export const getRedisConnectionOptions = () => {
  const url = new URL(
    process.env.REDIS_URL ?? "redis://localhost:6379"
  );
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
};

// ── Queue ─────────────────────────────────────────────────────────

export const createScanQueue = () =>
  new Queue<ScanJobPayload>(SCAN_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
