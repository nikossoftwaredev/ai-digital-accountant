"use client";

import { Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ClientWithDebtInfo,sendBulkEmails } from "@/server_actions/emails";

// ── Props ────────────────────────────────────────────────────────

interface EmailSendTabProps {
  clients: ClientWithDebtInfo[];
  initialClientId?: string;
}

// ── Component ────────────────────────────────────────────────────

export const EmailSendTab = ({ clients, initialClientId }: EmailSendTabProps) => {
  const t = useTranslations("Admin.emails");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => initialClientId ? new Set([initialClientId]) : new Set()
  );
  const [isSending, setIsSending] = useState(false);

  const allSelected =
    clients.length > 0 && selectedIds.size === clients.length;

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map((c) => c.id)));
  }, [allSelected, clients]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsSending(true);
    const result = await sendBulkEmails(Array.from(selectedIds));
    setIsSending(false);

    if (result.success) {
      toast.success(
        `${t("sent")}: ${result.sent}${result.failed ? `, ${t("statusFailed")}: ${result.failed}` : ""}`
      );
      setSelectedIds(new Set());
    } else {
      toast.error(result.error ?? t("sendFailed"));
    }
  }, [selectedIds, t]);

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Mail className="mb-4 size-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("noClientsWithDebts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("selectedCount", { count: selectedIds.size })}
        </p>
        <Button
          onClick={handleSend}
          disabled={selectedIds.size === 0 || isSending}
        >
          {isSending ? <Spinner /> : <><Send className="size-4" /> {t("sendSelected")}</>}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>{t("clientName")}</TableHead>
              <TableHead>{t("clientEmail")}</TableHead>
              <TableHead className="text-right">{t("totalDebts")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(client.id)}
                    onCheckedChange={() => toggleOne(client.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {client.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {client.afm}
                  </span>
                </TableCell>
                <TableCell>{client.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <CurrencyCell amount={client.totalDebts} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
