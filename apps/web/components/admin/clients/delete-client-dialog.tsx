"use client";

import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/components/admin/shared/confirm-dialog";
import type { ClientRow } from "@/server_actions/clients";
import { deleteClient } from "@/server_actions/clients";

interface DeleteClientDialogProps {
  client: ClientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteClientDialog = ({
  client,
  open,
  onOpenChange,
  onSuccess,
}: DeleteClientDialogProps) => {
  const t = useTranslations("Admin.clients");

  const handleConfirm = async () => {
    if (!client) return;
    const result = await deleteClient(client.id);
    if (result.success) {
      onSuccess();
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("confirmDelete")}
      description={
        client
          ? `${t("confirmDeleteDesc")} (${client.name})`
          : t("confirmDeleteDesc")
      }
      confirmLabel={t("delete")}
      cancelLabel={t("cancel")}
      onConfirm={handleConfirm}
      variant="destructive"
    />
  );
};
