# hexAIgon Debt Checker MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP debt-checking app for Greek accountants — manage clients, scan government platforms for debts via Playwright, send email notifications.

**Architecture:** Monorepo with `apps/web` (Next.js admin panel), `apps/bot` (Playwright scraper), and `packages/shared` (Prisma schema, encryption, queue types). Auth via NextAuth Credentials Provider + TOTP 2FA. TaxisNet credentials encrypted with AES-256-GCM.

**Tech Stack:** Next.js 16, NextAuth 4, Prisma/PostgreSQL, Playwright, BullMQ/Redis, Nodemailer, React Email, shadcn/ui, Tailwind 4

---

# PHASE A: Foundation & Client Management

**Goal:** Accountant can log in, manage clients (CRUD), see a dashboard.
**Test:** Log in → add clients with TaxisNet credentials → edit/delete → see them on dashboard.

---

### Task A.0: Delete Template Code

**Files:**
- Delete: `server_actions/todos.ts`
- Delete: `types/todos.ts`
- Delete: `components/examples/` (entire directory)
- Delete: `app/[locale]/admin/users/page.tsx`
- Delete: `app/[locale]/admin/expenses/page.tsx`
- Modify: `app/[locale]/page.tsx` (replace with redirect)
- Modify: `app/[locale]/admin/page.tsx` (change redirect target)
- Modify: `messages/en.json` (remove template sections)
- Modify: `messages/el.json` (remove template sections)

**Step 1: Delete template files and directories**

```bash
rm -rf components/examples/
rm server_actions/todos.ts
rm types/todos.ts
rm app/\[locale\]/admin/users/page.tsx
rm app/\[locale\]/admin/expenses/page.tsx
```

**Step 2: Replace landing page with redirect**

Replace `app/[locale]/page.tsx` content with a redirect to `/admin/dashboard`.

**Step 3: Update admin page redirect**

In `app/[locale]/admin/page.tsx`, change redirect from `/admin/users` to `/admin/dashboard`.

**Step 4: Clean translation files**

Remove `HomePage`, `TodoDemo`, and other template sections from `messages/en.json` and `messages/el.json`. Keep the file structure and `Admin` namespace.

**Step 5: Verify app still compiles**

```bash
pnpm tsc --noEmit && pnpm lint
```

**Step 6: Commit**

```bash
git add -A && git commit -m "chore: remove template code (todos, examples, demo pages)"
```

---

### Task A.1: Monorepo Restructuring

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: root `package.json` (workspace orchestrator)
- Create: `tsconfig.base.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/db/client.ts`
- Create: `apps/bot/package.json`
- Create: `apps/bot/tsconfig.json`
- Move: all existing app files → `apps/web/`
- Move: `lib/db/schema.prisma` → `packages/shared/prisma/schema.prisma`
- Move: `lib/db/migrations/` → `packages/shared/prisma/migrations/`
- Delete: `apps/web/lib/db/` (after moving)

**Step 1: Create directory structure**

```bash
mkdir -p apps/web apps/bot/src packages/shared/src/db packages/shared/prisma
```

