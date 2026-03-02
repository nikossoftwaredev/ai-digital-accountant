# Client Wizard, Search Bar & Email History — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a TaxisNet auto-fetch wizard for adding clients, replace the combobox with a full-page search bar, and show per-client email history on the debts page.

**Architecture:** Three independent features sharing the same client data layer. The wizard adds a new BullMQ job type (`CLIENT_LOOKUP`) processed by a new bot worker, with API routes for job submission + polling. The search bar is a reusable UI component replacing the combobox. Email history is a read-only UI component querying existing EmailLog records.

**Tech Stack:** Next.js App Router, React Server Components, shadcn/ui, BullMQ, Playwright, Prisma

**Design doc:** `docs/plans/2026-03-02-client-wizard-search-emails-design.md`

---

## Task 1: Reusable Client Search Bar Component

Replace the combobox on the debts page with a prominent, full-page search bar. This is the smallest task and unblocks better UX everywhere.

**Files:**
- Create: `apps/web/components/admin/shared/client-search-bar.tsx`
- Modify: `apps/web/components/admin/debts/debts-page-client.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/el.json`

### Step 1: Create the ClientSearchBar component

Create `apps/web/components/admin/shared/client-search-bar.tsx`:

```tsx
"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/general/utils";
import type { ClientRow } from "@/server_actions/clients";

interface ClientSearchBarProps {
  clients: ClientRow[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
}

/** Get initials from a full name (first letter of first + last word) */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Deterministic color based on string hash */
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(amount);

export const ClientSearchBar = ({ clients, selectedClientId, onSelect }: ClientSearchBarProps) => {
  const t = useTranslations("Admin.debts");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.afm.includes(q)
    );
  }, [clients, query]);

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  // When selected and not focused, show selected client inline
  if (selectedClient && !open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", getAvatarColor(selectedClient.name))}>
          {getInitials(selectedClient.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{selectedClient.name}</div>
          <div className="text-sm text-muted-foreground">{selectedClient.afm}</div>
        </div>
        {Number(selectedClient.totalDebts) > 0 && (
          <span className="text-sm font-medium text-destructive">
            {formatCurrency(Number(selectedClient.totalDebts))}
          </span>
        )}
        <X className="size-4 shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onSelect(""); }} />
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t("searchClientPlaceholder")}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(client.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  client.id === selectedClientId && "bg-accent"
                )}
              >
                <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(client.name))}>
                  {getInitials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{client.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{client.afm}</span>
                </div>
                <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                  {client.status === "ACTIVE" ? t("statusActive") : client.status === "PENDING" ? t("statusPending") : t("statusError")}
                </Badge>
                {Number(client.totalDebts) > 0 && (
                  <span className="text-xs font-medium text-destructive">
                    {formatCurrency(Number(client.totalDebts))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          {t("noClientFound")}
        </div>
      )}
    </div>
  );
};
```

### Step 2: Add translation keys

In `apps/web/messages/en.json` under `"Admin.debts"`, add:
```json
"searchClientPlaceholder": "Search clients by name or AFM...",
"statusActive": "Active",
"statusPending": "Pending",
"statusError": "Error"
```

In `apps/web/messages/el.json` under `"Admin.debts"`, add:
```json
"searchClientPlaceholder": "Αναζήτηση πελατών κατά όνομα ή ΑΦΜ...",
"statusActive": "Ενεργός",
"statusPending": "Εκκρεμής",
"statusError": "Σφάλμα"
```

Note: Check if `statusActive`, `statusPending`, `statusError` already exist under `Admin.debts` — they may already be present under `Admin.clients`. If so, only add `searchClientPlaceholder`.

### Step 3: Replace the combobox in debts-page-client.tsx

In `apps/web/components/admin/debts/debts-page-client.tsx`:

1. Remove imports: `Check`, `ChevronsUpDown`, `Command*`, `Popover*`, `cn`
2. Add import: `import { ClientSearchBar } from "@/components/admin/shared/client-search-bar";`
3. Remove state: `comboboxOpen`
4. Replace the entire `{/* Client Selector */}` Card block (lines 168-220) with:
   ```tsx
   {/* Client Selector */}
   <ClientSearchBar
     clients={clients}
     selectedClientId={selectedClientId}
     onSelect={setSelectedClientId}
   />
   ```

