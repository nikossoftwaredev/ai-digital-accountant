"use client";

import { AlertCircle, CheckCircle2, Clock, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

// ── Types ────────────────────────────────────────────────────────

export type CardScanStatus = "idle" | "scanning" | "completed" | "failed";

export interface ServiceCardProps {
  title: string;
  description: string;
  /** Platform badge label shown next to coming-soon badge */
  platform?: string;
  comingSoon?: boolean;
  scanStatus?: CardScanStatus;
  onScan?: () => void;
  disabled?: boolean;
  /** Labels — caller provides translated strings */
  scanLabel?: string;
  comingSoonLabel?: string;
  /** Optional card body content (debt stats, files, etc.) */
  children?: React.ReactNode;
}

// ── Status Icons ─────────────────────────────────────────────────

const statusIcons: Record<CardScanStatus, React.ReactNode> = {
  idle: <Clock className="size-4 text-muted-foreground" />,
  scanning: <Spinner />,
  completed: <CheckCircle2 className="size-4 text-green-500" />,
  failed: <AlertCircle className="size-4 text-red-500" />,
};

// ── Component ────────────────────────────────────────────────────

export const ServiceCard = ({
  title,
  description,
  platform,
  comingSoon = false,
  scanStatus = "idle",
  onScan,
  disabled = false,
  scanLabel = "Scan",
  comingSoonLabel = "Soon",
  children,
}: ServiceCardProps) => (
  <Card className={comingSoon ? "opacity-60" : undefined}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2">
            {comingSoon
              ? <Clock className="size-4 shrink-0 text-muted-foreground" />
              : statusIcons[scanStatus]}
            {title}
          </CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {comingSoon ? (
          <div className="ml-2 flex shrink-0 items-center gap-2">
            {platform && <Badge variant="outline">{platform}</Badge>}
            <Badge variant="secondary">{comingSoonLabel}</Badge>
          </div>
        ) : (
          <div className="ml-2 flex shrink-0 items-center gap-2">
            {platform && <Badge variant="outline">{platform}</Badge>}
            <Button
              size="sm"
              onClick={onScan}
              disabled={disabled || scanStatus === "scanning"}
            >
              {scanStatus === "scanning" ? (
                <Spinner />
              ) : (
                <>
                  <Play className="size-4" />
                  {scanLabel}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </CardHeader>
    {!comingSoon && children && (
      <CardContent>{children}</CardContent>
    )}
  </Card>
);