**Step 2: Move existing files to apps/web/**

Move all project files (app/, components/, hooks/, lib/, messages/, server_actions/, types/, proxy.ts, next.config.ts, components.json, eslint.config.mjs, postcss.config.mjs, global.d.ts, .env.local, public/) into `apps/web/`.

**Step 3: Move Prisma to packages/shared/**

Move `apps/web/lib/db/schema.prisma` → `packages/shared/prisma/schema.prisma`
Move `apps/web/lib/db/migrations/` → `packages/shared/prisma/migrations/`
Move `apps/web/lib/db/index.ts` → `packages/shared/src/db/client.ts`
Delete `apps/web/lib/db/`

**Step 4: Create root package.json**

```json
{
  "name": "ai-digital-accountant-monorepo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @repo/web dev",
    "build": "pnpm --filter @repo/web build",
    "lint": "pnpm --filter '*' lint",
    "db:generate": "pnpm --filter @repo/shared db:generate",
    "db:migrate": "pnpm --filter @repo/shared db:migrate",
    "db:push": "pnpm --filter @repo/shared db:push"
  }
}
```

**Step 5: Update pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 6: Create tsconfig.base.json**

Shared TypeScript config that all packages extend.

**Step 7: Create packages/shared/package.json**

```json
{
  "name": "@repo/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate --schema=./prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=./prisma/schema.prisma",
    "db:push": "prisma db push --schema=./prisma/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5"
  }
}
```

**Step 8: Create apps/web/package.json**

Move all dependencies from the old root package.json. Add `"@repo/shared": "workspace:*"`.

**Step 9: Create apps/web/tsconfig.json**

Extends `../../tsconfig.base.json`, keeps `@/*` path alias.

**Step 10: Create apps/bot/ skeleton**

Minimal package.json for `@repo/bot` with `tsx` dev dependency.

**Step 11: Create packages/shared/src/index.ts barrel export**

```typescript
export { prisma } from "./db/client"
```

**Step 12: Update imports in apps/web**

Replace `import { prisma } from "@/lib/db"` with `import { prisma } from "@repo/shared"` in all files.

**Step 13: Run pnpm install and verify**

```bash
pnpm install && pnpm dev
```

**Step 14: Commit**

```bash
git add -A && git commit -m "refactor: restructure into monorepo (apps/web, apps/bot, packages/shared)"
```

---

### Task A.2: Database Schema

**Files:**
- Modify: `packages/shared/prisma/schema.prisma`
- Create: new migration

**Step 1: Write the full Prisma schema**

Replace User+Todo with: Accountant, Client, Scan, Debt, EmailLog, AuditLog models and all enums (ScanFrequency, ClientStatus, ScanStatus, ErrorType, DebtCategory, Platform, Priority, EmailStatus, AuditAction).

Key design decisions:
- Accountant replaces User (single user type)
- Client has `@@unique([accountantId, afm])` — AFM unique per accountant
- SMTP stored as encrypted JSON blob in `smtpConfig` column
- TaxisNet credentials in separate encrypted columns + `encryptionIV`
- Scan has `platformStatuses` as JSON for per-platform status
- All Decimal fields use `@db.Decimal(12, 2)`
- All tables use `@@map("snake_case_table_name")`

**Step 2: Run migration**

```bash
pnpm db:migrate
```

**Step 3: Regenerate Prisma client**

```bash
pnpm db:generate
```

**Step 4: Update shared types barrel export**

Re-export all Prisma types from `packages/shared/src/types/index.ts`.

**Step 5: Update auth.ts to use Accountant model**

Change `prisma.user.upsert` → `prisma.accountant.upsert` in `apps/web/lib/auth/auth.ts`.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add domain schema (Accountant, Client, Scan, Debt, EmailLog, AuditLog)"
```

---

### Task A.3: Encryption Layer

**Files:**
- Create: `packages/shared/src/encryption/index.ts`
- Modify: `packages/shared/src/index.ts` (add export)

**Step 1: Implement AES-256-GCM encrypt/decrypt**

```typescript
// packages/shared/src/encryption/index.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

export interface EncryptedPayload {
  ciphertext: string  // hex
  iv: string          // hex (12 bytes)
  tag: string         // hex (16 bytes auth tag)
}

export const encrypt = (plaintext: string): EncryptedPayload => { /* ... */ }
export const decrypt = (payload: EncryptedPayload): string => { /* ... */ }
```

- Master key from `ENCRYPTION_MASTER_KEY` env var (64 hex chars = 32 bytes)
- Fresh random 12-byte IV per encrypt call
- Validates key length on use

**Step 2: Add ENCRYPTION_MASTER_KEY to .env.template**

**Step 3: Export from barrel**

Add `export { encrypt, decrypt } from "./encryption"` to `packages/shared/src/index.ts`.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add AES-256-GCM encryption layer for credential storage"
```

---

