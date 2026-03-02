"use client";

import type { EmailStatus } from "@repo/shared";
import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type ClientEmailLogRow, getClientEmailLogs } from "@/server_actions/emails";

interface ClientEmailHistoryProps {
  clientId: string;
}

const statusVariant = (status: EmailStatus) => {
  if (status === "SENT") return "default" as const;
  if (status === "FAILED") return "destructive" as const;
  return "secondary" as const;
};

export const ClientEmailHistory = ({ clientId }: ClientEmailHistoryProps) => {
  const t = useTranslations("Admin.debts");
  const [logs, setLogs] = useState<ClientEmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getClientEmailLogs(clientId).then((data) => {
      if (!cancelled) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4" />
          {t("emailsSent")}
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {logs.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEmailsSent")}</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{log.subject}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString("el-GR")}
                  </span>
                </div>
                <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
