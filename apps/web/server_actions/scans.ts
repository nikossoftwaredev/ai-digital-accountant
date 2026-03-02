"use server";

import { createScanQueue, prisma, type ScanJobPayload } from "@repo/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAuditEvent } from "@/lib/auth/audit";
import { getAccountantId } from "@/lib/auth/session";

// ── Constants ─────────────────────────────────────────────────────

const SCAN_COOLDOWN_HOURS = 6;

// ── Queue Singleton ──────────────────────────────────────────────

let scanQueueSingleton: ReturnType<typeof createScanQueue> | null = null;

const getScanQueue = () => {
  if (!scanQueueSingleton) {
    scanQueueSingleton = createScanQueue();
  }
  return scanQueueSingleton;
};

// ── Schemas ──────────────────────────────────────────────────────

const startScanSchema = z.object({
  clientId: z.string().min(1),
  platforms: z.array(z.enum(["AADE", "EFKA", "GEMI", "MUNICIPALITY"])).min(1),
});

// ── Types ────────────────────────────────────────────────────────

export type ScanRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientAfm: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  startedAt: string | null;
  completedAt: string | null;
  totalDebtsFound: number;
  errorMessage: string | null;
  errorType: string | null;
  platformStatuses: unknown;
  createdAt: string;
};

export type ScanDebtRow = {
  id: string;
  category: string;
  amount: number;
  platform: string;
  priority: string;
  description: string | null;
  dueDate: string | null;
  documentUrl: string | null;
};

export type ScanStatusResult = {
  scan: ScanRow;
  debts: ScanDebtRow[];
};

// ── startScan ────────────────────────────────────────────────────

