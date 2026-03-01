import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/shared/page-header";
import type { BasePageProps } from "@/types/page-props";

const DashboardPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.dashboard");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <p className="text-muted-foreground">Dashboard content coming soon...</p>
    </div>
  );
};

export default DashboardPage;
