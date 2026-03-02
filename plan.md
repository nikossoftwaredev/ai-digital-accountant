# Implementation Plan: hexAIgon Debt Checker MVP

## Context

Build an MVP debt-checking application for Greek accountants. The plan is structured into **testable phases** — each phase delivers working functionality you can test before moving to the next.

**Key decisions:**
- Monorepo: `apps/web` (Next.js) + `apps/bot` (Playwright) + `packages/shared`
- Auth: NextAuth Credentials Provider + bcrypt + TOTP 2FA
- i18n: Keep next-intl, Greek-only with `localePrefix: "never"`
- Encryption: AES-256-GCM with env-based master key
- Email: Nodemailer + accountant-configured SMTP
- Queue: Shared Redis + BullMQ

---

# PHASE A: Foundation & Client Management

**Goal:** Accountant can log in, manage clients (CRUD), see a dashboard.
**Test:** Log in → add clients with TaxisNet credentials → edit/delete → see them on dashboard.

## A.0 — Delete Template Code

Remove all starter template code that isn't needed for this app:

**Files to DELETE:**
- `server_actions/todos.ts` — template todo CRUD (replaced by client/scan actions)
- `types/todos.ts` — todo type definitions
- `components/examples/add-todo-form.tsx` — template demo component
- `components/examples/language-switcher.tsx` — template demo (Greek-only app)
- `components/examples/login-button.tsx` — template demo (replaced by login page)
- `components/examples/ThemeSwitcher.tsx` — already used in admin header, example not needed
- `components/examples/todo-item.tsx` — template demo
- `components/examples/todo-list.tsx` — template demo
- `components/examples/` — entire directory

**Files to GUT (remove template content, keep file):**
- `app/[locale]/page.tsx` — replace landing page content with redirect to `/admin/dashboard`
- `messages/en.json` — remove `HomePage` and `TodoDemo` sections, keep as shell
- `messages/el.json` — same, remove template sections

**Files to MODIFY:**
- `lib/auth/auth.ts` — remove Google OAuth provider (replaced in A.5)
- `app/[locale]/admin/users/page.tsx` — delete (replaced by clients page)
- `app/[locale]/admin/expenses/page.tsx` — delete (not needed)
- `app/[locale]/admin/page.tsx` — change redirect from `/admin/users` to `/admin/dashboard`

**Dependencies to REMOVE from package.json:**
- Google OAuth env vars from `.env.template` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

## A.1 — Monorepo Restructuring

Convert the flat Next.js app into a monorepo.

- Update `pnpm-workspace.yaml` to `packages: ["apps/*", "packages/*"]`
- Create root `package.json` (workspace scripts) and `tsconfig.base.json`
- Move all existing files into `apps/web/`
- Create `packages/shared/` with:
  - `prisma/schema.prisma` (moved from `lib/db/`)
  - `src/db/client.ts` (PrismaClient singleton)
  - `src/encryption/index.ts` (AES-256-GCM)
  - `src/types/index.ts` (shared domain types)
  - `src/index.ts` (barrel export)
- Create `apps/bot/` skeleton (empty, just package.json + tsconfig)
- Update all imports from `@/lib/db` → `@repo/shared`

**Critical files:** `pnpm-workspace.yaml`, `packages/shared/package.json`, `apps/web/package.json`

## A.2 — Database Schema

Replace User+Todo with domain models (in `packages/shared/prisma/schema.prisma`):

| Model | Key Fields |
|-------|-----------|
| **Accountant** | email, passwordHash, name, totpSecret, totpEnabled, backupCodes, officeName/Address/Phone, smtpConfig (encrypted JSON), scanFrequency, autoNotify, failedAttempts, lockedUntil |
| **Client** | accountantId (FK), name, afm (9-digit, unique per accountant), email, phone, taxisnetUsername (encrypted), taxisnetPassword (encrypted), encryptionIV, notes, status, lastScanAt, totalDebts |
| **Scan** | clientId (FK), accountantId (FK), status (QUEUED/RUNNING/COMPLETED/FAILED), startedAt, completedAt, errorMessage, platformStatuses (JSON), totalDebtsFound, jobId |
| **Debt** | clientId (FK), scanId (FK), category (enum), amount (Decimal), platform (enum), priority, description, dueDate |
| **EmailLog** | clientId (FK), accountantId (FK), recipientEmail, subject, body, sentAt, status |
| **AuditLog** | accountantId (FK), clientId (FK), action (enum), ipAddress, userAgent, details (JSON) |

Migration: Create new tables → migrate `users` data → drop `todos` + `users`.

