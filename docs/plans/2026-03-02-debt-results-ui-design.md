# Design: Debt Results UI — Per-Client Platform Accordion

## Goal

Replace the flat scan history table with a rich per-client debt summary. When an accountant selects a client, they see all debts grouped by platform in an accordion, with totals, RF/wire codes, attached files, and quick actions.

## Page Layout (top to bottom)

1. Page header — unchanged
2. Client selector combobox — unchanged
3. Scan trigger cards (2×2 grid) — unchanged
4. Coming-soon cards (KEAO, KEAO Arranged, Municipal) — unchanged
5. Scan progress card — unchanged (appears during active scan)
6. **NEW: Client Debt Summary Card** — the core addition
7. Scan history table — stays at bottom, unchanged

## Client Debt Summary Card

Appears when a client is selected and has at least one completed scan.

### Header

- Title: "Οφειλές Πελάτη"
- **Total sum** displayed prominently (e.g. `Σύνολο: €12,345.67`)
- Date selector (dropdown of previous scan dates, default: latest)
- "Send Email" button for all debts

### Platform Accordion

Each platform is a collapsible accordion item using shadcn `Accordion`.

**Collapsed row (summary):**

| Platform | Last Scanned | Subtotal | Files | Actions |
|----------|-------------|----------|-------|---------|
| ΑΑΔΕ | 02/03/2026 | €8,200.00 | 📎 3 | ✉ 📄 |

- Platform name + icon
- Last scan date (el-GR format)
- Platform subtotal (sum of debts for this platform)
- File count badge
- Quick actions: send email (per-platform), view all files

**Expanded row — debt line items:**

| Category | Description | Amount | RF Code | Files |
|----------|------------|--------|---------|-------|
| ΦΠΑ | ΦΠΑ Α' Τρ. 2026 | €5,000.00 | RF12345 | 1 📄 |
| Φ. Εισοδ. | Εκκαθ. 2025 | €3,200.00 | RF45678 | 2 📄 |

- Category translated via existing `scans.categories.*` keys
- Description from Debt model
- Amount formatted as EUR
- RF code (if available, else `—`)
- File count icon — clicking opens a popover listing files with download links

### Empty State

When client has no scan data: "Δεν υπάρχουν δεδομένα σάρωσης. Εκτελέστε μια σάρωση πρώτα."

### History Toggle

Date selector dropdown lists all completed scan dates for the client. Selecting a different date re-fetches debts for that scan.

## Data Model Changes

### New Model: `DebtFile`

```prisma
model DebtFile {
  id        String   @id @default(cuid())
  debtId    String   @map("debt_id")
  debt      Debt     @relation(fields: [debtId], references: [id], onDelete: Cascade)
  fileName  String   @map("file_name")
  fileUrl   String   @map("file_url")
  fileType  String   @default("application/pdf") @map("file_type")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("debt_files")
}
```

### Debt Model Updates

```prisma
model Debt {
  // ... existing fields ...
  rfCode      String?    @map("rf_code")
  wireCode    String?    @map("wire_code")
  // Remove: documentUrl
  files       DebtFile[]
}
```

### Migration: `documentUrl` → `DebtFile`

Migrate existing `documentUrl` values to `DebtFile` rows, then drop the column.

## API / Server Actions

### `getClientDebtSummary(clientId: string, scanId?: string)`

Returns debts grouped by platform for a specific scan (default: latest completed).

```ts
type PlatformDebtGroup = {
  platform: Platform;
  lastScannedAt: string | null;
  subtotal: number;
  debts: Array<{
    id: string;
    category: DebtCategory;
    description: string | null;
    amount: number;
    rfCode: string | null;
    wireCode: string | null;
    files: Array<{ id: string; fileName: string; fileUrl: string; fileType: string }>;
  }>;
};

type ClientDebtSummaryResponse = {
  total: number;
  scanDate: string;
  groups: PlatformDebtGroup[];
};
```

### `getClientScanDates(clientId: string)`

Returns list of completed scan dates for the date picker.

```ts
type ScanDateOption = { scanId: string; date: string; totalDebts: number };
```

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ClientDebtSummary` | `components/admin/debts/client-debt-summary.tsx` | Main card wrapper with total + date picker |
| `PlatformAccordionItem` | Inside `ClientDebtSummary` | One accordion row per platform |
| `DebtLineItem` | Inside `PlatformAccordionItem` | One row per debt in expanded state |
| `FilePopover` | `components/admin/debts/file-popover.tsx` | Popover listing files with download links |

## Translation Keys (new)

Under `Admin.debts`:

- `clientDebts` — "Οφειλές Πελάτη" / "Client Debts"
- `totalSum` — "Σύνολο" / "Total"
- `subtotal` — "Υποσύνολο" / "Subtotal"
- `scanDate` — "Ημ. Σάρωσης" / "Scan Date"
- `rfCode` — "Κωδικός RF" / "RF Code"
- `wireCode` — "Κωδικός Εμβάσματος" / "Wire Code"
- `files` — "Αρχεία" / "Files"
- `viewFiles` — "Προβολή Αρχείων" / "View Files"
- `download` — "Λήψη" / "Download"
- `noScanData` — "Δεν υπάρχουν δεδομένα σάρωσης" / "No scan data"
- `runScanFirst` — "Εκτελέστε μια σάρωση πρώτα" / "Run a scan first"
- `platformSubtotal` — "Υποσύνολο πλατφόρμας" / "Platform subtotal"
