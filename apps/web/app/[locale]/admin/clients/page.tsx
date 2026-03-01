import { setRequestLocale } from "next-intl/server";

import { ClientsPageClient } from "@/components/admin/clients/clients-page-client";
import { getClients } from "@/server_actions/clients";
import type { BasePageProps } from "@/types/page-props";

const ClientsPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const clients = await getClients();

  return <ClientsPageClient clients={clients} />;
};

export default ClientsPage;
