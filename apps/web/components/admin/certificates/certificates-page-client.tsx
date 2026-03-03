"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { ClientSearchBar } from "@/components/admin/shared/client-search-bar";
import { PageHeader } from "@/components/admin/shared/page-header";
import { PreScanDialog } from "@/components/admin/shared/pre-scan-dialog";
import { ServiceCard } from "@/components/admin/shared/service-card";
import type { ClientRow } from "@/server_actions/clients";
import { startCertificateRequest } from "@/server_actions/certificates";

import { CertificateProgressCard } from "./certificate-progress-card";
import { InsuranceCertForm } from "./insurance-cert-form";

// ── Static card config ──────────────────────────────────────────

interface CertCardConfig {
  id: string;
  titleKey: string;
  descKey: string;
  group: string;
  platformKey: string;
  comingSoon: boolean;
}

const CERT_CARDS: CertCardConfig[] = [
  // ΑΑΔΕ
  { id: "taxClearance", titleKey: "taxClearance", descKey: "taxClearanceDesc", group: "groupAade", platformKey: "platformAade", comingSoon: true },
  { id: "enfia", titleKey: "enfiaTitle", descKey: "enfiaDesc", group: "groupAade", platformKey: "platformAade", comingSoon: true },
  { id: "taxAssessment", titleKey: "taxAssessmentTitle", descKey: "taxAssessmentDesc", group: "groupAade", platformKey: "platformAade", comingSoon: true },
  { id: "registry", titleKey: "registryTitle", descKey: "registryDesc", group: "groupAade", platformKey: "platformAade", comingSoon: true },
  // ΕΦΚΑ
  { id: "socialSecurityClearance", titleKey: "socialSecurityClearance", descKey: "socialSecurityClearanceDesc", group: "groupEfka", platformKey: "platformEfka", comingSoon: false },
  // Εργάνη
  { id: "employerBank", titleKey: "employerBankTitle", descKey: "employerBankDesc", group: "groupErgani", platformKey: "platformErgani", comingSoon: true },
  { id: "employerDypa", titleKey: "employerDypaTitle", descKey: "employerDypaDesc", group: "groupErgani", platformKey: "platformErgani", comingSoon: true },
  { id: "employerEnsypa", titleKey: "employerEnsypaTitle", descKey: "employerEnsypaDesc", group: "groupErgani", platformKey: "platformErgani", comingSoon: true },
  // ΓΕΜΗ
  { id: "gemi", titleKey: "gemiTitle", descKey: "gemiDesc", group: "groupGemi", platformKey: "platformGemi", comingSoon: true },
  // gov.gr
  { id: "solemnDeclaration", titleKey: "solemnDeclarationTitle", descKey: "solemnDeclarationDesc", group: "groupGovgr", platformKey: "platformGovgr", comingSoon: true },
  { id: "authorization", titleKey: "authorizationTitle", descKey: "authorizationDesc", group: "groupGovgr", platformKey: "platformGovgr", comingSoon: true },
  { id: "criminalRecord", titleKey: "criminalRecordTitle", descKey: "criminalRecordDesc", group: "groupGovgr", platformKey: "platformGovgr", comingSoon: true },
  { id: "signatureAuth", titleKey: "signatureAuthTitle", descKey: "signatureAuthDesc", group: "groupGovgr", platformKey: "platformGovgr", comingSoon: true },
];

// Unique group keys in order
const GROUPS = ["groupAade", "groupEfka", "groupErgani", "groupGemi", "groupGovgr"];

// ── Component ────────────────────────────────────────────────────

interface CertificatesPageClientProps {
  clients: ClientRow[];
  initialClientId?: string;
}

export const CertificatesPageClient = ({
  clients,
  initialClientId,
}: CertificatesPageClientProps) => {
  const t = useTranslations("Admin.certificates");

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId ?? clients[0]?.id ?? "");
  const [preScanOpen, setPreScanOpen] = useState(false);
  const [insuranceCertFlag, setInsuranceCertFlag] = useState("flagEkkath");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const handleScan = (cardId: string) => {
    if (!selectedClientId) {
      toast.error(t("selectClientFirst"));
      return;
    }

    if (cardId === "socialSecurityClearance") {
      setPreScanOpen(true);
      return;
    }

    // Other cards: direct scan (to be wired later)
    toast.info(`Scan ${cardId} — coming soon`);
  };

  const handleInsuranceScanConfirm = async () => {
    setPreScanOpen(false);

    const result = await startCertificateRequest({
      clientId: selectedClientId,
      certificateType: "INSURANCE_CLEARANCE",
      params: { purposeFlag: insuranceCertFlag },
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setActiveRequestId(result.requestId!);
    toast.success(t("requestSubmitted"));
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      {/* Client Selector */}
      <ClientSearchBar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelect={setSelectedClientId}
      />

      {/* Certificate Cards grouped by platform */}
      {GROUPS.map((group) => {
        const groupCards = CERT_CARDS.filter((c) => c.group === group);
        if (groupCards.length === 0) return null;

        return (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t(group)}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {groupCards.map((card) => (
                <ServiceCard
                  key={card.id}
                  title={t(card.titleKey)}
                  description={t(card.descKey)}
                  platform={t(card.platformKey)}
                  comingSoon={card.comingSoon}
                  comingSoonLabel={t("comingSoon")}
                  scanLabel={t("scan")}
                  onScan={() => handleScan(card.id)}
                  disabled={!selectedClientId}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Active Certificate Request Progress */}
      {activeRequestId && (
        <CertificateProgressCard
          requestId={activeRequestId}
          title={t("socialSecurityClearance")}
          onComplete={() => {
            // Keep showing the card with final status
          }}
        />
      )}

      {/* Pre-scan dialog for Ασφαλιστική Ενημερότητα */}
      <PreScanDialog
        open={preScanOpen}
        onOpenChange={setPreScanOpen}
        title={t("socialSecurityClearance")}
        onConfirm={handleInsuranceScanConfirm}
        scanLabel={t("scan")}
        cancelLabel={t("cancel")}
      >
        <InsuranceCertForm
          value={insuranceCertFlag}
          onChange={setInsuranceCertFlag}
          selectLabel={t("selectPurpose")}
          searchLabel={t("searchPurpose")}
          emptyLabel={t("noPurposeFound")}
        />
      </PreScanDialog>
    </div>
  );
};
