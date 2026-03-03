import { z } from "zod";

// ── Base schema (shared by wizard and edit dialog) ──────────────

export const clientBaseSchema = z.object({
  name: z.string().min(1),
  afm: z.string().regex(/^\d{9}$/),
  amka: z.string().regex(/^\d{11}$/),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientBaseFormValues = z.infer<typeof clientBaseSchema>;

// ── Extended schema (adds taxisnet credentials for edit dialog) ──

export const clientExtendedSchema = clientBaseSchema.extend({
  taxisnetUsername: z.string().optional().or(z.literal("")),
  taxisnetPassword: z.string().optional().or(z.literal("")),
});

export type ClientExtendedFormValues = z.infer<typeof clientExtendedSchema>;
