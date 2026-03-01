import { LucideIcon, Receipt, Settings, Users } from "lucide-react";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavItems: Record<string, AdminNavItem[]> = {
  Management: [{ label: "Users", href: "users", icon: Users }],
  System: [{ label: "Settings", href: "settings", icon: Settings }],
  Finance: [{ label: "Expenses", href: "expenses", icon: Receipt }],
};
