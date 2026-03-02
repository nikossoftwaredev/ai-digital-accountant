"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ClientSearchBar } from "@/components/admin/shared/client-search-bar";
import { PageHeader } from "@/components/admin/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClientRow } from "@/server_actions/clients";
import type { ClientDebtSummaryData, DebtFileRow, ScanRow } from "@/server_actions/scans";
import { getClientDebtSummary, startScan } from "@/server_actions/scans";

import { ClientDebtSummary } from "./client-debt-summary";
import { ClientEmailHistory } from "./client-email-history";
import { DebtServiceCard } from "./debt-service-card";
import { ScanHistoryTable } from "./scan-history-table";
import { ScanProgressCard } from "./scan-progress-card";

// ── Types ────────────────────────────────────────────────────────

type ScanStatus = "idle" | "scanning" | "completed" | "failed";

interface DebtsPageClientProps {
  clients: ClientRow[];
  recentScans: ScanRow[];
  initialClientId?: string;
}

const ACTIVE_PLATFORMS = ["AADE", "EFKA", "GEMI", "MUNICIPALITY"] as const;
type ActivePlatform = (typeof ACTIVE_PLATFORMS)[number];

// ── Helpers ──────────────────────────────────────────────────────

const getPlatformFiles = (data: ClientDebtSummaryData | null, platform: string): DebtFileRow[] => {
  if (!data) return [];
  const group = data.groups.find((g) => g.platform === platform);
  if (!group) return [];
  return group.debts.flatMap((d) => [
    ...d.files,
    ...(d.documentUrl
      ? [{ id: `legacy-${d.id}`, fileName: "document.pdf", fileUrl: d.documentUrl, fileType: "application/pdf" }]
      : []),
  ]);
};

const getPlatformSubtotal = (data: ClientDebtSummaryData | null, platform: string): number => {
  if (!data) return 0;
  const group = data.groups.find((g) => g.platform === platform);
  return group?.subtotal ?? 0;
};

// ── Component ────────────────────────────────────────────────────

export const DebtsPageClient = ({
  clients,
  recentScans: initialScans,
  initialClientId,
}: DebtsPageClientProps) => {
  const t = useTranslations("Admin.debts");

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId ?? clients[0]?.id ?? "");
  const [scanStatuses, setScanStatuses] = useState<Record<ActivePlatform, ScanStatus>>({
    AADE: "idle", EFKA: "idle", GEMI: "idle", MUNICIPALITY: "idle",
  });
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState(initialScans);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [summaryData, setSummaryData] = useState<ClientDebtSummaryData | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Fetch per-platform summary for cards
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedClientId) {
        if (!cancelled) setSummaryData(null);
        return;
      }
      const data = await getClientDebtSummary(selectedClientId);
      if (!cancelled) setSummaryData(data);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedClientId, summaryRefreshKey]);

  const handleScan = useCallback(
    async (platform: ActivePlatform) => {
      if (!selectedClientId) {
        toast.error(t("selectClientFirst"));
        return;
      }

      setScanStatuses((prev) => ({ ...prev, [platform]: "scanning" }));

      const result = await startScan({
        clientId: selectedClientId,
        platforms: [platform],
      });

      if (!result.success) {
        setScanStatuses((prev) => ({ ...prev, [platform]: "failed" }));
        toast.error(result.error);
        return;
      }

      setActiveScanId(result.scanId!);
    },
    [selectedClientId, t]
  );

  const handleScanComplete = useCallback(
    (scan: ScanRow) => {
      // Update the correct platform status based on scan results
      const statuses = scan.platformStatuses as Array<{ platform: string }> | null;
      const newStatus: ScanStatus = scan.status === "COMPLETED" ? "completed" : "failed";

      setScanStatuses((prev) => {
        const next = { ...prev };
        for (const platform of ACTIVE_PLATFORMS) {
          if (statuses?.some((s) => s.platform === platform)) {
            next[platform] = newStatus;
          }
        }
        return next;
      });

      // Add to recent scans and refresh summary
      setRecentScans((prev) => [scan, ...prev.slice(0, 19)]);
      setSummaryRefreshKey((k) => k + 1);
    },
    []
  );

  const handleSendEmail = useCallback(
    (platform: string) => {
      toast.info(`${t("sendEmail")} — ${platform} (coming soon)`);
    },
    [t]
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {/* Client Selector */}
      <ClientSearchBar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelect={setSelectedClientId}
      />

      {/* Service Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ACTIVE_PLATFORMS.map((platform) => (
          <DebtServiceCard
            key={platform}
            platform={platform}
            title={t(`${platform.toLowerCase()}Title`)}
            description={t(`${platform.toLowerCase()}Description`)}
            lastScanDate={selectedClient?.lastScanAt ?? null}
            totalDebts={getPlatformSubtotal(summaryData, platform)}
            scanStatus={scanStatuses[platform]}
            onScan={() => handleScan(platform)}
            onSendEmail={() => handleSendEmail(platform)}
            disabled={!selectedClientId}
            files={getPlatformFiles(summaryData, platform)}
          />
        ))}
        <DebtServiceCard
          title={t("keaoTitle")}
          description={t("keaoDescription")}
          comingSoon
        />
        <DebtServiceCard
          title={t("keaoArrangedTitle")}
          description={t("keaoArrangedDescription")}
          comingSoon
        />
        <DebtServiceCard
          title={t("municipalTitle")}
          description={t("municipalDescription")}
          comingSoon
        />
      </div>

      {/* Active Scan Progress */}
      {activeScanId && (
        <ScanProgressCard
          scanId={activeScanId}
          onComplete={handleScanComplete}
        />
      )}

      {/* Client Debt Summary */}
      <ClientDebtSummary
        clientId={selectedClientId}
        refreshKey={summaryRefreshKey}
      />

      {/* Client Email History */}
      {selectedClientId && <ClientEmailHistory clientId={selectedClientId} />}

      {/* Scan History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("scanHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScanHistoryTable scans={recentScans} />
        </CardContent>
      </Card>
    </div>
  );
};