### Task A.4: i18n Simplification

**Files:**
- Modify: `apps/web/lib/i18n/routing.ts`
- Modify: `apps/web/messages/el.json`
- Modify: `apps/web/messages/en.json`

**Step 1: Set Greek-only prefix-less routing**

```typescript
// routing.ts
locales: ["el"],
defaultLocale: "el",
localePrefix: "never"
```

**Step 2: Add full Greek translation keys**

Add all `Admin.*` translation keys to `el.json`:
- `Admin.nav.*` (dashboard, clients, scans, emails, settings)
- `Admin.dashboard.*` (stat labels, section titles)
- `Admin.clients.*` (form labels, statuses, actions, validation messages)
- `Admin.scans.*` (progress labels, platform names)
- `Admin.emails.*` (template editor, history)
- `Admin.settings.*` (SMTP, profile, 2FA)

**Step 3: Mirror in en.json (developer fallback)**

**Step 4: Verify**

```bash
pnpm tsc --noEmit
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: simplify i18n to Greek-only with prefix-less routing"
```

---

### Task A.5: Authentication

**Files:**
- Modify: `apps/web/lib/auth/auth.ts`
- Create: `apps/web/lib/auth/rate-limit.ts`
- Create: `apps/web/lib/auth/totp.ts`
- Create: `apps/web/lib/auth/audit.ts`
- Create: `apps/web/app/[locale]/login/page.tsx`
- Create: `apps/web/components/auth/login-form.tsx`
- Modify: `apps/web/types/next-auth.d.ts`

**Step 1: Install auth dependencies**

```bash
cd apps/web && pnpm add bcryptjs otpauth qrcode && pnpm add -D @types/bcryptjs @types/qrcode
```

**Step 2: Create rate-limit module**

`lib/auth/rate-limit.ts`:
- `checkRateLimit(accountant)` — returns false if locked
- `incrementFailedAttempts(accountantId)` — locks after 5 failures for 15 min
- `resetFailedAttempts(accountantId)` — clears on success

**Step 3: Create audit module**

`lib/auth/audit.ts`:
- `logAuditEvent({ accountantId?, action, ipAddress?, userAgent?, metadata? })`

**Step 4: Create TOTP module**

`lib/auth/totp.ts`:
- `generateTotpSecret(email)` — returns TOTP + QR URI
- `verifyTotp(accountant, code)` — verifies 6-digit code or backup code
- `generateBackupCodes()` — returns 8 random codes (plain + hashed)

**Step 5: Replace auth.ts with Credentials Provider**

Remove Google OAuth. Add CredentialsProvider with flow:
1. Validate email + password
2. Check rate limit
3. Verify bcrypt hash
4. If 2FA enabled and no TOTP code → throw "TotpRequired"
5. If TOTP code provided → verify
6. Reset failed attempts, log audit event
7. Return user object with id, email, name, role

Session config: JWT strategy, 15-minute maxAge.

**Step 6: Update next-auth type declaration**

Add `role` to Session user type.

**Step 7: Create login page**

`app/[locale]/login/page.tsx` — Server Component, redirects if already authenticated.

**Step 8: Create login form component**

`components/auth/login-form.tsx` — Client Component:
- Step 1: Email + Password → signIn("credentials")
- Step 2 (if TotpRequired): 6-digit TOTP input
- Error messages in Greek

**Step 9: Create register API route (admin-only)**

`app/api/auth/register/route.ts` — POST, validates admin session, creates accountant with bcrypt(12) hash.