export const startScan = async (
  data: z.input<typeof startScanSchema>
): Promise<{ success: boolean; scanId?: string; error?: string }> => {
  const accountantId = await getAccountantId();

  const parsed = startScanSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Validation failed" };

  const { clientId, platforms } = parsed.data;

  // Verify client ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, accountantId },
    select: { id: true, name: true, lastScanAt: true, taxisnetUsername: true, taxisnetPassword: true },
  });
  if (!client) return { success: false, error: "Client not found" };

  // Check credentials exist
  if (!client.taxisnetUsername || !client.taxisnetPassword)
    return { success: false, error: "Client has no TaxisNet credentials" };

  // TODO: Re-enable cooldown for production
  // Rate limit: 1 scan per client per 6 hours
  // if (client.lastScanAt) {
  //   const hoursSinceLastScan =
  //     (Date.now() - client.lastScanAt.getTime()) / (1000 * 60 * 60);
  //   if (hoursSinceLastScan < SCAN_COOLDOWN_HOURS)
  //     return {
  //       success: false,
  //       error: `Scan cooldown: wait ${Math.ceil(SCAN_COOLDOWN_HOURS - hoursSinceLastScan)} more hours`,
  //     };
  // }

  // Check for already running scan
  const runningScans = await prisma.scan.count({
    where: {
      clientId,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
  if (runningScans > 0)
    return { success: false, error: "A scan is already in progress for this client" };

  // Create scan record
  const scan = await prisma.scan.create({
    data: {
      clientId,
      accountantId,
      status: "QUEUED",
    },
  });

  // Push job to BullMQ
  const queue = getScanQueue();
  const payload: ScanJobPayload = {
    scanId: scan.id,
    clientId,
    accountantId,
    platforms,
  };
  await queue.add("scan", payload);

  await logAuditEvent({
    accountantId,
    action: "SCAN_STARTED",
    clientId,
    details: { scanId: scan.id, platforms },
  });

  revalidatePath("/admin/debts");
  return { success: true, scanId: scan.id };
};

// ── startBulkScan ────────────────────────────────────────────────

const bulkScanSchema = z.object({
  platforms: z.array(z.enum(["AADE", "EFKA", "GEMI", "MUNICIPALITY"])).min(1),
});

export const startBulkScan = async (
  platforms: string[]
): Promise<{ success: boolean; scanIds?: string[]; error?: string }> => {
  const accountantId = await getAccountantId();

  const parsed = bulkScanSchema.safeParse({ platforms });
  if (!parsed.success) return { success: false, error: "Invalid platforms" };
  const validatedPlatforms = parsed.data.platforms;

  const clients = await prisma.client.findMany({
    where: {
      accountantId,
      status: { in: ["ACTIVE", "PENDING"] },
      taxisnetUsername: { not: null },
      taxisnetPassword: { not: null },
    },
    select: { id: true, lastScanAt: true },
  });

  const cooldownThreshold = new Date(
    Date.now() - SCAN_COOLDOWN_HOURS * 60 * 60 * 1000
  );
  const eligibleClients = clients.filter(
    (c) => !c.lastScanAt || c.lastScanAt < cooldownThreshold
  );

  if (eligibleClients.length === 0)
    return { success: false, error: "No eligible clients for scanning" };

  const queue = getScanQueue();
  const scanIds: string[] = [];

  for (const client of eligibleClients) {
    const scan = await prisma.scan.create({
      data: {
        clientId: client.id,
        accountantId,
        status: "QUEUED",
      },
    });

    const payload: ScanJobPayload = {
      scanId: scan.id,
      clientId: client.id,
      accountantId,
      platforms: validatedPlatforms,
    };
    await queue.add("scan", payload);
    scanIds.push(scan.id);
  }

  await logAuditEvent({
    accountantId,
    action: "SCAN_STARTED",
    details: { bulk: true, scanIds, platforms: validatedPlatforms },
  });

  revalidatePath("/admin/debts");
  return { success: true, scanIds };
};

// ── getScanStatus ────────────────────────────────────────────────

export const getScanStatus = async (
  scanId: string
): Promise<ScanStatusResult | null> => {
  const accountantId = await getAccountantId();

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, accountantId },
    include: {
      client: { select: { name: true, afm: true } },
      debts: { orderBy: { amount: "desc" } },
    },
  });

  if (!scan) return null;

  return {
    scan: {
      id: scan.id,
      clientId: scan.clientId,
      clientName: scan.client.name,
      clientAfm: scan.client.afm,
      status: scan.status,
      startedAt: scan.startedAt?.toISOString() ?? null,
      completedAt: scan.completedAt?.toISOString() ?? null,
      totalDebtsFound: Number(scan.totalDebtsFound),
      errorMessage: scan.errorMessage,
      errorType: scan.errorType,
      platformStatuses: scan.platformStatuses,
      createdAt: scan.createdAt.toISOString(),
    },
    debts: scan.debts.map((d) => ({
      id: d.id,
      category: d.category,
      amount: Number(d.amount),
      platform: d.platform,
      priority: d.priority,
      description: d.description,
      dueDate: d.dueDate?.toISOString() ?? null,
      documentUrl: d.documentUrl ?? null,
    })),
  };
};

// ── getRecentScans ───────────────────────────────────────────────

export const getRecentScans = async (
  limit = 20
): Promise<ScanRow[]> => {
  const accountantId = await getAccountantId();

  const scans = await prisma.scan.findMany({
    where: { accountantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { name: true, afm: true } },
    },
  });

  return scans.map((s) => ({
    id: s.id,
    clientId: s.clientId,
    clientName: s.client.name,
    clientAfm: s.client.afm,
    status: s.status,
    startedAt: s.startedAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    totalDebtsFound: Number(s.totalDebtsFound),
    errorMessage: s.errorMessage,
    errorType: s.errorType,
    platformStatuses: s.platformStatuses,
    createdAt: s.createdAt.toISOString(),
  }));
};

// ── getClientDebts ───────────────────────────────────────────────

export const getClientDebts = async (
  clientId: string
): Promise<ScanDebtRow[]> => {
  const accountantId = await getAccountantId();

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, accountantId },
    select: { id: true },
  });
  if (!client) return [];

  // Get debts from the latest completed scan
  const latestScan = await prisma.scan.findFirst({
    where: { clientId, accountantId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  if (!latestScan) return [];

  const debts = await prisma.debt.findMany({
    where: { scanId: latestScan.id },
    orderBy: { amount: "desc" },
  });

  return debts.map((d) => ({
    id: d.id,
    category: d.category,
    amount: Number(d.amount),
    platform: d.platform,
    priority: d.priority,
    description: d.description,
    dueDate: d.dueDate?.toISOString() ?? null,
    documentUrl: d.documentUrl ?? null,
  }));
};