## A.3 — Encryption Layer

`packages/shared/src/encryption/index.ts`:
- `encrypt(plaintext)` → `{ ciphertext, iv, tag }` (AES-256-GCM, hex)
- `decrypt({ ciphertext, iv, tag })` → plaintext
- Master key from `ENCRYPTION_MASTER_KEY` env var (64 hex chars)
- Fresh random 12-byte IV per encrypt call

## A.4 — i18n Simplification

- Set `localePrefix: "never"` and `defaultLocale: "el"` in `lib/i18n/routing.ts`
- Update `messages/el.json` with full Greek translation keys for all admin screens
- Remove English locale references (keep file as fallback)

## A.5 — Authentication

Replace Google OAuth with email+password:

- **`lib/auth/auth.ts`** — CredentialsProvider: email+password → bcrypt verify → TOTP check → JWT
- **`lib/auth/rate-limit.ts`** — 5 failed attempts → 15-min lockout
- **`lib/auth/totp.ts`** — TOTP via `otpauth` library, backup codes
- **`lib/auth/audit.ts`** — logAuditEvent helper
- **`app/[locale]/login/page.tsx`** + **`components/auth/login-form.tsx`** — two-step form
- Session: JWT, 15-minute maxAge
- New deps: `bcryptjs`, `otpauth`, `qrcode`

## A.6 — Admin Shell & Navigation

- Update `lib/admin/config.ts` — new Greek nav: Πίνακας Ελέγχου, Πελάτες, Οφειλές, Βεβαιώσεις, Emails, Ρυθμίσεις
- Update `components/admin/admin-sidebar.tsx` — use `useTranslations()`
- Install shadcn components: `dialog`, `alert-dialog`, `form`, `select`, `tabs`, `progress`
- Create shared components in `components/admin/shared/`:
  - `page-header.tsx`, `stat-card.tsx`, `status-badge.tsx`, `currency-cell.tsx`, `confirm-dialog.tsx`

## A.7 — Client Management Screen

**Route:** `/admin/clients`

- **Page:** `app/[locale]/admin/clients/page.tsx` (Server Component, fetches clients)
- **Data table:** Name, AFM, Email, Status badge, Last Scan, Total Debts, Actions dropdown
- **Add/Edit dialog:** react-hook-form + zod, AFM validation (9 digits), password never shown after save
- **Delete dialog:** AlertDialog with confirmation
- **Server actions:** `server_actions/clients.ts` — createClient, updateClient, deleteClient, getClients

## A.8 — Dashboard Screen

**Route:** `/admin/dashboard`

- 4 stat cards: total debts (€), active clients, connection errors, last scan date
- Recent debts table (last 10, empty initially)
- Quick action buttons: add client, bulk scan (disabled until Phase B), send emails (disabled until Phase C)
- **Server actions:** getDashboardStats, getRecentDebts

## A.9 — Settings Screen (Partial)

**Route:** `/admin/settings`

- Tabs: SMTP | Scans | Profile
- SMTP config form (host, port, username, password — encrypted on save)
- Scan frequency selector + auto-notify toggle
- Profile: office info, password change, 2FA setup (QR code)
- **Server actions:** `server_actions/settings.ts` — getSettings, saveSettings

## A.10 — Cleanup Template Code

- Delete `server_actions/todos.ts`, `components/examples/`, `types/todos.ts`
- Replace home page with redirect to `/admin/dashboard`
- Update `CLAUDE.md` with new paths

### Phase A Test Plan
1. `pnpm install && pnpm dev` — app starts
2. Create seed accountant via `prisma studio` or register API
3. Log in with email+password at `/login`
4. Navigate to `/admin/clients` → add 2-3 test clients with dummy TaxisNet credentials
5. Verify credentials are encrypted in DB (check via prisma studio)
6. Edit a client, delete a client
7. See stats on dashboard
8. Configure SMTP in settings, set up 2FA
9. `pnpm build` — no TypeScript errors

---

# PHASE B: Bot Service & AADE Scanning

**Goal:** Trigger a scan, Playwright bot logs into TaxisNet, extracts debts.
**Test:** Click "Scan" on a client → see live progress → see debt results.

## B.1 — Queue Infrastructure

- Add `bullmq` and `ioredis` to `packages/shared/`
- Create `packages/shared/src/queue/index.ts`:
  - `createRedisConnection()`, `createScanQueue()`, `SCAN_QUEUE_NAME`
  - Job payload type: `{ scanId, clientId, accountantId, platforms }`
- Add `REDIS_URL` env var

## B.2 — Bot Service Setup

