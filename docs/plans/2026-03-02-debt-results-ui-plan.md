# Debt Results UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a per-client debt summary accordion below the scan trigger cards, showing debts grouped by platform with totals, RF/wire codes, file attachments, and quick actions.

**Architecture:** New `DebtFile` model for multiple files per debt. New `rfCode`/`wireCode` fields on `Debt`. Two new server actions (`getClientDebtSummary`, `getClientScanDates`). New `ClientDebtSummary` component using shadcn Accordion that slots into the existing debts page between scan cards and scan history.

**Tech Stack:** Prisma (schema + migration), Next.js server actions, shadcn/ui (Accordion, Popover, Badge, Button), next-intl translations, Lucide icons.

**Design Doc:** `docs/plans/2026-03-02-debt-results-ui-design.md`

---

## Task 1: Prisma Schema — Add DebtFile model + Debt fields

**Files:**
- Modify: `packages/shared/prisma/schema.prisma:160-180` (Debt model)
- Modify: `packages/shared/prisma/schema.prisma` (add DebtFile model after Debt)

**Step 1: Add rfCode, wireCode fields to Debt model and DebtFile model**

In `schema.prisma`, update the Debt model (lines 160-180) to:

```prisma
model Debt {
  id       String @id @default(cuid())
  clientId String @map("client_id")
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  scanId   String @map("scan_id")
  scan     Scan   @relation(fields: [scanId], references: [id], onDelete: Cascade)

  category    DebtCategory
  amount      Decimal      @db.Decimal(12, 2)
  platform    Platform
  priority    Priority     @default(MEDIUM)
  description String?
  dueDate     DateTime?    @map("due_date")
  documentUrl String?      @map("document_url")  // DEPRECATED: use DebtFile
  rfCode      String?      @map("rf_code")
  wireCode    String?      @map("wire_code")

  files     DebtFile[]
  createdAt DateTime @default(now()) @map("created_at")

  @@index([scanId])
  @@index([clientId, createdAt(sort: Desc)])
  @@map("debts")
}
```

Add DebtFile model immediately after the Debt model:

```prisma
// ═══════════════════════════════════════════
// DEBT FILE — attachments for a debt record
// ═══════════════════════════════════════════
model DebtFile {
  id       String @id @default(cuid())
  debtId   String @map("debt_id")
  debt     Debt   @relation(fields: [debtId], references: [id], onDelete: Cascade)

  fileName String @map("file_name")
  fileUrl  String @map("file_url")
  fileType String @default("application/pdf") @map("file_type")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([debtId])
  @@map("debt_files")
}
```

**Note:** Keep `documentUrl` for now (deprecated) — existing scrapers still write to it. We'll migrate data separately.

**Step 2: Generate and apply migration**

Run:
```bash
cd apps/web && npx prisma migrate dev --name add-debt-files-and-codes
```

Expected: Migration creates `debt_files` table, adds `rf_code` and `wire_code` columns to `debts`.

**Step 3: Regenerate Prisma client**

Run:
```bash
cd packages/shared && npx prisma generate
```

**Step 4: Commit**

```bash
git add packages/shared/prisma/schema.prisma packages/shared/prisma/migrations/
git commit -m "feat: add DebtFile model and rfCode/wireCode fields to Debt"
```

---

## Task 2: Server Actions — getClientDebtSummary and getClientScanDates

**Files:**
- Modify: `apps/web/server_actions/scans.ts` (add new types + functions at end)

**Step 1: Add new types**

Append these types after the existing `ScanStatusResult` type (line 63):

```typescript
export type DebtFileRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
};

export type DebtDetailRow = {
  id: string;
  category: string;
  amount: number;
  platform: string;
  priority: string;
  description: string | null;
  dueDate: string | null;
  rfCode: string | null;
  wireCode: string | null;
  documentUrl: string | null;
  files: DebtFileRow[];
};

export type PlatformDebtGroup = {
  platform: string;
  subtotal: number;
  fileCount: number;
  debts: DebtDetailRow[];
};

export type ClientDebtSummary = {
  scanId: string;
  scanDate: string;
  total: number;
  groups: PlatformDebtGroup[];
};

export type ScanDateOption = {
  scanId: string;
  date: string;
  totalDebts: number;
};
```

**Step 2: Add getClientDebtSummary function**

Append after `getClientDebts` (line 321):

