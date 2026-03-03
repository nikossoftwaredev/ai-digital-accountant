"use server";

import {
  createCertificateQueue,
  prisma,
  type CertificateJobPayload,
  type CertificateType,
  type Prisma,
  type ScanStatus,
  type ErrorType,
} from "@repo/shared";
import { z } from "zod";

import { logAuditEvent } from "@/lib/auth/audit";
import { getAccountantId } from "@/lib/auth/session";

// ── Queue Singleton ──────────────────────────────────────────────

let certQueueSingleton: ReturnType<typeof createCertificateQueue> | null = null;

const getCertQueue = () => {
  if (!certQueueSingleton) {
    certQueueSingleton = createCertificateQueue();
  }
  return certQueueSingleton;
};

// ── Schemas ──────────────────────────────────────────────────────

const startCertificateRequestSchema = z.object({
  clientId: z.string().min(1),
  certificateType: z.enum([
    "INSURANCE_CLEARANCE",
    "TAX_CLEARANCE",
    "ENFIA",
    "TAX_ASSESSMENT",
    "REGISTRY",
    "EMPLOYER_BANK",
    "EMPLOYER_DYPA",
    "EMPLOYER_ENSYPA",
    "GEMI",
    "SOLEMN_DECLARATION",
    "AUTHORIZATION",
    "CRIMINAL_RECORD",
    "SIGNATURE_AUTH",
  ]),
  params: z.record(z.string(), z.unknown()).default({}),
});

// ── Types ────────────────────────────────────────────────────────

export type CertificateRequestRow = {
  id: string;
  clientId: string;
  certificateType: CertificateType;
  status: ScanStatus;
  params: unknown;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  errorType: ErrorType | null;
  createdAt: string;
  files: CertificateFileRow[];
};

export type CertificateFileRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
};

// ── startCertificateRequest ──────────────────────────────────────

export const startCertificateRequest = async (
  data: z.input<typeof startCertificateRequestSchema>,
): Promise<{ success: boolean; requestId?: string; error?: string }> => {
  const accountantId = await getAccountantId();

  const parsed = startCertificateRequestSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Validation failed" };

  const { clientId, certificateType, params } = parsed.data;

  // Verify client ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, accountantId },
    select: { id: true, name: true, taxisnetUsername: true, taxisnetPassword: true },
  });
  if (!client) return { success: false, error: "Client not found" };

  // Check credentials exist
  if (!client.taxisnetUsername || !client.taxisnetPassword)
    return { success: false, error: "Client has no TaxisNet credentials" };

  // Check for already-running request (same type, same client)
  const running = await prisma.certificateRequest.count({
    where: {
      clientId,
      certificateType: certificateType as CertificateType,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
  if (running > 0)
    return { success: false, error: "A certificate request is already in progress" };

  // Create certificate request record
  const request = await prisma.certificateRequest.create({
    data: {
      clientId,
      accountantId,
      certificateType: certificateType as CertificateType,
      status: "QUEUED",
      params: params as Prisma.InputJsonValue,
    },
  });

  // Push job to BullMQ
  const queue = getCertQueue();
  const payload: CertificateJobPayload = {
    requestId: request.id,
    clientId,
    accountantId,
    certificateType,
    params,
  };
  await queue.add("certificate", payload);

  await logAuditEvent({
    accountantId,
    action: "CERTIFICATE_REQUESTED",
    clientId,
    details: { requestId: request.id, certificateType, params },
  });

  return { success: true, requestId: request.id };
};

// ── getCertificateRequestStatus ──────────────────────────────────

export const getCertificateRequestStatus = async (
  requestId: string,
): Promise<CertificateRequestRow | null> => {
  const accountantId = await getAccountantId();

  const request = await prisma.certificateRequest.findFirst({
    where: { id: requestId, accountantId },
    include: {
      files: {
        select: { id: true, fileName: true, fileUrl: true, fileType: true },
      },
    },
  });

  if (!request) return null;

  return {
    id: request.id,
    clientId: request.clientId,
    certificateType: request.certificateType,
    status: request.status,
    params: request.params,
    startedAt: request.startedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    errorMessage: request.errorMessage,
    errorType: request.errorType,
    createdAt: request.createdAt.toISOString(),
    files: request.files,
  };
};
