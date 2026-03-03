import { setRequestLocale } from "next-intl/server";

import { CertificatesPageClient } from "@/components/admin/certificates/certificates-page-client";
import { getClients } from "@/server_actions/clients";
import type { BasePageProps } from "@/types/page-props";

interface CertificatesPageProps extends BasePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

const CertificatesPage = async ({ params, searchParams }: CertificatesPageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { clientId } = await searchParams;
  const clients = await getClients();

  return (
    <CertificatesPageClient
      clients={clients}
      initialClientId={clientId}
    />
  );
};

export default CertificatesPage;