```typescript
// ── getClientDebtSummary ─────────────────────────────────────────

export const getClientDebtSummary = async (
  clientId: string,
  scanId?: string
): Promise<ClientDebtSummary | null> => {
  const accountantId = await getAccountantId();

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, accountantId },
    select: { id: true },
  });
  if (!client) return null;

  // Find target scan
  const scan = scanId
    ? await prisma.scan.findFirst({
        where: { id: scanId, clientId, accountantId, status: "COMPLETED" },
        select: { id: true, completedAt: true },
      })
    : await prisma.scan.findFirst({
        where: { clientId, accountantId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { id: true, completedAt: true },
      });

  if (!scan) return null;

  // Fetch debts with files
  const debts = await prisma.debt.findMany({
    where: { scanId: scan.id },
    orderBy: { amount: "desc" },
    include: { files: true },
  });

  // Group by platform
  const platformMap = new Map<string, DebtDetailRow[]>();
  for (const d of debts) {
    const rows = platformMap.get(d.platform) ?? [];
    rows.push({
      id: d.id,
      category: d.category,
      amount: Number(d.amount),
      platform: d.platform,
      priority: d.priority,
      description: d.description,
      dueDate: d.dueDate?.toISOString() ?? null,
      rfCode: d.rfCode ?? null,
      wireCode: d.wireCode ?? null,
      documentUrl: d.documentUrl ?? null,
      files: d.files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileType: f.fileType,
      })),
    });
    platformMap.set(d.platform, rows);
  }

  // Build groups with subtotals
  const groups: PlatformDebtGroup[] = [];
  for (const [platform, platformDebts] of platformMap) {
    const subtotal = platformDebts.reduce((sum, d) => sum + d.amount, 0);
    const fileCount = platformDebts.reduce(
      (sum, d) => sum + d.files.length + (d.documentUrl ? 1 : 0),
      0
    );
    groups.push({ platform, subtotal, fileCount, debts: platformDebts });
  }

  const total = groups.reduce((sum, g) => sum + g.subtotal, 0);

  return {
    scanId: scan.id,
    scanDate: scan.completedAt?.toISOString() ?? new Date().toISOString(),
    total,
    groups,
  };
};
```

**Step 3: Add getClientScanDates function**

Append after `getClientDebtSummary`:

```typescript
// ── getClientScanDates ───────────────────────────────────────────

export const getClientScanDates = async (
  clientId: string
): Promise<ScanDateOption[]> => {
  const accountantId = await getAccountantId();

  const scans = await prisma.scan.findMany({
    where: { clientId, accountantId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: { id: true, completedAt: true, totalDebtsFound: true },
  });

  return scans.map((s) => ({
    scanId: s.id,
    date: s.completedAt?.toISOString() ?? s.id,
    totalDebts: Number(s.totalDebtsFound),
  }));
};
```

**Step 4: Verify types compile**

Run: `cd apps/web && pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add apps/web/server_actions/scans.ts
git commit -m "feat: add getClientDebtSummary and getClientScanDates server actions"
```

---

## Task 3: Translation Keys

**Files:**
- Modify: `apps/web/messages/el.json` — `Admin.debts` section
- Modify: `apps/web/messages/en.json` — `Admin.debts` section

**Step 1: Add new keys to both locale files**

Add these keys inside `Admin.debts` (after existing keys, before `comingSoon`):

**el.json:**
```json
"clientDebts": "Οφειλές Πελάτη",
"totalSum": "Σύνολο",
"subtotal": "Υποσύνολο",
"scanDateLabel": "Ημ. Σάρωσης",
"rfCode": "Κωδικός RF",
"wireCode": "Κωδικός Εμβάσματος",
"files": "Αρχεία",
"viewFiles": "Προβολή Αρχείων",
"downloadFile": "Λήψη",
"noScanData": "Δεν υπάρχουν δεδομένα σάρωσης",
"runScanFirst": "Εκτελέστε μια σάρωση πρώτα.",
"noFiles": "Χωρίς αρχεία"
```

**en.json:**
```json
"clientDebts": "Client Debts",
"totalSum": "Total",
"subtotal": "Subtotal",
"scanDateLabel": "Scan Date",
"rfCode": "RF Code",
"wireCode": "Wire Code",
"files": "Files",
"viewFiles": "View Files",
"downloadFile": "Download",
"noScanData": "No scan data",
"runScanFirst": "Run a scan first.",
"noFiles": "No files"
```

