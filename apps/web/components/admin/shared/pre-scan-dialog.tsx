"use client";

import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────

interface PreScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void;
  scanLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────

export const PreScanDialog = ({
  open,
  onOpenChange,
  title,
  onConfirm,
  scanLabel = "Scan",
  cancelLabel = "Cancel",
  children,
}: PreScanDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="py-2">{children}</div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>
          <Play className="size-4" />
          {scanLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
