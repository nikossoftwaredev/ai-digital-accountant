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
  const [aadeScanStatus, setAadeScanStatus] = useState<ScanStatus>("idle");
  const [efkaScanStatus, setEfkaScanStatus] = useState<ScanStatus>("idle");
  const [gemiScanStatus, setGemiScanStatus] = useState<ScanStatus>("idle");
  const [municipalityScanStatus, setMunicipalityScanStatus] = useState<ScanStatus>("idle");
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState(initialScans);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [summaryData, setSummaryData] = useState<ClientDebtSummaryData | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const statusSetters: Record<string, (s: ScanStatus) => void> = {
    AADE: setAadeScanStatus,
    EFKA: setEfkaScanStatus,
    GEMI: setGemiScanStatus,
    MUNICIPALITY: setMunicipalityScanStatus,
  };

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
    async (platform: "AADE" | "EFKA" | "GEMI" | "MUNICIPALITY") => {
      if (!selectedClientId) {
        toast.error(t("selectClientFirst"));
        return;
      }

      statusSetters[platform]("scanning");

      const result = await startScan({
        clientId: selectedClientId,
        platforms: [platform],
      });

      if (!result.success) {
        statusSetters[platform]("failed");
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

      for (const [platform, setter] of Object.entries(statusSetters)) {
        if (statuses?.some((s) => s.platform === platform)) {
          setter(newStatus);
        }
      }

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("selectClient")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full max-w-md justify-between"
              >
                {selectedClient
                  ? `${selectedClient.name} (${selectedClient.afm})`
                  : t("selectClientPlaceholder")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-md p-0" align="start">
              <Command>
                <CommandInput placeholder={t("searchClient")} />
                <CommandList>
                  <CommandEmpty>{t("noClientFound")}</CommandEmpty>
                  <CommandGroup>
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`${client.name} ${client.afm}`}
                        onSelect={() => {
                          setSelectedClientId(client.id);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientId === client.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {client.name} ({client.afm})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DebtServiceCard
          platform="AADE"
          title={t("aadeTitle")}
          description={t("aadeDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={getPlatformSubtotal(summaryData, "AADE")}
          scanStatus={aadeScanStatus}
          onScan={() => handleScan("AADE")}
          onSendEmail={() => handleSendEmail("AADE")}
          disabled={!selectedClientId}
          files={getPlatformFiles(summaryData, "AADE")}
        />
        <DebtServiceCard
          platform="EFKA"
          title={t("efkaTitle")}
          description={t("efkaDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={getPlatformSubtotal(summaryData, "EFKA")}
          scanStatus={efkaScanStatus}
          onScan={() => handleScan("EFKA")}
          onSendEmail={() => handleSendEmail("EFKA")}
          disabled={!selectedClientId}
          files={getPlatformFiles(summaryData, "EFKA")}
        />
        <DebtServiceCard
          platform="GEMI"
          title={t("gemiTitle")}
          description={t("gemiDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={getPlatformSubtotal(summaryData, "GEMI")}
          scanStatus={gemiScanStatus}
          onScan={() => handleScan("GEMI")}
          onSendEmail={() => handleSendEmail("GEMI")}
          disabled={!selectedClientId}
          files={getPlatformFiles(summaryData, "GEMI")}
        />
        <DebtServiceCard
          platform="MUNICIPALITY"
          title={t("municipalityTitle")}
          description={t("municipalityDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={getPlatformSubtotal(summaryData, "MUNICIPALITY")}
          scanStatus={municipalityScanStatus}
          onScan={() => handleScan("MUNICIPALITY")}
          onSendEmail={() => handleSendEmail("MUNICIPALITY")}
          disabled={!selectedClientId}
          files={getPlatformFiles(summaryData, "MUNICIPALITY")}
        />
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
