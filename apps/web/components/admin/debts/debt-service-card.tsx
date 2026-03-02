"use client";

import { AlertCircle, CheckCircle2, Clock, Download, FileText, Mail, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { DebtFileRow } from "@/server_actions/scans";

// ── Types ────────────────────────────────────────────────────────

type ScanStatus = "idle" | "scanning" | "completed" | "failed";

interface DebtServiceCardProps {
  platform?: "AADE" | "EFKA" | "GEMI" | "MUNICIPALITY";
  title: string;
  description: string;
  lastScanDate?: string | null;
  totalDebts?: number;
  scanStatus?: ScanStatus;
  onScan?: () => void;
  onSendEmail?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
  files?: DebtFileRow[];
}

// ── Status Icon ──────────────────────────────────────────────────

const statusIcons: Record<ScanStatus, React.ReactNode> = {
  idle: <Clock className="size-4 text-muted-foreground" />,
  scanning: <Spinner />,
  completed: <CheckCircle2 className="size-4 text-green-500" />,
  failed: <AlertCircle className="size-4 text-red-500" />,
};

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
    <Card className={comingSoon ? "opacity-60" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {comingSoon
                ? <Clock className="size-4 text-muted-foreground" />
                : statusIcons[scanStatus]}
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {comingSoon ? (
            <Badge variant="secondary">{t("comingSoon")}</Badge>
          ) : (
            <Button
              size="sm"
              onClick={onScan}
              disabled={disabled || scanStatus === "scanning"}
            >
              {scanStatus === "scanning" ? (
                <Spinner />
              ) : (
                <>
                  <Play className="size-4" />
                  {t("scan")}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      {!comingSoon && (
        <CardContent>
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
        </CardContent>
      )}
    </Card>
  );
};