**Step 10: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
```

**Step 11: Commit**

```bash
git add -A && git commit -m "feat: add email+password auth with 2FA, rate limiting, and audit logging"
```

---

### Task A.6: Admin Shell & Navigation

**Files:**
- Modify: `apps/web/lib/admin/config.ts`
- Modify: `apps/web/components/admin/admin-sidebar.tsx`
- Create: `apps/web/components/admin/shared/page-header.tsx`
- Create: `apps/web/components/admin/shared/stat-card.tsx`
- Create: `apps/web/components/admin/shared/status-badge.tsx`
- Create: `apps/web/components/admin/shared/currency-cell.tsx`
- Create: `apps/web/components/admin/shared/confirm-dialog.tsx`

**Step 1: Install new shadcn components**

```bash
cd apps/web && npx shadcn@latest add dialog alert-dialog form select tabs progress popover
```

**Step 2: Update nav config**

Replace `lib/admin/config.ts` with Greek nav items:
- Πίνακας Ελέγχου (LayoutDashboard) → `/admin/dashboard`
- Πελάτες (Users) → `/admin/clients`
- Σαρώσεις (ScanLine) → `/admin/scans`
- Emails (Mail) → `/admin/emails`
- Ρυθμίσεις (Settings) → `/admin/settings`

Use translation keys (e.g., `Admin.nav.dashboard`).

**Step 3: Update sidebar component**

Use `useTranslations()` to render translated nav labels.

**Step 4: Create shared admin components**

- `page-header.tsx` — title + description + action slot
- `stat-card.tsx` — Card with label + large value
- `status-badge.tsx` — ClientStatus → colored Badge
- `currency-cell.tsx` — Greek Euro format (`1.234,56 €`)
- `confirm-dialog.tsx` — reusable AlertDialog with loading state

**Step 5: Verify**

```bash
pnpm tsc --noEmit && pnpm dev
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: update admin shell with Greek navigation and shared components"
```

---

### Task A.7: Client Management Screen

**Files:**
- Create: `apps/web/server_actions/clients.ts`
- Create: `apps/web/app/[locale]/admin/clients/page.tsx`
- Create: `apps/web/components/admin/clients/clients-table.tsx`
- Create: `apps/web/components/admin/clients/client-form-dialog.tsx`
- Create: `apps/web/components/admin/clients/client-row-actions.tsx`
- Create: `apps/web/components/admin/clients/delete-client-dialog.tsx`

**Step 1: Create client server actions**

`server_actions/clients.ts`:
- `getClients()` — returns ClientRow[] for the authenticated accountant
- `createClient(data)` — validates AFM (9 digits), encrypts TaxisNet credentials, creates record
- `updateClient(id, data)` — if password empty, keeps existing; if provided, re-encrypts
- `deleteClient(id)` — with revalidatePath
- `getClient(id)` — for edit form (never returns plaintext password)

**Step 2: Create clients page**

Server Component that fetches clients and renders table.

**Step 3: Create clients table component**

Client Component with:
- Columns: Name, AFM, Email, Status (badge), Last Scan, Total Debts, Actions
- Search/filter state
- Row selection checkboxes

**Step 4: Create client form dialog**

Client Component with react-hook-form + zod:
- AFM: `z.string().regex(/^\d{9}$/)`
- Email: `z.string().email()`
- TaxisNet Username: required for create
- TaxisNet Password: required for create, optional for edit
- All labels in Greek via translations

**Step 5: Create row actions dropdown**

DropdownMenu: Επεξεργασία, Σάρωση (disabled for now), Ιστορικό (disabled), Αποστολή Email (disabled), Διαγραφή.

**Step 6: Create delete confirmation dialog**

AlertDialog with Greek text, calls deleteClient action.

**Step 7: Verify**

```bash
pnpm tsc --noEmit && pnpm dev
```

Test: Add a client → see it in table → edit → delete.

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: add client management screen with CRUD and encrypted credentials"
```

---

### Task A.8: Dashboard Screen

**Files:**
- Create: `apps/web/app/[locale]/admin/dashboard/page.tsx`
- Create: `apps/web/components/admin/dashboard/stats-grid.tsx`
- Create: `apps/web/components/admin/dashboard/recent-debts-table.tsx`
- Create: `apps/web/components/admin/dashboard/quick-actions.tsx`
- Modify: `apps/web/server_actions/clients.ts` (add getDashboardStats)

**Step 1: Add dashboard server actions**

