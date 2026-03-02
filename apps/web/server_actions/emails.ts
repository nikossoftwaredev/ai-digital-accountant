"use server";

import { prisma, type EmailStatus } from "@repo/shared";
import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/auth/audit";
import { getAccountantId } from "@/lib/auth/session";
import {
  sendBulkNotifications,
  sendDebtNotification,
} from "@/lib/email/send-notification";

// ── Types ────────────────────────────────────────────────────────

export type EmailLogRow = {
  id: string;
  clientId: string;
  clientName: string;
  recipientEmail: string;
  subject: string;
  sentAt: string | null;
  status: EmailStatus;
  errorMessage: string | null;
  createdAt: string;
};

// ── getEmailLogs ─────────────────────────────────────────────────

export const getEmailLogs = async (limit = 50): Promise<EmailLogRow[]> => {
  const accountantId = await getAccountantId();

  const logs = await prisma.emailLog.findMany({
    where: { accountantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { name: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    clientId: l.clientId,
    clientName: l.client.name,
    recipientEmail: l.recipientEmail,
    subject: l.subject,
    sentAt: l.sentAt?.toISOString() ?? null,
    status: l.status,
    errorMessage: l.errorMessage,
    createdAt: l.createdAt.toISOString(),
  }));
};

// ── sendEmailToClient ────────────────────────────────────────────

export const sendEmailToClient = async ({
  clientId,
  scanId,
}: {
  clientId: string;
  scanId: string;
}): Promise<{ success: boolean; error?: string }> => {
  const accountantId = await getAccountantId();

  const result = await sendDebtNotification({
    accountantId,
    clientId,
    scanId,
  });

  if (result.success) {
    await logAuditEvent({
      accountantId,
      action: "EMAIL_SENT",
      clientId,
      details: { scanId },
    });
  }

  revalidatePath("/admin/emails");
  return result;
};

// ── sendBulkEmails ───────────────────────────────────────────────

export const sendBulkEmails = async (
  clientIds: string[]
): Promise<{ success: boolean; sent?: number; failed?: number; error?: string }> => {
  const accountantId = await getAccountantId();

  if (clientIds.length === 0)
    return { success: false, error: "No clients selected" };

  // Verify ownership
  const ownedClients = await prisma.client.findMany({
    where: { id: { in: clientIds }, accountantId },
    select: { id: true },
  });

  const ownedIds = ownedClients.map((c) => c.id);

  const result = await sendBulkNotifications({
    accountantId,
    clientIds: ownedIds,
  });

  if (result.sent > 0) {
    await logAuditEvent({
      accountantId,
      action: "EMAIL_SENT",
      details: {
        bulk: true,
        sent: result.sent,
        failed: result.failed,
      },
    });
  }

  revalidatePath("/admin/emails");
  return {
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
    error: result.errors.length > 0 ? result.errors[0] : undefined,
  };
};

// ── getClientEmailLogs ──────────────────────────────────────────

export type ClientEmailLogRow = {
  id: string;
  recipientEmail: string;
  subject: string;
  status: EmailStatus;
  sentAt: string | null;
  createdAt: string;
};

export const getClientEmailLogs = async (clientId: string, limit = 20): Promise<ClientEmailLogRow[]> => {
  const accountantId = await getAccountantId();

  const logs = await prisma.emailLog.findMany({
    where: { clientId, accountantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      status: true,
      sentAt: true,
      createdAt: true,
    },
  });

  return logs.map((l) => ({
    id: l.id,
    recipientEmail: l.recipientEmail,
    subject: l.subject,
    status: l.status,
    sentAt: l.sentAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
};

// ── getClientsWithDebts ──────────────────────────────────────────

export type ClientWithDebtInfo = {
  id: string;
  name: string;
  afm: string;
  email: string | null;
  totalDebts: number;
  lastScanAt: string | null;
};

export const getClientsWithDebts = async (): Promise<ClientWithDebtInfo[]> => {
  const accountantId = await getAccountantId();

  const clients = await prisma.client.findMany({
    where: {
      accountantId,
      totalDebts: { gt: 0 },
      email: { not: null },
    },
    orderBy: { totalDebts: "desc" },
    select: {
      id: true,
      name: true,
      afm: true,
      email: true,
      totalDebts: true,
      lastScanAt: true,
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    afm: c.afm,
    email: c.email,
    totalDebts: Number(c.totalDebts),
    lastScanAt: c.lastScanAt?.toISOString() ?? null,
  }));
};