### Step 4: Verify TypeScript compiles

Run: `pnpm --filter @repo/web tsc --noEmit`

### Step 5: Screenshot and verify the search bar looks correct

Run: `node screenshot.mjs http://localhost:3000/el/admin/debts search-bar`
Read the screenshot and verify the search bar renders correctly.

### Step 6: Commit

```bash
git add apps/web/components/admin/shared/client-search-bar.tsx apps/web/components/admin/debts/debts-page-client.tsx apps/web/messages/en.json apps/web/messages/el.json
git commit -m "feat: add full-page client search bar replacing combobox"
```

---

## Task 2: Per-Client Email History on Debts Page

Show a collapsible email history section on the debts page when a client is selected.

**Files:**
- Create: `apps/web/components/admin/debts/client-email-history.tsx`
- Modify: `apps/web/server_actions/emails.ts` (add `getClientEmailLogs` function)
- Modify: `apps/web/components/admin/debts/debts-page-client.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/el.json`

### Step 1: Add server action for per-client email logs

In `apps/web/server_actions/emails.ts`, add a new exported function:

```typescript
export const getClientEmailLogs = async (clientId: string, limit = 20) => {
  const accountant = await getAccountant();
  if (!accountant) return [];

  const logs = await prisma.emailLog.findMany({
    where: { clientId, accountantId: accountant.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      status: true,
      sentAt: true,
      createdAt: true,
    },
  });

  return logs;
};
```

### Step 2: Create the ClientEmailHistory component

Create `apps/web/components/admin/debts/client-email-history.tsx`:

```tsx
"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientEmailLogs } from "@/server_actions/emails";

interface EmailLogRow {
  id: string;
  recipientEmail: string;
  subject: string;
  status: "SENT" | "FAILED" | "PENDING";
  sentAt: Date | null;
  createdAt: Date;
}

interface ClientEmailHistoryProps {
  clientId: string;
}

const statusVariant = (status: string) => {
  if (status === "SENT") return "default" as const;
  if (status === "FAILED") return "destructive" as const;
  return "secondary" as const;
};

export const ClientEmailHistory = ({ clientId }: ClientEmailHistoryProps) => {
  const t = useTranslations("Admin.debts");
  const [logs, setLogs] = useState<EmailLogRow[]>([]);

  useEffect(() => {
    if (!clientId) { setLogs([]); return; }
    let cancelled = false;
    getClientEmailLogs(clientId).then((data) => {
      if (!cancelled) setLogs(data as EmailLogRow[]);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4" />
          {t("emailsSent")}
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEmailsSent")}</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{log.subject}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString("el-GR")}
                  </span>
                </div>
                <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### Step 3: Add translation keys

In `apps/web/messages/en.json` under `"Admin.debts"`:
```json
"emailsSent": "Emails Sent",
"noEmailsSent": "No emails sent to this client yet"
```

In `apps/web/messages/el.json` under `"Admin.debts"`:
```json
"emailsSent": "Απεσταλμένα Email",
"noEmailsSent": "Δεν έχουν σταλεί email σε αυτόν τον πελάτη"
```

### Step 4: Add to debts page

In `apps/web/components/admin/debts/debts-page-client.tsx`:

1. Add import: `import { ClientEmailHistory } from "./client-email-history";`
2. After the `<ClientDebtSummary>` section (before the Scan History card), add:
   ```tsx
   {/* Client Email History */}
   {selectedClientId && <ClientEmailHistory clientId={selectedClientId} />}
   ```

### Step 5: Verify TypeScript compiles

Run: `pnpm --filter @repo/web tsc --noEmit`

### Step 6: Screenshot and verify

Run: `node screenshot.mjs http://localhost:3000/el/admin/debts email-history`

### Step 7: Commit

