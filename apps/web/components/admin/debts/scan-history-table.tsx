"use client";

import { useTranslations } from "next-intl";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScanRow } from "@/server_actions/scans";

// ── Status Badge Colors ──────────────────────────────────────────

const statusColors = {
  QUEUED: "border-yellow-500/50 text-yellow-600",
  RUNNING: "border-blue-500/50 text-blue-600",
  COMPLETED: "border-green-500/50 text-green-600",
  FAILED: "border-red-500/50 text-red-600",
  CANCELLED: "border-gray-500/50 text-gray-600",
} as const;

const statusLabelKeys = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// ── Props ────────────────────────────────────────────────────────

interface ScanHistoryTableProps {
  scans: ScanRow[];
}

// ── Component ────────────────────────────────────────────────────

export const ScanHistoryTable = ({ scans }: ScanHistoryTableProps) => {
  const t = useTranslations("Admin.debts");
  const tScans = useTranslations("Admin.scans");

  if (scans.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {tScans("noScans")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("client")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead>{t("totalDebt")}</TableHead>
          <TableHead>{t("startedAt")}</TableHead>
          <TableHead>{t("completedAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scans.map((scan) => (
          <TableRow key={scan.id}>
            <TableCell className="font-medium">
              {scan.clientName}
              <span className="ml-2 text-xs text-muted-foreground">
                {scan.clientAfm}
              </span>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={statusColors[scan.status]}
              >
                {tScans(statusLabelKeys[scan.status])}
              </Badge>
            </TableCell>
            <TableCell>
              <CurrencyCell amount={scan.totalDebtsFound} />
            </TableCell>
            <TableCell>
              {scan.startedAt
                ? new Date(scan.startedAt).toLocaleString("el-GR")
                : "—"}
            </TableCell>
            <TableCell>
              {scan.completedAt
                ? new Date(scan.completedAt).toLocaleString("el-GR")
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
