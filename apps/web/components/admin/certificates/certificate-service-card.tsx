import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ────────────────────────────────────────────────────────

interface CertificateServiceCardProps {
  title: string;
  description: string;
  platform: string;
  comingSoon?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export const CertificateServiceCard = ({
  title,
  description,
  platform,
  comingSoon = true,
}: CertificateServiceCardProps) => (
  <Card className={comingSoon ? "opacity-60" : undefined}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <Badge variant="outline" className="ml-2 shrink-0">
          {platform}
        </Badge>
      </div>
    </CardHeader>
  </Card>
);
