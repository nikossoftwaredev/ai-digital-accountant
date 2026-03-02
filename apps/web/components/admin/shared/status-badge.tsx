import type { ClientStatus } from "@repo/shared";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/general/utils";

const statusStyles: Record<ClientStatus, string> = {
  ACTIVE: "border-green-500/50 text-green-600 dark:text-green-400",
  PENDING: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400",
  ERROR: "border-red-500/50 text-red-600 dark:text-red-400",
};

interface StatusBadgeProps {
  status: ClientStatus;
  label: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => (
  <Badge variant="outline" className={cn(statusStyles[status])}>
    {label}
  </Badge>
);
