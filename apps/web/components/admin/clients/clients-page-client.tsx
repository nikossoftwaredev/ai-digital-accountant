"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PageHeader } from "@/components/admin/shared/page-header";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/i18n/navigation";
import type { ClientRow } from "@/server_actions/clients";

import { ClientFormDialog } from "./client-form-dialog";
import { ClientsTable } from "./clients-table";

interface ClientsPageClientProps {
  clients: ClientRow[];
}

export const ClientsPageClient = ({ clients }: ClientsPageClientProps) => {
  const t = useTranslations("Admin.clients");
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4" />
            {t("addClient")}
          </Button>
        }
      />

      <ClientsTable clients={clients} />

      <ClientFormDialog
        mode="add"
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          setAddDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
};
