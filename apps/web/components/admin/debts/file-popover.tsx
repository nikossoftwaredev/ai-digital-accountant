"use client";

import { Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DebtFileRow } from "@/server_actions/scans";

interface FilePopoverProps {
  files: DebtFileRow[];
  /** Legacy documentUrl from Debt model (before ClientFile migration) */
  legacyUrl?: string | null;
}

export const FilePopover = ({ files, legacyUrl }: FilePopoverProps) => {
  // Combine new files + legacy documentUrl
  const allFiles = [
    ...files,
    ...(legacyUrl
      ? [{ id: "legacy", fileName: "document.pdf", fileUrl: legacyUrl, fileType: "application/pdf" }]
      : []),
  ];

  if (allFiles.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1 px-2 py-1">
          <FileText className="size-3.5" />
          <span className="text-xs">{allFiles.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-1">
          {allFiles.map((file) => (
            <a
              key={file.id}
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{file.fileName}</span>
              <Download className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
