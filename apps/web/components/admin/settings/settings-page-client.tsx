"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/admin/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsData } from "@/server_actions/settings";

import { ProfileSettingsForm } from "./profile-settings-form";
import { ScanSettingsForm } from "./scan-settings-form";
import { SmtpSettingsForm } from "./smtp-settings-form";

// ── Props ────────────────────────────────────────────────────────

interface SettingsPageClientProps {
  settings: SettingsData;
}

// ── Component ────────────────────────────────────────────────────

export const SettingsPageClient = ({ settings }: SettingsPageClientProps) => {
  const t = useTranslations("Admin.settings");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Tabs defaultValue="smtp">
        <TabsList>
          <TabsTrigger value="smtp">{t("smtp")}</TabsTrigger>
          <TabsTrigger value="scans">{t("scanSettings")}</TabsTrigger>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp">
          <SmtpSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="scans">
          <ScanSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="profile">
          <ProfileSettingsForm settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
