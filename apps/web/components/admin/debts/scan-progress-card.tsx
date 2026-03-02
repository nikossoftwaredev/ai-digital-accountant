"use client";

import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CurrencyCell } from "@/components/admin/shared/currency-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { sendEmailToClient } from "@/server_actions/emails";
import type { ScanDebtRow, ScanRow } from "@/server_actions/scans";

// ── Types ────────────────────────────────────────────────────────

interface ScanProgressCardProps {
  scanId: string;
  onComplete?: (scan: ScanRow, debts: ScanDebtRow[]) => void;
}

// ── Status Config ────────────────────────────────────────────────

const statusConfig = {
  QUEUED: { badgeClass: "border-blue-500/50 text-blue-600", progress: 10 },
  RUNNING: { badgeClass: "border-blue-500/50 text-blue-600", progress: 50 },
  COMPLETED: { badgeClass: "border-green-500/50 text-green-600", progress: 100 },
  FAILED: { badgeClass: "border-red-500/50 text-red-600", progress: 100 },
  CANCELLED: { badgeClass: "border-gray-500/50 text-gray-600", progress: 100 },
} as const;

const statusLabelKeys = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// ── Component ────────────────────────────────────────────────────

export const ScanProgressCard = ({
  scanId,
  onComplete,
}: ScanProgressCardProps) => {
  const t = useTranslations("Admin.debts");
  const tScans = useTranslations("Admin.scans");

  const [scan, setScan] = useState<ScanRow | null>(null);
  const [debts, setDebts] = useState<ScanDebtRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const isMountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const scanStatusRef = useRef<string | null>(null);
  const queuedSinceRef = useRef<number | null>(null);

  // Keep refs in sync without triggering re-renders
  onCompleteRef.current = onComplete;

  const QUEUED_TIMEOUT_MS = 60_000; // 60s — fail if bot never picks it up

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/scans/${scanId}/status`);
      if (!res.ok) throw new Error("Failed to fetch scan status");

      const data = await res.json();
      if (!isMountedRef.current) return;

      // Track how long we've been stuck in QUEUED
      if (data.scan.status === "QUEUED") {
        if (!queuedSinceRef.current) queuedSinceRef.current = Date.now();
        if (Date.now() - queuedSinceRef.current > QUEUED_TIMEOUT_MS) {
          const failedScan = { ...data.scan, status: "FAILED" as const, errorMessage: "Bot is not running — scan was not picked up. Start the bot and try again." };
          setScan(failedScan);
          scanStatusRef.current = "FAILED";
          onCompleteRef.current?.(failedScan, []);
          return;
        }
      } else {
        queuedSinceRef.current = null;
      }

      setScan(data.scan);
      setDebts(data.debts);
      scanStatusRef.current = data.scan.status;

      if (data.scan.status === "COMPLETED" || data.scan.status === "FAILED") {
        onCompleteRef.current?.(data.scan, data.debts);
      }
    } catch {
      if (isMountedRef.current) setError("Failed to load scan status");
    }
  }, [scanId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      if (scanStatusRef.current === "COMPLETED" || scanStatusRef.current === "FAILED") return;
      fetchStatus();
    }, 2000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStatus]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!scan) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <Spinner />
          {t("loadingScan")}
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[scan.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {scan.clientName} ({scan.clientAfm})
          </CardTitle>
          <Badge
            variant="outline"
            className={config.badgeClass}
          >
            {tScans(statusLabelKeys[scan.status])}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={config.progress} className="h-2" />

        {scan.status === "COMPLETED" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              {t("scanComplete")}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">{t("totalDebt")}: </span>
              <CurrencyCell amount={scan.totalDebtsFound} />
            </div>
            {debts.length > 0 && (
              <>
                <div className="mt-2 space-y-1">
                  {debts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between rounded border px-3 py-1.5 text-sm"
                    >
                      <span>
                        {tScans(`categories.${debt.category}` as Parameters<typeof tScans>[0])} — {debt.description}
                      </span>
                      <CurrencyCell amount={debt.amount} />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSendingEmail}
                  onClick={async () => {
                    setIsSendingEmail(true);
                    const result = await sendEmailToClient({
                      clientId: scan.clientId,
                      scanId: scan.id,
                    });
                    setIsSendingEmail(false);
                    if (result.success) toast.success(t("emailSent"));
                    else toast.error(result.error ?? t("emailFailed"));
                  }}
                >
                  {isSendingEmail ? <Spinner /> : <><Mail className="size-4" /> {t("sendEmail")}</>}
                </Button>
              </>
            )}
          </div>
        )}

        {scan.status === "FAILED" && scan.errorMessage && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {scan.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
