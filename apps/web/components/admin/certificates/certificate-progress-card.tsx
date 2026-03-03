"use client";

import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

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
import type { CertificateFileRow } from "@/server_actions/certificates";

// ── Types ────────────────────────────────────────────────────────

interface CertificateProgressCardProps {
  requestId: string;
  title: string;
  onComplete?: () => void;
}

interface CertRequestStatus {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  errorMessage: string | null;
  files: CertificateFileRow[];
}

// ── Status Config ────────────────────────────────────────────────

const statusConfig = {
  QUEUED: { badgeClass: "border-blue-500/50 text-blue-600", progress: 10 },
  RUNNING: { badgeClass: "border-blue-500/50 text-blue-600", progress: 50 },
  COMPLETED: { badgeClass: "border-green-500/50 text-green-600", progress: 100 },
  FAILED: { badgeClass: "border-red-500/50 text-red-600", progress: 100 },
  CANCELLED: { badgeClass: "border-gray-500/50 text-gray-600", progress: 100 },
} as const;

// ── Component ────────────────────────────────────────────────────

export const CertificateProgressCard = ({
  requestId,
  title,
  onComplete,
}: CertificateProgressCardProps) => {
  const t = useTranslations("Admin.certificates");

  const [request, setRequest] = useState<CertRequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const statusRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const queuedSinceRef = useRef<number | null>(null);

  onCompleteRef.current = onComplete;

  const QUEUED_TIMEOUT_MS = 60_000;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/certificates/${requestId}/status`);
      if (!res.ok) throw new Error("Failed to fetch status");

      const data = await res.json();
      if (!isMountedRef.current) return;

      const req = data.request as CertRequestStatus;

      // Track QUEUED timeout
      if (req.status === "QUEUED") {
        if (!queuedSinceRef.current) queuedSinceRef.current = Date.now();
        if (Date.now() - queuedSinceRef.current > QUEUED_TIMEOUT_MS) {
          const failed: CertRequestStatus = {
            ...req,
            status: "FAILED",
            errorMessage: "Bot is not running — request was not picked up. Start the bot and try again.",
          };
          setRequest(failed);
          statusRef.current = "FAILED";
          onCompleteRef.current?.();
          return;
        }
      } else {
        queuedSinceRef.current = null;
      }

      setRequest(req);
      statusRef.current = req.status;

      if (req.status === "COMPLETED" || req.status === "FAILED") {
        onCompleteRef.current?.();
      }
    } catch {
      if (isMountedRef.current) setError("Failed to load certificate status");
    }
  }, [requestId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      if (statusRef.current === "COMPLETED" || statusRef.current === "FAILED") return;
      fetchStatus();
    }, 3000);

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

  if (!request) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <Spinner />
          {t("requestRunning")}
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[request.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className={config.badgeClass}>
            {t(request.status === "QUEUED" ? "requestRunning" : request.status === "RUNNING" ? "requestRunning" : request.status === "COMPLETED" ? "requestCompleted" : "requestFailed")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={config.progress} className="h-2" />

        {request.status === "COMPLETED" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              {t("requestCompleted")}
            </div>
            {request.files.length > 0 && (
              <div className="space-y-1">
                {request.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <Download className="size-4" />
                    {file.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {request.status === "FAILED" && request.errorMessage && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {request.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
