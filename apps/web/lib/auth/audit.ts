import type { AuditAction, Prisma } from "@repo/shared";
import { prisma } from "@repo/shared";

interface AuditEventParams {
  accountantId?: string;
  action: AuditAction;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export const logAuditEvent = async (params: AuditEventParams): Promise<void> => {
  // Only log if we have a valid accountantId (some events like failed login may not)
  if (!params.accountantId) return;

  await prisma.auditLog.create({
    data: {
      accountantId: params.accountantId,
      action: params.action,
      clientId: params.clientId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      details: (params.details ?? {}) as Prisma.InputJsonValue,
    },
  });
};
