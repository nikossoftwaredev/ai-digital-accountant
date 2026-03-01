import { prisma } from "@repo/shared";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const checkRateLimit = async (accountant: { lockedUntil: Date | null }): Promise<boolean> => {
  if (!accountant.lockedUntil) return true;
  return accountant.lockedUntil < new Date();
};

export const incrementFailedAttempts = async (accountantId: string): Promise<void> => {
  const updated = await prisma.accountant.update({
    where: { id: accountantId },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });

  if (updated.failedAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    await prisma.accountant.update({
      where: { id: accountantId },
      data: { lockedUntil },
    });
  }
};

export const resetFailedAttempts = async (accountantId: string): Promise<void> => {
  await prisma.accountant.update({
    where: { id: accountantId },
    data: { failedAttempts: 0, lockedUntil: null },
  });
};