```bash
git add apps/web/components/admin/debts/client-email-history.tsx apps/web/server_actions/emails.ts apps/web/components/admin/debts/debts-page-client.tsx apps/web/messages/en.json apps/web/messages/el.json
git commit -m "feat: add per-client email history section on debts page"
```

---

## Task 3: Client Lookup Queue & Bot Worker

Add a new BullMQ job type for looking up client data from EFKA Registry.

**Files:**
- Modify: `packages/shared/src/queue/index.ts` (add lookup queue + types)
- Create: `apps/bot/src/workers/lookup-worker.ts`
- Modify: `apps/bot/src/index.ts` (register lookup worker)

### Step 1: Add lookup queue to shared package

In `packages/shared/src/queue/index.ts`, add:

```typescript
// ── Client Lookup Queue ──────────────────────────────────────────

export const LOOKUP_QUEUE_NAME = "lookup-jobs";

export interface LookupJobPayload {
  jobId: string;
  accountantId: string;
  taxisnetUsername: string;
  taxisnetPassword: string;
}

export interface LookupJobResult {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  afm: string;
  amka: string;
}

export const createLookupQueue = () =>
  new Queue<LookupJobPayload>(LOOKUP_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  });
```

Also add to the exports in `packages/shared/src/index.ts` if needed.

### Step 2: Create the lookup worker

Create `apps/bot/src/workers/lookup-worker.ts`:

```typescript
import { Worker, type Job } from "bullmq";
import {
  LOOKUP_QUEUE_NAME,
  getRedisConnectionOptions,
  type LookupJobPayload,
  type LookupJobResult,
} from "@repo/shared";
import { getBrowserContext, shutdownBrowser } from "../utils/browser";
import { logger } from "../utils/logger";

// ── EFKA Registry Selectors ──────────────────────────────────────

const EFKA_ENTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Account/GsisOAuth2Authenticate.aspx";
const EFKA_REGISTRY_URL =
  "https://www.idika.org.gr/EfkaServices/Application/EfkaRegistry.aspx";

const REGISTRY_SELECTORS = {
  amka: "#ContentPlaceHolder1_dAMKA",
  afm: "#ContentPlaceHolder1_dAFM",
  lastName: "#ContentPlaceHolder1_dLastName",
  firstName: "#ContentPlaceHolder1_dFirstName",
  lastNameLatin: "#ContentPlaceHolder1_dLastNameLatin",
  firstNameLatin: "#ContentPlaceHolder1_dFirstNameLatin",
} as const;

// ── Job Processor ────────────────────────────────────────────────

const processLookupJob = async (job: Job<LookupJobPayload>): Promise<LookupJobResult> => {
  const log = logger.child({ jobId: job.id, worker: "lookup" });
  const { taxisnetUsername, taxisnetPassword } = job.data;

  log.info("Starting client lookup via EFKA Registry");

  const context = await getBrowserContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to EFKA entry
    await page.goto(EFKA_ENTRY_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Dismiss cookie banner
    try {
      await page.locator("text=ΚΛΕΙΣΙΜΟ").click({ timeout: 3_000 });
    } catch { /* no banner */ }

    // Step 2: Click ΣΥΝΕΧΕΙΑ ΣΤΟ TAXISNET
    await page.locator("#ContentPlaceHolder1_btnGGPSAuth").click();

    // Step 3: Fill TaxisNet credentials
    const usernameField = page.getByRole("textbox", { name: "Χρήστης:" });
    await usernameField.waitFor({ state: "visible", timeout: 15_000 });
    await usernameField.fill(taxisnetUsername);
    await page.getByRole("textbox", { name: "Κωδικός:" }).fill(taxisnetPassword);
    await page.getByRole("button", { name: "Σύνδεση" }).click();
    log.info("TaxisNet credentials submitted");

    // Step 4: OAuth consent
    const consentBtn = page.getByRole("button", { name: "Αποστολή" });
    await consentBtn.waitFor({ state: "visible", timeout: 15_000 });
    await consentBtn.click();
    log.info("OAuth consent granted");

    // Step 5: AMKA page — we need to handle this
    // After OAuth, EFKA may ask for AMKA. If so, we need to navigate to Registry differently.
    // Wait for the page to settle and check if we land on AMKA input or the dashboard
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    // Try navigating directly to Registry (user may already be authenticated)
    await page.goto(EFKA_REGISTRY_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);
    log.info("Navigated to EFKA Registry");

    // Step 6: Extract data from Registry page
    const getValue = async (selector: string): Promise<string> => {
      const el = await page.$(selector);
      if (!el) return "";
      const value = await el.getAttribute("value");
      return value?.trim() ?? "";
    };

    const result: LookupJobResult = {
      amka: await getValue(REGISTRY_SELECTORS.amka),
      afm: await getValue(REGISTRY_SELECTORS.afm),
      lastName: await getValue(REGISTRY_SELECTORS.lastName),
      firstName: await getValue(REGISTRY_SELECTORS.firstName),
      lastNameLatin: await getValue(REGISTRY_SELECTORS.lastNameLatin),
      firstNameLatin: await getValue(REGISTRY_SELECTORS.firstNameLatin),
    };

    log.info({ result }, "Client data extracted from EFKA Registry");

    // Validate that we got meaningful data
    if (!result.afm && !result.amka) {
      throw new Error("No data found on EFKA Registry — login may have failed or AMKA step required");
    }

    return result;
  } finally {
    await page.close().catch(() => {});
  }
};

// ── Worker ───────────────────────────────────────────────────────

export const startLookupWorker = () => {
  const worker = new Worker<LookupJobPayload, LookupJobResult>(
    LOOKUP_QUEUE_NAME,
    processLookupJob,
    {
      connection: getRedisConnectionOptions(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "Lookup job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Lookup job failed");
  });

  logger.info("Lookup worker started");
  return worker;
};
```

