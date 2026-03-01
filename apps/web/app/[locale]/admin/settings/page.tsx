import { setRequestLocale } from "next-intl/server";

import { SettingsPageClient } from "@/components/admin/settings/settings-page-client";
import { getSettings } from "@/server_actions/settings";
import type { BasePageProps } from "@/types/page-props";

const SettingsPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const settings = await getSettings();

  return <SettingsPageClient settings={settings} />;
};

export default SettingsPage;
