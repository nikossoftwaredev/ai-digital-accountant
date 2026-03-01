import { Mail, Plus, Scan } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CurrencyCell, formatEuro } from "@/components/admin/shared/currency-cell";
import { PageHeader } from "@/components/admin/shared/page-header";
import { StatCard } from "@/components/admin/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatGreekDate } from "@/lib/general/format";
import { Link } from "@/lib/i18n/navigation";
import { getDashboardStats, getRecentDebts } from "@/server_actions/dashboard";
import type { BasePageProps } from "@/types/page-props";

const DashboardPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.dashboard");

  const [stats, recentDebts] = await Promise.all([
    getDashboardStats(),
    getRecentDebts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalDebts")} value={formatEuro(stats.totalDebts)} />
        <StatCard label={t("activeClients")} value={String(stats.activeClients)} />
        <StatCard label={t("connectionErrors")} value={String(stats.connectionErrors)} />
        <StatCard
          label={t("lastScanDate")}
          value={stats.lastScanDate ? formatGreekDate(stats.lastScanDate) : t("neverScanned")}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/clients">
            <Plus className="size-4" />
            {t("addClient")}
          </Link>
        </Button>
        <Button variant="outline" disabled>
          <Scan className="size-4" />
          {t("bulkScan")}
        </Button>
        <Button variant="outline" disabled>
          <Mail className="size-4" />
          {t("sendEmails")}
        </Button>
      </div>

      {/* Recent debts */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{t("recentDebts")}</h3>

        {recentDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground">{t("noDebts")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("platform")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.clientName}</TableCell>
                    <TableCell>{debt.category}</TableCell>
                    <TableCell>{debt.platform}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyCell amount={debt.amount} />
                    </TableCell>
                    <TableCell>{formatGreekDate(debt.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