### Step 3: Register lookup worker in bot index.ts

In `apps/bot/src/index.ts`, add:

```typescript
import { startLookupWorker } from "./workers/lookup-worker";

// After the scan worker:
const lookupWorker = startLookupWorker();

// Update shutdown:
const shutdown = async () => {
  logger.info("Shutting down...");
  await worker.close();
  await lookupWorker.close();
  await shutdownBrowser();
  process.exit(0);
};
```

### Step 4: Verify TypeScript compiles

Run: `pnpm --filter @repo/bot tsc --noEmit` and `pnpm --filter @repo/shared tsc --noEmit`

### Step 5: Commit

```bash
git add packages/shared/src/queue/index.ts apps/bot/src/workers/lookup-worker.ts apps/bot/src/index.ts
git commit -m "feat: add client lookup worker for EFKA Registry scraping"
```

---

## Task 4: Client Lookup API Routes

Add API routes for submitting and polling client lookups.

**Files:**
- Create: `apps/web/app/api/clients/lookup/route.ts`
- Create: `apps/web/app/api/clients/lookup/[jobId]/status/route.ts`

### Step 1: Create the lookup submission route

Create `apps/web/app/api/clients/lookup/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createLookupQueue } from "@repo/shared";
import { authOptions } from "@/lib/auth/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { taxisnetUsername, taxisnetPassword } = body;

  if (!taxisnetUsername || !taxisnetPassword) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const jobId = uuidv4();
  const queue = createLookupQueue();

  await queue.add("lookup", {
    jobId,
    accountantId: session.user.id,
    taxisnetUsername,
    taxisnetPassword,
  });

  await queue.close();

  return NextResponse.json({ jobId });
}
```

Note: Check if `uuid` is already a dependency. If not, use `crypto.randomUUID()` instead.

### Step 2: Create the lookup status polling route

