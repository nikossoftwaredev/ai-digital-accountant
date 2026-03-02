"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/general/utils";
import type { ClientRow } from "@/server_actions/clients";
import type { ScanRow } from "@/server_actions/scans";
import { startScan } from "@/server_actions/scans";

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

// ── Component ────────────────────────────────────────────────────

export const DebtsPageClient = ({
  clients,
  recentScans: initialScans,
  initialClientId,
}: DebtsPageClientProps) => {
  const t = useTranslations("Admin.debts");

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId ?? "");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [aadeScanStatus, setAadeScanStatus] = useState<ScanStatus>("idle");
  const [efkaScanStatus, setEfkaScanStatus] = useState<ScanStatus>("idle");
  const [gemiScanStatus, setGemiScanStatus] = useState<ScanStatus>("idle");
  const [municipalityScanStatus, setMunicipalityScanStatus] = useState<ScanStatus>("idle");
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState(initialScans);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const statusSetters: Record<string, (s: ScanStatus) => void> = {
    AADE: setAadeScanStatus,
    EFKA: setEfkaScanStatus,
    GEMI: setGemiScanStatus,
    MUNICIPALITY: setMunicipalityScanStatus,
  };

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

      // Add to recent scans
      setRecentScans((prev) => [scan, ...prev.slice(0, 19)]);
    },
    []
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
          totalDebts={selectedClient?.totalDebts ?? 0}
          scanStatus={aadeScanStatus}
          onScan={() => handleScan("AADE")}
          disabled={!selectedClientId}
        />
        <DebtServiceCard
          platform="EFKA"
          title={t("efkaTitle")}
          description={t("efkaDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={selectedClient?.totalDebts ?? 0}
          scanStatus={efkaScanStatus}
          onScan={() => handleScan("EFKA")}
          disabled={!selectedClientId}
        />
        <DebtServiceCard
          platform="GEMI"
          title={t("gemiTitle")}
          description={t("gemiDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={selectedClient?.totalDebts ?? 0}
          scanStatus={gemiScanStatus}
          onScan={() => handleScan("GEMI")}
          disabled={!selectedClientId}
        />
        <DebtServiceCard
          platform="MUNICIPALITY"
          title={t("municipalityTitle")}
          description={t("municipalityDescription")}
          lastScanDate={selectedClient?.lastScanAt ?? null}
          totalDebts={selectedClient?.totalDebts ?? 0}
          scanStatus={municipalityScanStatus}
          onScan={() => handleScan("MUNICIPALITY")}
          disabled={!selectedClientId}
        />
      </div>

      {/* Active Scan Progress */}
      {activeScanId && (
        <ScanProgressCard
          scanId={activeScanId}
          onComplete={handleScanComplete}
        />
      )}

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
