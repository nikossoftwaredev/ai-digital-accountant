import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/general/utils";

type ClientStatusType = "ACTIVE" | "PENDING" | "ERROR";

const statusConfig: Record<ClientStatusType, { label: string; className: string }> = {
  ACTIVE: { label: "Ενεργός", className: "border-green-500/50 text-green-600 dark:text-green-400" },
  PENDING: { label: "Εκκρεμής", className: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" },
  ERROR: { label: "Σφάλμα", className: "border-red-500/50 text-red-600 dark:text-red-400" },
};

interface StatusBadgeProps {
  status: ClientStatusType;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
};