`apps/bot/`:
- **`src/utils/browser.ts`** — Playwright browser pool (max 3 concurrent, headless, Greek locale)
- **`src/utils/credentials.ts`** — Decrypt client credentials from shared DB
- **`src/scrapers/base-scraper.ts`** — Abstract class: login(), extractDebts(), run() with 30s timeout
- **`src/workers/scan-worker.ts`** — BullMQ worker:
  1. Pick job from queue
  2. Update scan status → RUNNING
  3. Decrypt credentials
  4. Launch browser, run scraper
  5. Save debts to DB
  6. Update scan status → COMPLETED
  7. Close browser, clear credentials from memory

Error handling:
- Login failure → status ERROR, notify accountant
- Captcha → status CAPTCHA_REQUIRED
- Timeout → retry once, then FAILED
- Rate limit: 1 scan per client per 6 hours

Dependencies: `playwright`, `bullmq`, `ioredis`, `pino`, `tsx`

## B.3 — AADE Scraper

`apps/bot/src/scrapers/aade.ts`:
- Login to `aade.gr/taxisnet` with username+password
- Navigate to personalized info → debts page
- Parse debt table rows: category, description, amount
- Handle captcha detection, timeout
- Logout and close

**Note:** Exact selectors depend on the real AADE site — will need to be developed/tested against the actual site. Start with a mock/stub for development, then wire up real selectors.

## B.4 — Scan API & UI Integration

**API routes:**
- `POST /api/scans` — create Scan record, push job to BullMQ
- `GET /api/admin/scans/[id]/status` — return scan status + debts (for polling)
- `POST /api/scans/bulk` — enqueue scans for all active clients

**Admin screens:**
- **Οφειλές page** (`/admin/debts`):
  - Service cards: ΑΑΔΕ Οφειλές, ΕΦΚΑ Οφειλές — each card shows last scan status, total debts, "Σάρωση" button
  - Clicking a card → triggers scan for that platform → live progress card
  - Live progress card: TaxisNet login status → per-platform check → results
  - Polling via setInterval every 2s while status = RUNNING
  - Summary: total debts, send email button
  - Bulk scan: queue progress bar, percentage, cancel
  - Scan history table (filterable by platform)
- **Client row action:** "Σάρωση" triggers scan → navigates to `/admin/debts` with client pre-selected

**Components:**
- `debt-service-card.tsx` (card per platform: AADE, EFKA)
- `scan-progress-card.tsx` (Client Component, polling)
- `platform-status-row.tsx` (status indicator per platform)
- `scan-summary.tsx` (total + email button)
- `bulk-scan-progress.tsx` (queue bar)
- `scan-history-table.tsx`

### Phase B Test Plan
1. Start Redis locally (`docker run -p 6379:6379 redis`)
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

## C.1 — Email System

`apps/web/lib/email/`:
- **`mailer.ts`** — Decrypt accountant's SMTP config, create Nodemailer transporter
- **`templates/debt-notification.tsx`** — React Email template in Greek:
  - Personalized greeting with client name
  - Debt table: platform, category, amount
  - Total amount
  - Scan date
  - Office signature
- **`send-notification.ts`** — `sendDebtNotification()` and `sendBulkNotifications()`

Dependencies: `nodemailer`, `@react-email/components`, `@react-email/render`

## C.2 — Email Management Screen

**Route:** `/admin/emails`

- Tabs: Send | Template | History
- **Send tab:** Client selector with checkboxes, "select all with debts", send button
- **Template tab:** Subject, body (with `{clientName}`, `{debtTable}` variables), signature
- **History tab:** Sent email log table (date, recipient, status)
- **Preview dialog:** Rendered email preview before sending

**Server actions:** `server_actions/emails.ts` — sendEmail, sendBulkEmails, getEmailLogs

## C.3 — Wire Up Scan → Email Flow

- After scan completes, "Send Email" button on scan summary
- Auto-notify option: if enabled in settings, automatically send email when new debts found
- Email log tracks all sent emails

## C.4 — EFKA Scraper (or Τέλη Κυκλοφορίας)

`apps/bot/src/scrapers/efka.ts`:
- Login to `efka.gov.gr` with credentials
- Navigate to contributions/debts section
- Parse debt records
- Same error handling as AADE

