"use server";

import type { ScanFrequency } from "@repo/shared";
import { encrypt, prisma } from "@repo/shared";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAuditEvent } from "@/lib/auth/audit";
import { getAccountantId } from "@/lib/auth/session";
import { generateBackupCodes, generateTotpSetup } from "@/lib/auth/totp";

// ── Types ────────────────────────────────────────────────────────

export type SettingsData = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  scanFrequency: ScanFrequency;
  autoNotify: boolean;
  officeName: string | null;
  officeAddress: string | null;
  officePhone: string | null;
  totpEnabled: boolean;
};

type ActionResult = { success: boolean; error?: string };

// ── Schemas ──────────────────────────────────────────────────────

const smtpSchema = z.object({
  smtpHost: z.string().optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().or(z.literal(0)),
  smtpUsername: z.string().optional().or(z.literal("")),
  smtpPassword: z.string().optional().or(z.literal("")),
});

const scanSchema = z.object({
  scanFrequency: z.enum(["MANUAL", "WEEKLY", "MONTHLY"]),
  autoNotify: z.boolean(),
});

const profileSchema = z.object({
  officeName: z.string().optional().or(z.literal("")),
  officeAddress: z.string().optional().or(z.literal("")),
  officePhone: z.string().optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
});

// ── getSettings ──────────────────────────────────────────────────

export const getSettings = async (): Promise<SettingsData> => {
  const accountantId = await getAccountantId();

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpUsername: true,
      scanFrequency: true,
      autoNotify: true,
      officeName: true,
      officeAddress: true,
      officePhone: true,
      totpEnabled: true,
    },
  });

  return {
    smtpHost: accountant.smtpHost,
    smtpPort: accountant.smtpPort,
    smtpUsername: accountant.smtpUsername,
    scanFrequency: accountant.scanFrequency,
    autoNotify: accountant.autoNotify,
    officeName: accountant.officeName,
    officeAddress: accountant.officeAddress,
    officePhone: accountant.officePhone,
    totpEnabled: accountant.totpEnabled,
  };
};

// ── saveSmtpSettings ─────────────────────────────────────────────

export const saveSmtpSettings = async (
  data: z.input<typeof smtpSchema>,
): Promise<ActionResult> => {
  const accountantId = await getAccountantId();

  const parsed = smtpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const { smtpHost, smtpPort, smtpUsername, smtpPassword } = parsed.data;

  const updateData: Record<string, unknown> = {
    smtpHost: smtpHost || null,
    smtpPort: smtpPort || null,
    smtpUsername: smtpUsername || null,
  };

  // Only encrypt and update password if a new one is provided
  if (smtpPassword) {
    const encrypted = encrypt(smtpPassword);
    updateData.smtpPassword = encrypted.ciphertext;
    updateData.smtpIv = JSON.stringify({ iv: encrypted.iv, tag: encrypted.tag });
  }

  await prisma.accountant.update({
    where: { id: accountantId },
    data: updateData,
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "smtp" },
  });

  revalidatePath("/admin/settings");
  return { success: true };
};

// ── saveScanSettings ─────────────────────────────────────────────

export const saveScanSettings = async (
  data: z.input<typeof scanSchema>,
): Promise<ActionResult> => {
  const accountantId = await getAccountantId();

  const parsed = scanSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  await prisma.accountant.update({
    where: { id: accountantId },
    data: {
      scanFrequency: parsed.data.scanFrequency,
      autoNotify: parsed.data.autoNotify,
    },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "scan", ...parsed.data },
  });

  revalidatePath("/admin/settings");
  return { success: true };
};

// ── saveProfileSettings ──────────────────────────────────────────

export const saveProfileSettings = async (
  data: z.input<typeof profileSchema>,
): Promise<ActionResult> => {
  const accountantId = await getAccountantId();

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  await prisma.accountant.update({
    where: { id: accountantId },
    data: {
      officeName: parsed.data.officeName || null,
      officeAddress: parsed.data.officeAddress || null,
      officePhone: parsed.data.officePhone || null,
    },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "profile" },
  });

  revalidatePath("/admin/settings");
  return { success: true };
};