- `getDashboardStats()` — total debts sum, active client count, error count, last scan date
- `getRecentDebts()` — last 10 debt records with client name

**Step 2: Create dashboard page**

Server Component that fetches stats and recent debts in parallel.

**Step 3: Create stats grid**

4 stat cards in a responsive grid (md:grid-cols-4).

**Step 4: Create recent debts table**

Table showing client name, debt type, amount. Empty state when no debts yet.

**Step 5: Create quick actions**

3 buttons: Προσθήκη Πελάτη (links to clients), Μαζική Σάρωση (disabled), Αποστολή Emails (disabled).

**Step 6: Verify**

```bash
pnpm tsc --noEmit && pnpm dev
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add dashboard with stats, recent debts, and quick actions"
```

---

### Task A.9: Settings Screen

**Files:**
- Create: `apps/web/server_actions/settings.ts`
- Modify: `apps/web/app/[locale]/admin/settings/page.tsx`
- Create: `apps/web/components/admin/settings/smtp-settings-form.tsx`
- Create: `apps/web/components/admin/settings/scan-frequency-form.tsx`
- Create: `apps/web/components/admin/settings/profile-form.tsx`

**Step 1: Create settings server actions**

- `getSettings(accountantId)` — returns settings (SMTP password as empty string)
- `saveSmtpSettings(data)` — encrypts SMTP password, saves
- `saveScanSettings(data)` — frequency + auto-notify
- `saveProfileSettings(data)` — office info, password change

**Step 2: Replace existing settings page**

Tabs component: SMTP | Σαρώσεις | Προφίλ

**Step 3: Create SMTP settings form**

Host, port, username, password fields. "Δοκιμή Σύνδεσης" test button (optional for now).

**Step 4: Create scan frequency form**

Select dropdown (Χειροκίνητα / Εβδομαδιαία / Μηνιαία) + auto-notify Switch.

**Step 5: Create profile form**

Office info fields + password change section + 2FA setup (QR code display).

**Step 6: Verify**

```bash
pnpm tsc --noEmit && pnpm dev
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add settings screen (SMTP, scan frequency, profile)"
```

---

### Task A.10: Final Cleanup & CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.env.template`

**Step 1: Update CLAUDE.md**

Update project structure, commands, and architecture sections to reflect monorepo.

**Step 2: Update .env.template**

