import { setRequestLocale } from "next-intl/server";

import { DebtsPageClient } from "@/components/admin/debts/debts-page-client";
import { getClients } from "@/server_actions/clients";
import { getRecentScans } from "@/server_actions/scans";
import type { BasePageProps } from "@/types/page-props";

interface DebtsPageProps extends BasePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

const DebtsPage = async ({ params, searchParams }: DebtsPageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { clientId } = await searchParams;

  const [clients, recentScans] = await Promise.all([
    getClients(),
    getRecentScans(),
  ]);

  return (
    <DebtsPageClient
      clients={clients}
      recentScans={recentScans}
      initialClientId={clientId}
    />
  );
};

export default DebtsPage;