// ── changePassword ───────────────────────────────────────────────

export const changePassword = async (
  data: z.input<typeof changePasswordSchema>,
): Promise<ActionResult> => {
  const accountantId = await getAccountantId();

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: { passwordHash: true },
  });

  if (!accountant.passwordHash) {
    return { success: false, error: "No password set" };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, accountant.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid current password" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.accountant.update({
    where: { id: accountantId },
    data: { passwordHash: newHash },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "password" },
  });

  return { success: true };
};

// ── setupTotp ────────────────────────────────────────────────────
// Generates TOTP secret + URI. Stores encrypted secret in DB with
// totpEnabled still false (pending confirmation).

export const setupTotp = async (): Promise<{ success: boolean; uri?: string; error?: string }> => {
  const accountantId = await getAccountantId();

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: { email: true, totpEnabled: true },
  });

  if (accountant.totpEnabled) {
    return { success: false, error: "2FA is already enabled" };
  }

  const { secret, uri } = generateTotpSetup(accountant.email);

  // Store the encrypted secret in DB but keep totpEnabled=false
  const encrypted = encrypt(secret);
  await prisma.accountant.update({
    where: { id: accountantId },
    data: { totpSecret: JSON.stringify(encrypted) },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { field: "totp_setup_initiated" },
  });

  return { success: true, uri };
};

// ── confirmTotp ──────────────────────────────────────────────────
// Verifies the TOTP code against the pending (stored but not yet enabled)
// secret. On success, enables 2FA and generates backup codes.

export const confirmTotp = async (
  code: string,
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> => {
  const accountantId = await getAccountantId();

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: { id: true, totpSecret: true, totpEnabled: true, backupCodes: true },
  });

  if (accountant.totpEnabled) {
    return { success: false, error: "2FA is already enabled" };
  }

  if (!accountant.totpSecret) {
    return { success: false, error: "No pending 2FA setup found" };
  }

  // Verify the code using the existing verifyTotpCode-compatible approach
  // We need to verify manually since totpEnabled is false
  const { decrypt } = await import("@repo/shared");
  const { TOTP, Secret } = await import("otpauth");

  const encryptedSecret = JSON.parse(accountant.totpSecret);
  const rawSecret = decrypt(encryptedSecret);

  const totp = new TOTP({
    issuer: "hexAIgon",
    label: "",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(rawSecret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return { success: false, error: "Invalid code" };
  }

  // Generate backup codes
  const { plain, hashed } = generateBackupCodes();

  // Enable 2FA (secret is already stored and encrypted)
  await prisma.accountant.update({
    where: { id: accountantId },
    data: {
      totpEnabled: true,
      backupCodes: hashed,
    },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "2fa", action: "enabled" },
  });

  return { success: true, backupCodes: plain };
};

// ── disableTotp ──────────────────────────────────────────────────

export const disableTotp = async (
  password: string,
): Promise<ActionResult> => {
  const accountantId = await getAccountantId();

  const accountant = await prisma.accountant.findUniqueOrThrow({
    where: { id: accountantId },
    select: { passwordHash: true, totpEnabled: true },
  });

  if (!accountant.totpEnabled) {
    return { success: false, error: "2FA is not enabled" };
  }

  if (!accountant.passwordHash) {
    return { success: false, error: "No password set" };
  }

  const isValid = await bcrypt.compare(password, accountant.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid password" };
  }

  await prisma.accountant.update({
    where: { id: accountantId },
    data: {
      totpEnabled: false,
      totpSecret: null,
      backupCodes: [],
    },
  });

  await logAuditEvent({
    accountantId,
    action: "SETTINGS_CHANGED",
    details: { section: "2fa", action: "disabled" },
  });

  revalidatePath("/admin/settings");
  return { success: true };
};
