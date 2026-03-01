import { LucideIcon, Settings } from "lucide-react";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavItems: Record<string, AdminNavItem[]> = {
  System: [{ label: "Settings", href: "settings", icon: Settings }],
};
