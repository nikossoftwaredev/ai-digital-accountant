"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/admin/shared/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ClientWithDebtInfo, EmailLogRow } from "@/server_actions/emails";

import { EmailHistoryTab } from "./email-history-tab";
import { EmailSendTab } from "./email-send-tab";

// ── Props ────────────────────────────────────────────────────────

interface EmailsPageClientProps {
  clients: ClientWithDebtInfo[];
  logs: EmailLogRow[];
  initialClientId?: string;
}

// ── Component ────────────────────────────────────────────────────

export const EmailsPageClient = ({
  clients,
  logs,
  initialClientId,
}: EmailsPageClientProps) => {
  const t = useTranslations("Admin.emails");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">{t("send")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <EmailSendTab clients={clients} initialClientId={initialClientId} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <EmailHistoryTab logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
