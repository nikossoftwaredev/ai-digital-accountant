import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/lib/i18n/navigation";
import { BasePageProps } from "@/types/page-props";

const AdminPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/admin/users", locale });
};

export default AdminPage;