**Step 2: Commit**

```bash
git add apps/web/messages/el.json apps/web/messages/en.json
git commit -m "feat: add translation keys for debt results summary"
```

---

## Task 4: FilePopover Component

**Files:**
- Create: `apps/web/components/admin/debts/file-popover.tsx`

**Step 1: Create the component**

This component shows a clickable file count badge. Clicking opens a popover listing files with download links.

```tsx
"use client";

import { Download, FileText, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DebtFileRow } from "@/server_actions/scans";

interface FilePopoverProps {
  files: DebtFileRow[];
  /** Legacy documentUrl from Debt model (before DebtFile migration) */
  legacyUrl?: string | null;
}

export const FilePopover = ({ files, legacyUrl }: FilePopoverProps) => {
  const t = useTranslations("Admin.debts");

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
          <Paperclip className="size-3.5" />
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
```

**Step 2: Commit**

```bash
git add apps/web/components/admin/debts/file-popover.tsx
git commit -m "feat: add FilePopover component for debt file downloads"
```

---

## Task 5: ClientDebtSummary Component

**Files:**
- Create: `apps/web/components/admin/debts/client-debt-summary.tsx`

**Dependencies:** Requires shadcn `Accordion` (already installed at `components/ui/accordion.tsx`), `Popover` (already installed), `Badge`, `Button`, `Card`.

**Step 1: Create the component**

This is the main accordion card showing per-platform debt groups with a total sum and date selector.

```tsx
"use client";

import { Calendar, ChevronDown, Mail, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { formatEuro } from "@/components/admin/shared/currency-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ClientDebtSummary as ClientDebtSummaryData,
  ScanDateOption,
} from "@/server_actions/scans";
import {
  getClientDebtSummary,
  getClientScanDates,
} from "@/server_actions/scans";

import { FilePopover } from "./file-popover";

interface ClientDebtSummaryProps {
  clientId: string;
  /** Refresh trigger — increment to re-fetch after a scan completes */
  refreshKey?: number;
}

export const ClientDebtSummary = ({
  clientId,
  refreshKey,
}: ClientDebtSummaryProps) => {
  const t = useTranslations("Admin.debts");
  const tCategories = useTranslations("Admin.scans.categories");

  const [data, setData] = useState<ClientDebtSummaryData | null>(null);
  const [scanDates, setScanDates] = useState<ScanDateOption[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch scan dates for the selector
  const fetchScanDates = useCallback(async () => {
    const dates = await getClientScanDates(clientId);
    setScanDates(dates);
    if (dates.length > 0 && !selectedScanId) {
      setSelectedScanId(dates[0].scanId);
    }
  }, [clientId, selectedScanId]);

  // Fetch debt summary for selected scan
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const summary = await getClientDebtSummary(
      clientId,
      selectedScanId || undefined
    );
    setData(summary);
    setLoading(false);
  }, [clientId, selectedScanId]);

  // Initial load + when client or refreshKey changes
  useEffect(() => {
    setSelectedScanId("");
    setData(null);
    fetchScanDates();
  }, [clientId, refreshKey]);

  // Fetch summary when selectedScanId changes
  useEffect(() => {
    if (selectedScanId) {
      fetchSummary();
    }
  }, [selectedScanId, fetchSummary]);

  if (!loading && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t("noScanData")}</p>
          <p className="text-sm">{t("runScanFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{t("clientDebts")}</CardTitle>
          {data && (
            <p className="mt-1 text-2xl font-bold">
              {t("totalSum")}: {formatEuro(data.total)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {scanDates.length > 1 && (
            <Select value={selectedScanId} onValueChange={setSelectedScanId}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="mr-2 size-4" />
                <SelectValue placeholder={t("scanDateLabel")} />
              </SelectTrigger>
              <SelectContent>
                {scanDates.map((sd) => (
                  <SelectItem key={sd.scanId} value={sd.scanId}>
                    {formatDate(sd.date)} ({formatEuro(sd.totalDebts)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("loadingScan")}
          </div>
        ) : data ? (
          <Accordion type="multiple" className="w-full">
            {data.groups.map((group) => (
              <AccordionItem key={group.platform} value={group.platform}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-medium">
                        {group.platform}
                      </Badge>
                      {data.scanDate && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(data.scanDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {formatEuro(group.subtotal)}
                      </span>
                      {group.fileCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="size-3.5" />
                          {group.fileCount}
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead className="text-right">
                          {t("totalDebt")}
                        </TableHead>
                        <TableHead>{t("rfCode")}</TableHead>
                        <TableHead className="text-right">
                          {t("files")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.debts.map((debt) => (
                        <TableRow key={debt.id}>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {tCategories(debt.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {debt.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatEuro(debt.amount)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {debt.rfCode ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <FilePopover
                              files={debt.files}
                              legacyUrl={debt.documentUrl}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null}
      </CardContent>
    </Card>
  );
};
```