Create `apps/web/app/api/clients/lookup/[jobId]/status/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { LOOKUP_QUEUE_NAME, getRedisConnectionOptions, type LookupJobResult } from "@repo/shared";
import { authOptions } from "@/lib/auth/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const queue = new Queue(LOOKUP_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });

  // Find the job — BullMQ uses its own ID, but we passed jobId in payload
  // We need to find it by iterating or by using the jobId as the BullMQ job ID
  const jobs = await queue.getJobs(["waiting", "active", "completed", "failed"]);
  const job = jobs.find((j) => j.data?.jobId === jobId);
  await queue.close();

  if (!job) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  // Verify ownership
  if (job.data.accountantId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const state = await job.getState();

  if (state === "completed") {
    const result = job.returnvalue as LookupJobResult;
    return NextResponse.json({ status: "completed", data: result });
  }

  if (state === "failed") {
    return NextResponse.json({ status: "failed", error: job.failedReason ?? "Unknown error" });
  }

  return NextResponse.json({ status: "pending" });
}
```

**Important:** A better approach is to use `jobId` as the BullMQ job ID directly. Update the POST route to:
```typescript
await queue.add("lookup", payload, { jobId });
```
Then in the status route, use `queue.getJob(jobId)` instead of searching all jobs.

### Step 3: Verify TypeScript compiles

Run: `pnpm --filter @repo/web tsc --noEmit`

### Step 4: Commit

```bash
git add apps/web/app/api/clients/lookup/route.ts apps/web/app/api/clients/lookup/[jobId]/status/route.ts
git commit -m "feat: add client lookup API routes for job submission and polling"
```

---

## Task 5: Client Wizard Dialog (Frontend)

Replace the single-step "add" dialog with a 2-step wizard.

**Files:**
- Create: `apps/web/components/admin/clients/client-wizard-dialog.tsx`
- Modify: `apps/web/components/admin/clients/clients-page-client.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/el.json`

### Step 1: Add translation keys

In `apps/web/messages/en.json` under `"Admin.clients"`:
```json
"wizardTitle": "Add New Client",
"stepCredentials": "TaxisNet Credentials",
"stepCredentialsDesc": "Enter the client's TaxisNet credentials to automatically fetch their data.",
"lookup": "Lookup",
"lookingUp": "Looking up client data...",
"lookupSuccess": "Client data found!",
"lookupFailed": "Could not fetch client data. Please fill in the fields manually.",
"stepReview": "Review & Save",
"stepReviewDesc": "Review the data found and add any additional information.",
"firstName": "First Name",
"lastName": "Last Name",
"autoFetched": "Auto-fetched from EFKA"
```

In `apps/web/messages/el.json` under `"Admin.clients"`:
```json
"wizardTitle": "Προσθήκη Νέου Πελάτη",
"stepCredentials": "Στοιχεία TaxisNet",
"stepCredentialsDesc": "Εισάγετε τα στοιχεία TaxisNet του πελάτη για αυτόματη ανάκτηση δεδομένων.",
"lookup": "Αναζήτηση",
"lookingUp": "Αναζήτηση δεδομένων πελάτη...",
"lookupSuccess": "Βρέθηκαν δεδομένα πελάτη!",
"lookupFailed": "Δεν ήταν δυνατή η ανάκτηση δεδομένων. Συμπληρώστε τα πεδία χειροκίνητα.",
"stepReview": "Επισκόπηση & Αποθήκευση",
"stepReviewDesc": "Ελέγξτε τα δεδομένα που βρέθηκαν και προσθέστε πρόσθετες πληροφορίες.",
"firstName": "Όνομα",
"lastName": "Επώνυμο",
"autoFetched": "Αυτόματη ανάκτηση από ΕΦΚΑ"
```

### Step 2: Create the wizard dialog component

Create `apps/web/components/admin/clients/client-wizard-dialog.tsx`:

This is a larger component. Key structure:

