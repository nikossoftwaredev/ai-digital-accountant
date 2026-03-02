import { decrypt, type EncryptedPayload,prisma } from "@repo/shared";
import nodemailer from "nodemailer";

export const createTransporter = async (accountantId: string) => {
  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpUsername: true,
      smtpPassword: true,
      officeName: true,
    },
  });

  if (!accountant.smtpHost || !accountant.smtpPort)
    throw new Error("SMTP not configured");

  let password: string | undefined;
  if (accountant.smtpPassword) {
    const payload = JSON.parse(accountant.smtpPassword) as EncryptedPayload;
    password = decrypt(payload);
  }

  const transporter = nodemailer.createTransport({
    host: accountant.smtpHost,
    port: accountant.smtpPort,
    secure: accountant.smtpPort === 465,
    auth:
      accountant.smtpUsername && password
        ? { user: accountant.smtpUsername, pass: password }
        : undefined,
  });

  const fromName = accountant.officeName ?? accountant.smtpUsername ?? "hexAIgon";
  const fromAddress = accountant.smtpUsername ?? `noreply@${accountant.smtpHost}`;

  return { transporter, from: `"${fromName}" <${fromAddress}>` };
};
