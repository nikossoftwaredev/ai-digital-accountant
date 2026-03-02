import { setRequestLocale } from "next-intl/server";

import { EmailsPageClient } from "@/components/admin/emails/emails-page-client";
import { getClientsWithDebts, getEmailLogs } from "@/server_actions/emails";
import type { BasePageProps } from "@/types/page-props";

interface EmailsPageProps extends BasePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

const EmailsPage = async ({ params, searchParams }: EmailsPageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { clientId } = await searchParams;

  const [clients, logs] = await Promise.all([
    getClientsWithDebts(),
    getEmailLogs(),
  ]);

  return (
    <EmailsPageClient
      clients={clients}
      logs={logs}
      initialClientId={clientId}
    />
  );
};

export default EmailsPage;
