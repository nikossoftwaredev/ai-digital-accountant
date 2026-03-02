"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import type { ClientRow } from "@/server_actions/clients";
import { createClient, updateClient } from "@/server_actions/clients";

import { ClientFormFields } from "./client-form-fields";
import { clientExtendedSchema, type ClientExtendedFormValues } from "./client-form-schema";

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
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  const form = useForm<ClientExtendedFormValues>({
    resolver: zodResolver(clientExtendedSchema),
    defaultValues: {
      name: "",
      afm: "",
      amka: "",
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
          amka: client.amka ?? "",
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
          amka: "",
          email: "",
          phone: "",
          taxisnetUsername: "",
          taxisnetPassword: "",
          notes: "",
        });
      }
    }
  }, [open, mode, client, form]);

  const onSubmit = async (values: ClientExtendedFormValues) => {
    if (mode === "add") {
      // For create, username and password are required
      let hasError = false;
      if (!values.taxisnetUsername) {
        form.setError("taxisnetUsername", { message: t("required") });
        hasError = true;
      }
      if (!values.taxisnetPassword) {
        form.setError("taxisnetPassword", { message: t("required") });
        hasError = true;
      }
      if (hasError) return;
      const result = await createClient({
        ...values,
        taxisnetUsername: values.taxisnetUsername!,
        taxisnetPassword: values.taxisnetPassword!,
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

  /** If form has changes, show confirmation; otherwise close directly */
  const handleClose = useCallback(() => {
    if (form.formState.isDirty) {
      setShowDiscardAlert(true);
    } else {
      onOpenChange(false);
    }
  }, [form.formState.isDirty, onOpenChange]);

  return (
    <>
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleClose(); }}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => { e.preventDefault(); handleClose(); }}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editClient") : t("addClient")}
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <ClientFormFields
              form={form}
              showCredentials
              isEdit={isEdit}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("discardChangesTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("discardChangesDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setShowDiscardAlert(false);
              onOpenChange(false);
            }}
          >
            {t("discard")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