(Or alternatively start with Τέλη Κυκλοφορίας via AADE's myCar portal — depends on which is more accessible.)

## C.5 — Security Hardening

- Pino logger `redact` config — never log credentials
- API responses — never return encrypted fields
- HTTP security headers in `next.config.ts`
- Verify audit log has entries for all actions
- Test rate limiting, session timeout, 2FA

### Phase C Test Plan
1. Configure SMTP in `/admin/settings` (use Mailtrap for testing)
2. Run a scan on a client → debts found
3. Click "Send Email" → verify email received with correct debt table
4. Go to `/admin/emails` → see email in history
5. Test bulk email to multiple clients
6. Test email preview
7. Test template editing
8. Test auto-notify flow
9. Test EFKA scraper (or vehicle tax) end-to-end
10. **Full E2E:** Add client → scan AADE + EFKA → see debts → send email → verify in history

---

# PHASE D: One-Click Certificates (Φορολογική & Ασφαλιστική Ενημερότητα)

**Goal:** Accountant clicks one button per client to automatically retrieve a Tax Clearance Certificate (Φορολογική Ενημερότητα) from AADE and a Social Security Clearance Certificate (Ασφαλιστική Ενημερότητα) from EFKA.
**Test:** Select a client → click "Φορολογική Ενημερότητα" → bot logs in, requests the certificate, downloads the PDF → accountant sees/downloads it from the UI. Same for Ασφαλιστική Ενημερότητα.

## D.1 — Certificate Model & Queue

- Add `Certificate` model to Prisma schema:
  - `id`, `clientId` (FK), `accountantId` (FK), `type` (enum: `TAX_CLEARANCE`, `SOCIAL_SECURITY_CLEARANCE`), `status` (enum: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), `fileUrl` (stored PDF path/blob), `fileName`, `errorMessage`, `requestedAt`, `completedAt`
- Add `CERTIFICATE_QUEUE_NAME` to shared queue config
- Job payload: `{ certificateId, clientId, accountantId, type }`

## D.2 — AADE Tax Clearance Scraper

`apps/bot/src/scrapers/aade-tax-clearance.ts`:
- Login to AADE/TaxisNet with client credentials
- Navigate to Φορολογική Ενημερότητα request page
- Fill in required fields (purpose, recipient)
- Submit request and wait for PDF generation
- Download the generated PDF
- Save PDF to storage (local filesystem or Supabase Storage)
- Handle errors: not eligible (has debts), captcha, timeout

## D.3 — EFKA Social Security Clearance Scraper

`apps/bot/src/scrapers/efka-clearance.ts`:
- Login to EFKA with client credentials
- Navigate to Ασφαλιστική Ενημερότητα section
- Request certificate
- Download the generated PDF
- Save to storage
- Handle errors: outstanding contributions, captcha, timeout

## D.4 — Certificate UI Integration

**Admin screens:**
- **Βεβαιώσεις page** (`/admin/certificates`):
  - Service cards: Φορολογική Ενημερότητα, Ασφαλιστική Ενημερότητα — each card shows description, client selector, "Αίτηση" button
  - Select client → click card → queues certificate job → live progress card
  - Certificate progress: Polling card (same pattern as scan progress in Οφειλές)
  - Certificate history table: all past requests across clients, status, download PDF link
- **Client row action:** "Βεβαιώσεις" in dropdown → navigates to `/admin/certificates` with client pre-selected

**Components:**
- `certificate-service-card.tsx` (card per certificate type)
- `certificate-progress-card.tsx` (Client Component, polling)
- `certificate-history-table.tsx`

**Server actions:** `server_actions/certificates.ts` — requestCertificate, getCertificates, downloadCertificate

### Phase D Test Plan
1. Go to `/admin/certificates` → select a client → click "Φορολογική Ενημερότητα"
2. See progress card → bot logs in → certificate generated → PDF available
3. Download the PDF and verify it's valid
4. Repeat for "Ασφαλιστική Ενημερότητα"
5. Test error case: client has debts → certificate not available → clear error message
6. Check certificate history shows all past requests
7. Test bulk certificate requests for multiple clients

---

## Environment Variables (All Phases)

```bash
# Phase A
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_MASTER_KEY=<openssl rand -hex 32>

# Phase B
REDIS_URL=redis://localhost:6379

# Phase C
# (SMTP configured per-accountant via UI)
```

---

## Monorepo Final Structure

```
ai-digital-accountant/
  package.json                    # Workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  CLAUDE.md

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
        debts/page.tsx
        certificates/page.tsx
        emails/page.tsx
        settings/page.tsx
      login/page.tsx
    components/admin/
      shared/                     # page-header, stat-card, etc.
      dashboard/
      clients/
      debts/
      certificates/
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
      scrapers/aade-tax-clearance.ts
      scrapers/efka.ts
      scrapers/efka-clearance.ts
      scrapers/base-scraper.ts
      utils/browser.ts
      utils/credentials.ts
```
