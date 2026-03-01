import {
  LayoutDashboard,
  type LucideIcon,
  Mail,
  ScanLine,
  Settings,
  Users,
} from "lucide-react";

export interface AdminNavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  groupKey: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    groupKey: "Admin.nav.management",
    items: [
      { labelKey: "Admin.nav.dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { labelKey: "Admin.nav.clients", href: "/admin/clients", icon: Users },
      { labelKey: "Admin.nav.scans", href: "/admin/scans", icon: ScanLine },
    ],
  },
  {
    groupKey: "Admin.nav.communication",
    items: [
      { labelKey: "Admin.nav.emails", href: "/admin/emails", icon: Mail },
    ],
  },
  {
    groupKey: "Admin.nav.system",
    items: [
      { labelKey: "Admin.nav.settings", href: "/admin/settings", icon: Settings },
    ],
  },
];
