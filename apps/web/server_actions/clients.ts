"use server";

import { encrypt, prisma, type ClientStatus } from "@repo/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAuditEvent } from "@/lib/auth/audit";
import { getAccountantId } from "@/lib/auth/session";

// ── Schemas ──────────────────────────────────────────────────────

const clientCreateSchema = z.object({
  name: z.string().min(1),
  afm: z.string().regex(/^\d{9}$/),
  amka: z.string().regex(/^\d{11}$/).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  taxisnetUsername: z.string().min(1),
  taxisnetPassword: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
});

const clientUpdateSchema = z.object({
  name: z.string().min(1),
  afm: z.string().regex(/^\d{9}$/),
  amka: z.string().regex(/^\d{11}$/).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  taxisnetUsername: z.string().optional().or(z.literal("")),
  taxisnetPassword: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

// ── Types ────────────────────────────────────────────────────────

export type ClientRow = {
  id: string;
  name: string;
  afm: string;
  amka: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  lastScanAt: string | null;
  totalDebts: number;
  createdAt: string;
  updatedAt: string;
};

// ── getClients ───────────────────────────────────────────────────

export const getClients = async (): Promise<ClientRow[]> => {
  const accountantId = await getAccountantId();

  const clients = await prisma.client.findMany({
    where: { accountantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      afm: true,
      amka: true,
      email: true,
      phone: true,
      notes: true,
      status: true,
      lastScanAt: true,
      totalDebts: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    afm: c.afm,
    amka: c.amka,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    status: c.status,
    lastScanAt: c.lastScanAt?.toISOString() ?? null,
    totalDebts: Number(c.totalDebts),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
};

// ── createClient ─────────────────────────────────────────────────

export const createClient = async (
  data: z.input<typeof clientCreateSchema>,
): Promise<{ success: boolean; error?: string }> => {
  const accountantId = await getAccountantId();

  const parsed = clientCreateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const { name, afm, amka, email, phone, taxisnetUsername, taxisnetPassword, notes } =
    parsed.data;

  // Check for duplicate AFM
  const existing = await prisma.client.findUnique({
    where: { accountantId_afm: { accountantId, afm } },
  });
  if (existing) {
    return { success: false, error: "A client with this AFM already exists" };
  }

  // Encrypt credentials
  const encryptedUsername = JSON.stringify(encrypt(taxisnetUsername));
  const encryptedPassword = JSON.stringify(encrypt(taxisnetPassword));

  const client = await prisma.client.create({
    data: {
      accountantId,
      name,
      afm,
      amka: amka || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      taxisnetUsername: encryptedUsername,
      taxisnetPassword: encryptedPassword,
    },
  });

  await logAuditEvent({
    accountantId,
    action: "CLIENT_CREATED",
    clientId: client.id,
    details: { name, afm },
  });

  revalidatePath("/admin/clients");
  return { success: true };
};

// ── updateClient ─────────────────────────────────────────────────

export const updateClient = async (
  id: string,
  data: z.input<typeof clientUpdateSchema>,
): Promise<{ success: boolean; error?: string }> => {
  const accountantId = await getAccountantId();

  const parsed = clientUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  // Verify ownership
  const existing = await prisma.client.findFirst({
    where: { id, accountantId },
  });
  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  const { name, afm, amka, email, phone, taxisnetUsername, taxisnetPassword, notes } =
    parsed.data;

  // Check for duplicate AFM (if changed)
  if (afm !== existing.afm) {
    const duplicate = await prisma.client.findUnique({
      where: { accountantId_afm: { accountantId, afm } },
    });
    if (duplicate) {
      return { success: false, error: "A client with this AFM already exists" };
    }
  }

  const updateData: Record<string, unknown> = {
    name,
    afm,
    amka: amka || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  };

  // Only update credentials if new values are provided
  const usernameUpdated = !!taxisnetUsername;
  const passwordUpdated = !!taxisnetPassword;
  if (usernameUpdated) {
    updateData.taxisnetUsername = JSON.stringify(encrypt(taxisnetUsername));
  }
  if (passwordUpdated) {
    updateData.taxisnetPassword = JSON.stringify(encrypt(taxisnetPassword));
  }

  await prisma.client.update({
    where: { id },
    data: updateData,
  });

  await logAuditEvent({
    accountantId,
    action: "CLIENT_UPDATED",
    clientId: id,
    details: { name, afm },
  });

  if (usernameUpdated || passwordUpdated) {
    await logAuditEvent({
      accountantId,
      action: "CREDENTIALS_UPDATED",
      clientId: id,
      details: {
        fields: [
          ...(usernameUpdated ? ["taxisnetUsername"] : []),
          ...(passwordUpdated ? ["taxisnetPassword"] : []),
        ],
      },
    });
  }

  revalidatePath("/admin/clients");
  return { success: true };
};

// ── deleteClient ─────────────────────────────────────────────────

export const deleteClient = async (
  id: string,
): Promise<{ success: boolean; error?: string }> => {
  const accountantId = await getAccountantId();

  // Verify ownership
  const existing = await prisma.client.findFirst({
    where: { id, accountantId },
    select: { id: true, name: true, afm: true },
  });
  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  await prisma.client.delete({ where: { id } });

  await logAuditEvent({
    accountantId,
    action: "CLIENT_DELETED",
    clientId: id,
    details: { name: existing.name, afm: existing.afm },
  });

  revalidatePath("/admin/clients");
  return { success: true };
};
