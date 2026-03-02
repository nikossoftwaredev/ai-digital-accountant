import { Calendar, Landmark, TriangleAlert, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { formatEuro } from "@/components/admin/shared/currency-cell";
import { PageHeader } from "@/components/admin/shared/page-header";
import { StatCard } from "@/components/admin/shared/stat-card";
import { formatGreekDate } from "@/lib/general/format";
import { getDashboardStats } from "@/server_actions/dashboard";
import type { BasePageProps } from "@/types/page-props";

const DashboardPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.dashboard");

  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalDebts")}
          value={formatEuro(stats.totalDebts)}
          icon={Landmark}
        />
        <StatCard
          label={t("activeClients")}
          value={String(stats.activeClients)}
          icon={Users}
        />
        <StatCard
          label={t("connectionErrors")}
          value={String(stats.connectionErrors)}
          icon={TriangleAlert}
        />
        <StatCard
          label={t("lastScanDate")}
          value={stats.lastScanDate ? formatGreekDate(stats.lastScanDate) : t("neverScanned")}
          icon={Calendar}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