**Step 2: Verify types compile**

Run: `cd apps/web && pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/components/admin/debts/client-debt-summary.tsx
git commit -m "feat: add ClientDebtSummary accordion component"
```

---

## Task 6: Wire ClientDebtSummary into Debts Page

**Files:**
- Modify: `apps/web/components/admin/debts/debts-page-client.tsx`

**Step 1: Import and add state**

Add import at top (after existing imports around line 34):

```typescript
import { ClientDebtSummary } from "./client-debt-summary";
```

Add a `refreshKey` state to trigger re-fetch after scan completes (after `recentScans` state, around line 64):

```typescript
const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
```

**Step 2: Increment refreshKey on scan complete**

In the `handleScanComplete` callback (around line 100), add after `setRecentScans`:

```typescript
setSummaryRefreshKey((k) => k + 1);
```

**Step 3: Add ClientDebtSummary between scan progress and scan history**

After the `{/* Active Scan Progress */}` block (around line 241) and before the `{/* Scan History */}` block, add:

```tsx
{/* Client Debt Summary */}
{selectedClientId && (
  <ClientDebtSummary
    clientId={selectedClientId}
    refreshKey={summaryRefreshKey}
  />
)}
```

**Step 4: Verify types compile**

Run: `cd apps/web && pnpm tsc --noEmit`

**Step 5: Verify visually**

Run: `node screenshot.mjs http://localhost:3000/en/admin/debts debts-summary`

Verify:
- Client selector works
- When no client selected, no summary card shown
- When client selected but no scans, empty state shown
- Accordion renders (even if no real data yet)

**Step 6: Commit**

```bash
git add apps/web/components/admin/debts/debts-page-client.tsx
git commit -m "feat: wire ClientDebtSummary into debts page"
```

---

## Task 7: Install shadcn Select (if missing)

**Prerequisite check:** Verify `components/ui/select.tsx` exists. If not:

Run:
```bash
npx shadcn@latest add select
```

The `ClientDebtSummary` uses `Select` for the scan date picker. The `Accordion`, `Popover`, `Table`, `Badge`, and `Button` components are already installed.

---

## Task 8: Final Verification

**Step 1: Type check**

Run: `cd apps/web && pnpm tsc --noEmit`

Expected: No new type errors (pre-existing Zod/react-hook-form errors are acceptable).

**Step 2: Lint**

Run: `cd apps/web && pnpm lint`

Expected: No new lint errors.

**Step 3: Visual verification**

1. Start dev server: `pnpm dev`
2. Navigate to `/admin/debts`
3. Select a client
4. Verify:
   - Client Debt Summary card appears below scan cards
   - If client has completed scans: accordion shows platform groups with totals
   - Total sum displayed in card header
   - Expanding a platform shows debt table with category, description, amount, RF code, files
   - Date selector appears when multiple scans exist
   - Empty state shows when no scan data
5. Run a scan and verify:
   - After scan completes, summary card refreshes with new data
   - Files popover works for debts with attachments (e.g. vehicle tax PDFs)

**Step 4: Commit any fixes**

---

## Summary of All New/Modified Files

| Action | File |
|--------|------|
| Modify | `packages/shared/prisma/schema.prisma` |
| Create | `packages/shared/prisma/migrations/XXXXXX_add_debt_files_and_codes/` |
| Modify | `apps/web/server_actions/scans.ts` |
| Modify | `apps/web/messages/el.json` |
| Modify | `apps/web/messages/en.json` |
| Create | `apps/web/components/admin/debts/file-popover.tsx` |
| Create | `apps/web/components/admin/debts/client-debt-summary.tsx` |
| Modify | `apps/web/components/admin/debts/debts-page-client.tsx` |
