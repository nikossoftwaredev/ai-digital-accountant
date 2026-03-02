import { getTranslations, setRequestLocale } from "next-intl/server";

import { CertificateServiceCard } from "@/components/admin/certificates/certificate-service-card";
import { PageHeader } from "@/components/admin/shared/page-header";
import type { BasePageProps } from "@/types/page-props";

const CertificatesPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin.certificates");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      {/* ΑΑΔΕ / TaxisNet */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("groupAade")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CertificateServiceCard
            title={t("taxClearance")}
            description={t("taxClearanceDesc")}
            platform={t("platformAade")}
          />
          <CertificateServiceCard
            title={t("enfiaTitle")}
            description={t("enfiaDesc")}
            platform={t("platformAade")}
          />
          <CertificateServiceCard
            title={t("taxAssessmentTitle")}
            description={t("taxAssessmentDesc")}
            platform={t("platformAade")}
          />
          <CertificateServiceCard
            title={t("registryTitle")}
            description={t("registryDesc")}
            platform={t("platformAade")}
          />
        </div>
      </section>

      {/* ΕΦΚΑ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("groupEfka")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CertificateServiceCard
            title={t("socialSecurityClearance")}
            description={t("socialSecurityClearanceDesc")}
            platform={t("platformEfka")}
          />
        </div>
      </section>

      {/* Εργάνη */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("groupErgani")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CertificateServiceCard
            title={t("employerBankTitle")}
            description={t("employerBankDesc")}
            platform={t("platformErgani")}
          />
          <CertificateServiceCard
            title={t("employerDypaTitle")}
            description={t("employerDypaDesc")}
            platform={t("platformErgani")}
          />
          <CertificateServiceCard
            title={t("employerEnsypaTitle")}
            description={t("employerEnsypaDesc")}
            platform={t("platformErgani")}
          />
        </div>
      </section>

      {/* ΓΕΜΗ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("groupGemi")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CertificateServiceCard
            title={t("gemiTitle")}
            description={t("gemiDesc")}
            platform={t("platformGemi")}
          />
        </div>
      </section>

      {/* gov.gr */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("groupGovgr")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CertificateServiceCard
            title={t("solemnDeclarationTitle")}
            description={t("solemnDeclarationDesc")}
            platform={t("platformGovgr")}
          />
          <CertificateServiceCard
            title={t("authorizationTitle")}
            description={t("authorizationDesc")}
            platform={t("platformGovgr")}
          />
          <CertificateServiceCard
            title={t("criminalRecordTitle")}
            description={t("criminalRecordDesc")}
            platform={t("platformGovgr")}
          />
          <CertificateServiceCard
            title={t("signatureAuthTitle")}
            description={t("signatureAuthDesc")}
            platform={t("platformGovgr")}
          />
        </div>
      </section>
    </div>
  );
};

export default CertificatesPage;
