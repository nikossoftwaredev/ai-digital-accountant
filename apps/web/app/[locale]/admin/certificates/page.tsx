import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BasePageProps } from "@/types/page-props";

const CertificatesPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin.certificates");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("taxClearance")}</CardTitle>
            <CardDescription>{t("taxClearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("socialSecurityClearance")}</CardTitle>
            <CardDescription>{t("socialSecurityClearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CertificatesPage;
