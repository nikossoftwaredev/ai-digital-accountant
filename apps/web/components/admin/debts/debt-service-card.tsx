"use client";

import { AlertCircle, CheckCircle2, Clock, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

// ── Types ────────────────────────────────────────────────────────

type ScanStatus = "idle" | "scanning" | "completed" | "failed";

interface DebtServiceCardProps {
  platform: "AADE" | "EFKA" | "GEMI" | "MUNICIPALITY";
  title: string;
  description: string;
  lastScanDate: string | null;
  totalDebts: number;
  scanStatus: ScanStatus;
  onScan: () => void;
  disabled?: boolean;
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
  scanStatus,
  onScan,
  disabled = false,
}: DebtServiceCardProps) => {
  const t = useTranslations("Admin.debts");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {statusIcons[scanStatus]}
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t("totalDebt")}: </span>
            <CurrencyCell amount={totalDebts} />
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
      </CardContent>
    </Card>
  );
};
