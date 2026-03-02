import { render } from "@react-email/render";
import { prisma } from "@repo/shared";

import { createTransporter } from "./mailer";
import { DebtNotificationEmail } from "./templates/debt-notification";

// ── Helpers ──────────────────────────────────────────────────────

const formatEuro = (amount: number): string =>
  new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

// ── Send Single Notification ─────────────────────────────────────

interface SendDebtNotificationParams {
  accountantId: string;
  clientId: string;
  scanId: string;
}

export const sendDebtNotification = async ({
  accountantId,
  clientId,
  scanId,
}: SendDebtNotificationParams): Promise<{ success: boolean; error?: string }> => {
  const client = await prisma.client.findFirst({
    where: { id: clientId, accountantId },
    select: { name: true, email: true },
  });

  if (!client) return { success: false, error: "Client not found" };
  if (!client.email) return { success: false, error: "Client has no email" };

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: { officeName: true, officePhone: true },
  });

  const debts = await prisma.debt.findMany({
    where: { scanId, clientId },
    orderBy: { amount: "desc" },
  });

  if (debts.length === 0)
    return { success: false, error: "No debts to report" };

  const totalAmount = debts.reduce((sum, d) => sum + Number(d.amount), 0);

  const emailHtml = await render(
    DebtNotificationEmail({
      clientName: client.name,
      debts: debts.map((d) => ({
        category: d.category,
        description: d.description,
        amount: formatEuro(Number(d.amount)),
        platform: d.platform,
      })),
      totalAmount: formatEuro(totalAmount),
      scanDate: new Date().toLocaleDateString("el-GR"),
      officeName: accountant.officeName ?? "Λογιστικό Γραφείο",
      officePhone: accountant.officePhone ?? undefined,
    })
  );

  const subject = `Ενημέρωση Οφειλών — ${formatEuro(totalAmount)}`;

  try {
    const { transporter, from } = await createTransporter(accountantId);

    await transporter.sendMail({
      from,
      to: client.email,
      subject,
      html: emailHtml,
    });

    await prisma.emailLog.create({
      data: {
        clientId,
        accountantId,
        recipientEmail: client.email,
        subject,
        body: emailHtml,
        sentAt: new Date(),
        status: "SENT",
      },
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";

    await prisma.emailLog.create({
      data: {
        clientId,
        accountantId,
        recipientEmail: client.email,
        subject,
        body: emailHtml,
        status: "FAILED",
        errorMessage: message,
      },
    });

    return { success: false, error: message };
  }
};

// ── Send Bulk Notifications ──────────────────────────────────────

interface SendBulkNotificationsParams {
  accountantId: string;
  clientIds: string[];
}

export const sendBulkNotifications = async ({
  accountantId,
  clientIds,
}: SendBulkNotificationsParams): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> => {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const clientId of clientIds) {
    // Get the latest completed scan for this client
    const latestScan = await prisma.scan.findFirst({
      where: { clientId, accountantId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });

    if (!latestScan) {
      errors.push(`No completed scan for client ${clientId}`);
      failed++;
      continue;
    }

    const result = await sendDebtNotification({
      accountantId,
      clientId,
      scanId: latestScan.id,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(result.error);
    }
  }

  return { sent, failed, errors };
};