```tsx
"use client";

// imports: useState, useCallback, useTranslations, useForm, zod, shadcn components

// Two steps: CREDENTIALS and REVIEW
type WizardStep = "credentials" | "review";

interface LookupResult { firstName, lastName, firstNameLatin, lastNameLatin, afm, amka }

export const ClientWizardDialog = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState<WizardStep>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // Form for step 2 (same schema as ClientFormDialog)
  const form = useForm<ClientFormValues>(...);

  const handleLookup = async () => {
    setLookupStatus("loading");
    // POST /api/clients/lookup with { taxisnetUsername: username, taxisnetPassword: password }
    // Poll GET /api/clients/lookup/[jobId]/status every 2 seconds
    // On success: populate form, setStep("review"), setLookupStatus("success")
    // On failure: setLookupStatus("failed"), allow manual entry
  };

  const handleSubmit = async (values) => {
    // Same as ClientFormDialog create logic
    const result = await createClient({
      ...values,
      taxisnetUsername: username,
      taxisnetPassword: password,
    });
    if (result.success) onSuccess();
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("credentials");
      setUsername(""); setPassword("");
      setLookupStatus("idle"); setLookupData(null);
      setManualMode(false);
      form.reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        {step === "credentials" && (
          // Step 1: Username + Password inputs, Lookup button, loading spinner
          // "Skip" link to go to manual mode (setManualMode(true), setStep("review"))
        )}
        {step === "review" && (
          // Step 2: Form pre-filled with lookup data
          // Read-only fields for auto-fetched data (with "Auto-fetched" badge)
          // Editable fields for email, phone, notes
          // If manualMode, all fields editable
          // Back button to go to step 1
          // Save button
        )}
      </DialogContent>
    </Dialog>
  );
};
```

The full implementation should follow the same patterns as `ClientFormDialog` — same form schema, same `createClient` server action, same discard confirmation for dirty forms.

### Step 3: Update clients-page-client.tsx

In `apps/web/components/admin/clients/clients-page-client.tsx`:

1. Replace `ClientFormDialog` import with `ClientWizardDialog` for the add button
2. Keep `ClientFormDialog` for edit mode (used in `ClientsTable`)

```tsx
import { ClientWizardDialog } from "./client-wizard-dialog";

// Replace:
<ClientFormDialog mode="add" ... />

// With:
<ClientWizardDialog
  open={addDialogOpen}
  onOpenChange={setAddDialogOpen}
  onSuccess={() => {
    setAddDialogOpen(false);
    router.refresh();
  }}
/>
```

### Step 4: Verify TypeScript compiles

Run: `pnpm --filter @repo/web tsc --noEmit`

### Step 5: Screenshot and verify wizard

1. Screenshot step 1 (credentials): `node screenshot.mjs http://localhost:3000/el/admin/clients wizard-step1`
2. Manually test the full flow with a real TaxisNet account

### Step 6: Commit

```bash
git add apps/web/components/admin/clients/client-wizard-dialog.tsx apps/web/components/admin/clients/clients-page-client.tsx apps/web/messages/en.json apps/web/messages/el.json
git commit -m "feat: add client wizard with TaxisNet auto-fetch"
```

---

## Task 6: Final Integration & Polish

**Files:**
- Verify all features work together
- Clean up any unused imports from the combobox removal

### Step 1: Verify debts page with all new features

1. Start dev server: `pnpm dev`
2. Navigate to debts page
3. Test: search bar filters, selects, shows selected client
4. Test: email history shows after selecting a client
5. Screenshot: `node screenshot.mjs http://localhost:3000/el/admin/debts final-debts`

### Step 2: Verify client wizard

1. Navigate to clients page
2. Click "Add Client"
3. Test: wizard opens with credentials step
4. Test: manual skip works (shows empty form)
5. Screenshot: `node screenshot.mjs http://localhost:3000/el/admin/clients final-clients`

### Step 3: Run lint and type check

```bash
pnpm lint
pnpm --filter @repo/web tsc --noEmit
pnpm --filter @repo/bot tsc --noEmit
```

### Step 4: Final commit if any fixes needed

```bash
git add -A
git commit -m "fix: polish client wizard, search bar, and email history"
```

---

## Implementation Order Summary

| # | Task | Scope | Depends On |
|---|------|-------|------------|
| 1 | Client Search Bar | Frontend only | — |
| 2 | Email History | Frontend + server action | — |
| 3 | Lookup Worker | Bot + shared | — |
| 4 | Lookup API Routes | Web API | Task 3 |
| 5 | Client Wizard Dialog | Frontend | Task 4 |
| 6 | Integration & Polish | All | Tasks 1-5 |

Tasks 1, 2, and 3 are fully independent and can be done in parallel.
