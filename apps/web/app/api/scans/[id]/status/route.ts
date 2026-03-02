import { prisma } from "@repo/shared";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const scan = await prisma.scan.findFirst({
    where: { id, accountantId: session.user.id },
    include: {
      client: { select: { name: true, afm: true } },
      debts: { orderBy: { amount: "desc" } },
    },
  });

  if (!scan)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
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
    })),
  });
};
