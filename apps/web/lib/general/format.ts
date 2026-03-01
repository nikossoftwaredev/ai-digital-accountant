export const formatGreekDate = (isoString: string | null): string => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatGreekDateTime = (isoString: string | null): string => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
