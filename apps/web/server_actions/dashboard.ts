"use server";

import { prisma, type DebtCategory, type Platform } from "@repo/shared";

import { getAccountantId } from "@/lib/auth/session";

// ── Types ────────────────────────────────────────────────────────

export type DashboardStats = {
  totalDebts: number;
  activeClients: number;
  connectionErrors: number;
  lastScanDate: string | null;
};

export type RecentDebt = {
  id: string;
  clientName: string;
  category: DebtCategory;
  amount: number;
  platform: Platform;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
};

// ── getDashboardStats ────────────────────────────────────────────

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const accountantId = await getAccountantId();

  const [debtAgg, activeCount, errorCount, lastScan] = await Promise.all([
    // Sum of all clients' totalDebts
    prisma.client.aggregate({
      where: { accountantId },
      _sum: { totalDebts: true },
    }),

    // Count of ACTIVE clients
    prisma.client.count({
      where: { accountantId, status: "ACTIVE" },
    }),

    // Count of ERROR clients
    prisma.client.count({
      where: { accountantId, status: "ERROR" },
    }),

    // Most recent completed scan
    prisma.scan.findFirst({
      where: { accountantId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);

  return {
    totalDebts: Number(debtAgg._sum.totalDebts ?? 0),
    activeClients: activeCount,
    connectionErrors: errorCount,
    lastScanDate: lastScan?.completedAt?.toISOString() ?? null,
  };
};

// ── getRecentDebts ───────────────────────────────────────────────

export const getRecentDebts = async (): Promise<RecentDebt[]> => {
  const accountantId = await getAccountantId();

  const debts = await prisma.debt.findMany({
    where: { client: { accountantId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      category: true,
      amount: true,
      platform: true,
      description: true,
      dueDate: true,
      createdAt: true,
      client: {
        select: { name: true },
      },
    },
  });

  return debts.map((d) => ({
    id: d.id,
    clientName: d.client.name,
    category: d.category,
    amount: Number(d.amount),
    platform: d.platform,
    description: d.description,
    dueDate: d.dueDate?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));
};
