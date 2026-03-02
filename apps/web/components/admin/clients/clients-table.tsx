"use client";

import { Mail, MoreHorizontal, Pencil, Scan, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/lib/i18n/navigation";
import type { ClientRow } from "@/server_actions/clients";

import { ClientFormDialog } from "./client-form-dialog";
import { DeleteClientDialog } from "./delete-client-dialog";

interface ClientsTableProps {
  clients: ClientRow[];
}

export const ClientsTable = ({ clients }: ClientsTableProps) => {
  const t = useTranslations("Admin.clients");
  const router = useRouter();

  const statusLabels: Record<string, string> = {
    ACTIVE: t("statusActive"),
    PENDING: t("statusPending"),
    ERROR: t("statusError"),
  };

  const [clientToEdit, setClientToEdit] = useState<ClientRow | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return t("neverScanned");
    return new Date(isoString).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-lg font-medium text-muted-foreground">
          {t("noClients")}
        </p>
        <p className="text-sm text-muted-foreground">{t("addFirst")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("afm")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("lastScan")}</TableHead>
              <TableHead className="text-right">{t("totalDebts")}</TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="font-mono">{client.afm}</TableCell>
                <TableCell>{client.email ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={client.status} label={statusLabels[client.status]} />
                </TableCell>
                <TableCell>{formatDate(client.lastScanAt)}</TableCell>
                <TableCell className="text-right">
                  {client.totalDebts > 0 ? (
                    <CurrencyCell amount={client.totalDebts} />
                  ) : (
                    <span className="text-muted-foreground">{t("noDebts")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{t("actions")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setClientToEdit(client)}>
                        <Pencil className="size-4" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/admin/debts?clientId=${client.id}`)}>
                        <Scan className="size-4" />
                        {t("scan")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/admin/emails?clientId=${client.id}`)}>
                        <Mail className="size-4" />
                        {t("sendEmail")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setClientToDelete(client)}
                      >
                        <Trash2 className="size-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <ClientFormDialog
        mode="edit"
        client={clientToEdit}
        open={!!clientToEdit}
        onOpenChange={(open) => {
          if (!open) setClientToEdit(null);
        }}
        onSuccess={() => {
          setClientToEdit(null);
          router.refresh();
        }}
      />

      {/* Delete dialog */}
      <DeleteClientDialog
        client={clientToDelete}
        open={!!clientToDelete}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null);
        }}
        onSuccess={() => {
          setClientToDelete(null);
          router.refresh();
        }}
      />
    </>
  );
};
