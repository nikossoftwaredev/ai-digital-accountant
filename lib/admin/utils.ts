const statusColorMap: Record<string, string> = {
  Active: "border-green-500/50 text-green-600 dark:text-green-400",
  Approved: "border-green-500/50 text-green-600 dark:text-green-400",
  Pending: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400",
  Inactive: "border-muted-foreground/50 text-muted-foreground",
  Rejected: "border-red-500/50 text-red-600 dark:text-red-400",
};

export const getStatusColor = (status: string) =>
  statusColorMap[status] ?? "border-muted-foreground/50 text-muted-foreground";
