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
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const url = new URL(redisUrl);

  if (process.env.NODE_ENV === "production" && !url.password) {
    console.warn("[SECURITY] Redis has no password set in production — this is unsafe");
  }

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

// ── Client Lookup Queue ──────────────────────────────────────────

export const LOOKUP_QUEUE_NAME = "lookup-jobs";

export interface LookupJobPayload {
  jobId: string;
  accountantId: string;
  taxisnetUsername: string;
  taxisnetPassword: string;
}

export interface LookupJobResult {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  afm: string;
  amka: string;
}

export const createLookupQueue = () =>
  new Queue<LookupJobPayload>(LOOKUP_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  });

// ── Certificate Queue ────────────────────────────────────────────

export const CERTIFICATE_QUEUE_NAME = "certificate-jobs";

export interface CertificateJobPayload {
  requestId: string;
  clientId: string;
  accountantId: string;
  certificateType: string;
  params: Record<string, unknown>;
}

export const createCertificateQueue = () =>
  new Queue<CertificateJobPayload>(CERTIFICATE_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
