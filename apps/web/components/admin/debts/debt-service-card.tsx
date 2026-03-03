"use client";

import { Download, FileText, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { ServiceCard, type CardScanStatus } from "@/components/admin/shared/service-card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DebtFileRow } from "@/server_actions/scans";

// Re-export for consumers that import from here
export type { CardScanStatus };

// ── Types ────────────────────────────────────────────────────────

interface DebtServiceCardProps {
  title: string;
  description: string;
  lastScanDate?: string | null;
  totalDebts?: number;
  scanStatus?: CardScanStatus;
  onScan?: () => void;
  onSendEmail?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
  files?: DebtFileRow[];
}

// ── Component ────────────────────────────────────────────────────

export const DebtServiceCard = ({
  title,
  description,
  lastScanDate,
  totalDebts,
  scanStatus = "idle",
  onScan,
  onSendEmail,
  disabled = false,
  comingSoon = false,
  files = [],
}: DebtServiceCardProps) => {
  const t = useTranslations("Admin.debts");

  const hasCompletedScan = scanStatus === "completed" || (totalDebts != null && totalDebts > 0);

  return (
    <ServiceCard
      title={title}
      description={description}
      comingSoon={comingSoon}
      scanStatus={scanStatus}
      onScan={onScan}
      disabled={disabled}
      scanLabel={t("scan")}
      comingSoonLabel={t("comingSoon")}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t("totalDebt")}: </span>
            <CurrencyCell amount={totalDebts ?? 0} />
          </div>
          <div>
            <span className="text-muted-foreground">{t("lastScan")}: </span>
            <span>
              {lastScanDate
                ? new Date(lastScanDate).toLocaleDateString("el-GR")
                : t("neverScanned")}
            </span>
          </div>
        </div>

        {/* Files + Send Email row */}
        <div className="flex items-center justify-between">
          {files.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="size-3.5" />
                  {files.length} {t("files")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <div className="space-y-1">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.fileName}</span>
                      <Download className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-xs text-muted-foreground">{t("noFiles")}</span>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onSendEmail}
            disabled={!hasCompletedScan}
          >
            <Mail className="size-3.5" />
            {t("sendEmail")}
          </Button>
        </div>
      </div>
    </ServiceCard>
  );
};
