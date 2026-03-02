"use client";

import { Calendar, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { formatEuro } from "@/components/admin/shared/currency-cell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ClientDebtSummaryData,
  ScanDateOption,
} from "@/server_actions/scans";
import {
  getClientDebtSummary,
  getClientScanDates,
} from "@/server_actions/scans";

import { FilePopover } from "./file-popover";

interface ClientDebtSummaryProps {
  clientId: string;
  /** Increment to re-fetch after a scan completes */
  refreshKey?: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const ClientDebtSummary = ({
  clientId,
  refreshKey,
}: ClientDebtSummaryProps) => {
  const t = useTranslations("Admin.debts");
  const tCategories = useTranslations("Admin.scans.categories");

  const [data, setData] = useState<ClientDebtSummaryData | null>(null);
  const [scanDates, setScanDates] = useState<ScanDateOption[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load scan dates + latest summary when client or refreshKey changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const dates = await getClientScanDates(clientId);
      if (cancelled) return;
      setScanDates(dates);
      if (dates.length === 0) {
        setData(null);
        setSelectedScanId("");
        setLoading(false);
        return;
      }
      const latestId = dates[0].scanId;
      setSelectedScanId(latestId);
      const summary = await getClientDebtSummary(clientId, latestId);
      if (cancelled) return;
      setData(summary);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [clientId, refreshKey]);

  // When user picks a different scan date
  const handleScanDateChange = useCallback(
    async (scanId: string) => {
      setSelectedScanId(scanId);
      setLoading(true);
      const summary = await getClientDebtSummary(clientId, scanId);
      setData(summary);
      setLoading(false);
    },
    [clientId]
  );

  // No client selected
  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("clientDebts")}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t("selectClientFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state: no scans
  if (!loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("clientDebts")}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t("noScanData")}</p>
          <p className="text-sm">{t("runScanFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{t("clientDebts")}</CardTitle>
          {data && (
            <p className="mt-1 text-2xl font-bold">
              {t("totalSum")}: {formatEuro(data.total)}
            </p>
          )}
        </div>
        {scanDates.length > 1 && (
          <Select value={selectedScanId} onValueChange={handleScanDateChange}>
            <SelectTrigger className="w-[220px]">
              <Calendar className="mr-2 size-4" />
              <SelectValue placeholder={t("scanDateLabel")} />
            </SelectTrigger>
            <SelectContent>
              {scanDates.map((sd) => (
                <SelectItem key={sd.scanId} value={sd.scanId}>
                  {formatDate(sd.date)} ({formatEuro(sd.totalDebts)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="py-8 text-center text-muted-foreground">
            {t("loadingScan")}
          </div>
        )}
        {!loading && data && (
          <Accordion type="multiple" className="w-full">
            {data.groups.map((group) => (
              <AccordionItem key={group.platform} value={group.platform}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-medium">
                        {group.platform}
                      </Badge>
                      {data.scanDate && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(data.scanDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {formatEuro(group.subtotal)}
                      </span>
                      {group.fileCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="size-3.5" />
                          {group.fileCount}
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead className="text-right">
                          {t("totalDebt")}
                        </TableHead>
                        <TableHead>{t("rfCode")}</TableHead>
                        <TableHead className="text-right">
                          {t("files")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.debts.map((debt) => (
                        <TableRow key={debt.id}>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {tCategories(debt.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {debt.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatEuro(debt.amount)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {debt.rfCode ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <FilePopover
                              files={debt.files}
                              legacyUrl={debt.documentUrl}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