Add `ENCRYPTION_MASTER_KEY`. Remove `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

**Step 3: Full verification**

```bash
pnpm install && pnpm build && pnpm tsc --noEmit && pnpm lint
```

**Step 4: Commit**

```bash
git add -A && git commit -m "docs: update CLAUDE.md and env template for monorepo structure"
```

---

### Phase A Test Plan

1. `pnpm install && pnpm dev` — app starts at localhost:3000
2. Create seed accountant via prisma studio or register API
3. Log in with email+password at `/login`
4. Navigate to `/admin/clients` → add 2-3 test clients with dummy TaxisNet credentials
5. Verify credentials are encrypted in DB (check via prisma studio — should see hex ciphertext)
6. Edit a client, delete a client, verify revalidation
7. See stats on dashboard (totals, client count)
8. Configure SMTP in settings
9. Set up 2FA, log out, log in with TOTP code
10. `pnpm build` — no TypeScript errors

---

# PHASE B: Bot Service & AADE Scanning

**Goal:** Trigger a scan, Playwright bot logs into TaxisNet, extracts debts.
**Test:** Click "Scan" on a client → see live progress → see debt results.

---

### Task B.1: Queue Infrastructure

**Files:**
- Create: `packages/shared/src/queue/index.ts`
- Create: `packages/shared/src/queue/types.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`

**Step 1: Install queue dependencies**

```bash
cd packages/shared && pnpm add bullmq ioredis
```

**Step 2: Create queue types**

```typescript
export interface ScanJobPayload {
  scanId: string
  clientId: string
  accountantId: string
  platforms: Array<"aade" | "efka">
}
export const SCAN_QUEUE_NAME = "scan-jobs"
```

**Step 3: Create queue factory**

```typescript
export const createRedisConnection = () => new IORedis(process.env.REDIS_URL!)
export const createScanQueue = () => new Queue<ScanJobPayload>(SCAN_QUEUE_NAME, { ... })
```

**Step 4: Export from barrel**

**Step 5: Add REDIS_URL to .env.template**

**Step 6: Commit**

---

### Task B.2: Bot Service Setup

**Files:**
- Modify: `apps/bot/package.json`
- Create: `apps/bot/src/index.ts`
- Create: `apps/bot/src/utils/browser.ts`
- Create: `apps/bot/src/utils/credentials.ts`
- Create: `apps/bot/src/scrapers/base-scraper.ts`
- Create: `apps/bot/src/workers/scan-worker.ts`

**Step 1: Install bot dependencies**

```bash
cd apps/bot && pnpm add playwright @repo/shared bullmq ioredis pino && pnpm add -D tsx @types/node typescript
npx playwright install chromium
```

**Step 2: Create browser pool manager**

Max 3 concurrent browsers, headless, Greek locale, Athens timezone.

**Step 3: Create credentials decryption helper**

Fetches encrypted creds from DB, decrypts via shared encryption module.

**Step 4: Create base scraper abstract class**

`login()`, `extractDebts()`, `run()` with 30s timeout, captcha detection.

**Step 5: Create BullMQ worker**

Consumes scan jobs: decrypt → browser → scrape → save debts → cleanup.

**Step 6: Create entry point**

`src/index.ts` — starts the worker, handles graceful shutdown.

**Step 7: Verify bot starts**

```bash
cd apps/bot && pnpm dev
```

**Step 8: Commit**

---

### Task B.3: AADE Scraper

**Files:**
- Create: `apps/bot/src/scrapers/aade.ts`

**Step 1: Implement AADE scraper**

Start with a stub/mock that simulates the TaxisNet flow. Document the real selectors to be filled in during manual testing against the actual site.

**Step 2: Test with mock data**

**Step 3: Commit**

---

### Task B.4: Scan API & UI Integration

**Files:**
- Create: `apps/web/app/api/scans/route.ts`
- Create: `apps/web/app/api/admin/scans/[id]/status/route.ts`
- Create: `apps/web/server_actions/scans.ts`
- Create: `apps/web/app/[locale]/admin/scans/page.tsx`
- Create: `apps/web/app/[locale]/admin/scans/[id]/page.tsx`
- Create: `apps/web/components/admin/scans/scan-progress-card.tsx`
- Create: `apps/web/components/admin/scans/platform-status-row.tsx`
- Create: `apps/web/components/admin/scans/scan-summary.tsx`
- Create: `apps/web/components/admin/scans/scan-history-table.tsx`
- Create: `apps/web/components/admin/scans/bulk-scan-progress.tsx`
- Modify: `apps/web/components/admin/clients/client-row-actions.tsx` (enable Scan action)

**Step 1: Create scan server actions**

**Step 2: Create scan API routes (for BullMQ + polling)**

**Step 3: Create scan progress components**

**Step 4: Create scan pages**

**Step 5: Enable "Scan" action in client row**

**Step 6: Update dashboard with real debts**

**Step 7: Verify end-to-end**

Start Redis + bot + web. Trigger scan. See progress. See debts.

**Step 8: Commit**

---

### Phase B Test Plan

1. Start Redis: `docker run -p 6379:6379 redis`
2. Start bot: `cd apps/bot && pnpm dev`
3. Start web: `cd apps/web && pnpm dev`
4. Go to `/admin/clients` → click "Scan" on a client
5. See scan progress card update in real-time
6. Verify debts appear in DB and on dashboard
7. Test error cases: wrong credentials, timeout
8. Test bulk scan with multiple clients
9. Verify rate limiting (can't scan same client within 6 hours)

---

# PHASE C: Email Notifications & End-to-End Flow

**Goal:** Complete the loop — scan finds debts → send email notification to client.
**Test:** Scan completes → click "Send Email" → client receives debt summary email.

---

### Task C.1: Email System

**Files:**
- Create: `apps/web/lib/email/mailer.ts`
- Create: `apps/web/lib/email/templates/debt-notification.tsx`
- Create: `apps/web/lib/email/send-notification.ts`

**Step 1: Install email dependencies**

```bash
cd apps/web && pnpm add nodemailer @react-email/components @react-email/render && pnpm add -D @types/nodemailer
```

**Step 2: Create Nodemailer transporter factory**

Decrypts accountant's SMTP config, creates transporter on-demand.

**Step 3: Create React Email template**

Greek template: greeting, debt table, total, scan date, office signature.

**Step 4: Create send functions**

`sendDebtNotification()` and `sendBulkNotifications()`.

**Step 5: Commit**

---

### Task C.2: Email Management Screen

**Files:**
- Create: `apps/web/server_actions/emails.ts`
- Create: `apps/web/app/[locale]/admin/emails/page.tsx`
- Create: `apps/web/components/admin/emails/email-client-selector.tsx`
- Create: `apps/web/components/admin/emails/email-template-editor.tsx`
- Create: `apps/web/components/admin/emails/email-preview-dialog.tsx`
- Create: `apps/web/components/admin/emails/email-history-table.tsx`

**Step 1: Create email server actions**

**Step 2: Create email management page with tabs**

**Step 3: Create email components**

**Step 4: Commit**

---

### Task C.3: Wire Up Scan → Email Flow

**Step 1: Add "Send Email" button to scan summary**

**Step 2: Wire auto-notify (if enabled, send after scan completes)**

**Step 3: Commit**

---

### Task C.4: Second Scraper (EFKA or Τέλη Κυκλοφορίας)

**Files:**
- Create: `apps/bot/src/scrapers/efka.ts` (or `vehicle-tax.ts`)

**Step 1: Implement second scraper following base-scraper pattern**

**Step 2: Register in scan worker**

**Step 3: Test end-to-end**

**Step 4: Commit**

---

### Task C.5: Security Hardening

**Step 1: Configure pino logger redaction**

**Step 2: Add HTTP security headers**

**Step 3: Verify audit log completeness**

**Step 4: Final build verification**

```bash
pnpm build && pnpm tsc --noEmit && pnpm lint
```

**Step 5: Commit**

---

### Phase C Test Plan

1. Configure SMTP in `/admin/settings` (use Mailtrap for testing)
2. Run scan → debts found → click "Send Email" → verify email received
3. Check `/admin/emails` → email in history
4. Test bulk email
5. Test email preview + template editing
6. Test auto-notify flow
7. Test second scraper end-to-end
8. **Full E2E:** Add client → scan → debts → email → history

---

## Environment Variables

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_MASTER_KEY=<openssl rand -hex 32>
REDIS_URL=redis://localhost:6379
```

---

## Monorepo Final Structure

```
ai-digital-accountant/
  package.json                    # Workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  CLAUDE.md
  docs/plans/                     # This plan

  packages/shared/
    package.json                  # @repo/shared
    prisma/schema.prisma
    src/
      db/client.ts
      encryption/index.ts
      queue/index.ts
      types/index.ts
      index.ts

  apps/web/
    package.json                  # @repo/web
    app/[locale]/
      admin/
        dashboard/page.tsx
        clients/page.tsx
        scans/page.tsx + [id]/page.tsx
        emails/page.tsx
        settings/page.tsx
      login/page.tsx
    components/admin/
      shared/
      dashboard/
      clients/
      scans/
      emails/
      settings/
    lib/auth/
    lib/email/
    server_actions/
    messages/el.json

  apps/bot/
    package.json                  # @repo/bot
    src/
      workers/scan-worker.ts
      scrapers/aade.ts
      scrapers/efka.ts
      scrapers/base-scraper.ts
      utils/browser.ts
      utils/credentials.ts
```
