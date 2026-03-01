import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}

export const StatCard = ({ label, value, description, valueClassName }: StatCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <p className="text-sm text-muted-foreground">{label}</p>
    </CardHeader>
    <CardContent>
      <CardTitle className={valueClassName}>{value}</CardTitle>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </CardContent>
  </Card>
);
