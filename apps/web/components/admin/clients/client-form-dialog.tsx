"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClientRow } from "@/server_actions/clients";
import { createClient, updateClient } from "@/server_actions/clients";

// ── Form schema ──────────────────────────────────────────────────

const clientFormSchema = z.object({
  name: z.string().min(1),
  afm: z.string().regex(/^\d{9}$/),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  taxisnetUsername: z.string().min(1),
  taxisnetPassword: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

// ── Props ────────────────────────────────────────────────────────

interface ClientFormDialogProps {
  mode: "add" | "edit";
  client?: ClientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ── Component ────────────────────────────────────────────────────

export const ClientFormDialog = ({
  mode,
  client,
  open,
  onOpenChange,
  onSuccess,
}: ClientFormDialogProps) => {
  const t = useTranslations("Admin.clients");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      afm: "",
      email: "",
      phone: "",
      taxisnetUsername: "",
      taxisnetPassword: "",
      notes: "",
    },
  });

  // Reset form when dialog opens/closes or client changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && client) {
        form.reset({
          name: client.name,
          afm: client.afm,
          email: client.email ?? "",
          phone: client.phone ?? "",
          taxisnetUsername: "",
          taxisnetPassword: "",
          notes: client.notes ?? "",
        });
      } else {
        form.reset({
          name: "",
          afm: "",
          email: "",
          phone: "",
          taxisnetUsername: "",
          taxisnetPassword: "",
          notes: "",
        });
      }
    }
  }, [open, mode, client, form]);

  const onSubmit = async (values: ClientFormValues) => {
    if (mode === "add") {
      // For create, password is required
      if (!values.taxisnetPassword) {
        form.setError("taxisnetPassword", { message: "Required" });
        return;
      }
      const result = await createClient({
        ...values,
        taxisnetPassword: values.taxisnetPassword,
      });
      if (!result.success) {
        form.setError("root", { message: result.error });
        return;
      }
    } else if (client) {
      const result = await updateClient(client.id, values);
      if (!result.success) {
        form.setError("root", { message: result.error });
        return;
      }
    }

    onSuccess();
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editClient") : t("addClient")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="afm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("afm")}</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={9} />
                  </FormControl>
                  <FormDescription>{t("afmValidation")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="taxisnetUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taxisnetUsername")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxisnetPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taxisnetPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  {isEdit && (
                    <FormDescription>
                      {t("taxisnetPasswordHint")}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "..." : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
