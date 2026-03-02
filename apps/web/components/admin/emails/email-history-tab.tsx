"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmailLogRow } from "@/server_actions/emails";

// ── Status Colors ────────────────────────────────────────────────

const statusColors = {
  SENT: "border-green-500/50 text-green-600",
  FAILED: "border-red-500/50 text-red-600",
  PENDING: "border-yellow-500/50 text-yellow-600",
} as const;

const statusLabelKeys = {
  SENT: "statusSent",
  FAILED: "statusFailed",
  PENDING: "statusPending",
} as const;

// ── Props ────────────────────────────────────────────────────────

interface EmailHistoryTabProps {
  logs: EmailLogRow[];
}

// ── Component ────────────────────────────────────────────────────

export const EmailHistoryTab = ({ logs }: EmailHistoryTabProps) => {
  const t = useTranslations("Admin.emails");

  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noEmails")}
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("recipient")}</TableHead>
            <TableHead>{t("subject")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("sentAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{log.clientName}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {log.recipientEmail}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {log.subject}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusColors[log.status]}
                >
                  {t(statusLabelKeys[log.status])}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(log.sentAt ?? log.createdAt).toLocaleString("el-GR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
