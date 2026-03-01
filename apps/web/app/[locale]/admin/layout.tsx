import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "@/lib/i18n/navigation";
import type { BaseLayoutProps } from "@/types/page-props";

const AdminLayout = async ({ children, params }: BaseLayoutProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect({ href: "/login", locale });
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="h-svh max-h-svh overflow-hidden">
        <AdminHeader />
        <ScrollArea className="h-0 flex-1">
          <main className="mx-auto max-w-screen-2xl px-4 py-6">
            {children}
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
