# Design: Client Wizard, Search Bar, Per-Client Email History

**Date:** 2026-03-02
**Status:** Approved

## Overview

Three features to improve the accountant workflow:

1. **Add Client Wizard** — 2-step wizard that auto-fetches client data from EFKA Registry using TaxisNet credentials
2. **Full-Page Client Search Bar** — prominent, reusable search bar replacing the small combobox on Debts/Emails/Certificates pages
3. **Per-Client Email History** — email history section visible when a client is selected on the debts page

---

## Feature 1: Add Client Wizard with Auto-Fetch

### User Flow

1. User clicks "Add Client" → wizard dialog opens
2. **Step 1 (Credentials):** User enters TaxisNet username + password. Clicks "Lookup".
3. Loading spinner shows (~30s) while bot logs into EFKA and scrapes `EfkaRegistry.aspx`
4. **Step 2 (Review):** Pre-filled form shows discovered data (name, AFM, AMKA) as read-only. User adds email, phone, notes.
5. User clicks "Save" → client created with encrypted credentials + discovered data.
6. **Fallback:** If lookup fails (bad creds, timeout, network), user sees an error message and the form fields become editable for manual entry.

### Bot: EFKA Registry Scraper

**URL:** `https://www.idika.org.gr/EfkaServices/Application/EfkaRegistry.aspx`

This page is accessible after the standard TaxisNet OAuth + AMKA login flow (already implemented in EFKA scraper). However, for the lookup we do NOT have the AMKA yet — we only have TaxisNet creds.

**Problem:** The EFKA login requires AMKA entry after TaxisNet OAuth. For the lookup, we don't have AMKA.

**Solution:** After TaxisNet OAuth + consent, the EFKA landing page may show a way to reach the registry. If AMKA is required first, we need an alternative:
- **Option A:** Use myAADE/TaxisNet profile page directly (no AMKA needed, just TaxisNet creds) — needs investigation
- **Option B:** After login, if the system requires AMKA, we return a partial result (no AMKA) and ask the user to provide AMKA manually in Step 2

**Known CSS Selectors on EfkaRegistry.aspx:**

| Field | Selector | Example |
|-------|----------|---------|
| AMKA | `#ContentPlaceHolder1_dAMKA` | 26109701412 |
| AFM | `#ContentPlaceHolder1_dAFM` | 167755928 |
| Last Name (GR) | `#ContentPlaceHolder1_dLastName` | ΔΗΜΗΤΡΑΚΟΠΟΥΛΟΣ |
| First Name (GR) | `#ContentPlaceHolder1_dFirstName` | ΝΙΚΟΛΑΟΣ |
| Last Name (Latin) | `#ContentPlaceHolder1_dLastNameLatin` | DIMITRAKOPOULOS |
| First Name (Latin) | `#ContentPlaceHolder1_dFirstNameLatin` | NIKOLAOS |

### Architecture

**New BullMQ job type:** `CLIENT_LOOKUP`
- Input: `{ accountantId, taxisnetUsername, taxisnetPassword }`
- Output: `{ firstName, lastName, firstNameLatin, lastNameLatin, afm, amka }` or error
- Uses existing EFKA login flow, navigates to EfkaRegistry.aspx after login
- Timeout: 60s

**New API route:** `POST /api/clients/lookup`
- Queues `CLIENT_LOOKUP` job
- Returns `{ jobId }`

**New API route:** `GET /api/clients/lookup/[jobId]/status`
- Polls job status
- Returns `{ status: 'pending' | 'completed' | 'failed', data?: ClientLookupResult, error?: string }`

**Frontend wizard component:** `ClientWizardDialog`
- Replaces `ClientFormDialog` for "add" mode (edit mode stays as-is)
- Step 1: credentials input + lookup trigger
- Step 2: review fetched data + complete form
- Polling interval: 2s until job completes or fails

### Data Model

No schema changes needed. The wizard populates the same `Client` model fields that already exist.

---

## Feature 2: Full-Page Client Search Bar

### Design

A large, prominent search input placed at the top of pages that require client selection (Debts, Emails, Certificates).

**Component:** `<ClientSearchBar />`
- Large input with search icon (magnifying glass) and placeholder "Search clients by name or AFM..."
- As user types, dropdown panel shows matching clients
- Each result row shows: initials avatar (colored circle), full name, AFM, status badge, total debts amount
- Clicking a result selects the client
- Selected state shows the client info inline below the search bar
- Clear button (X) to deselect

**Search logic:**
- Client-side filtering of pre-fetched client list (same as current approach)
- Filters on: name (case-insensitive), AFM (prefix match)
- No server-side search needed — accountants typically have <500 clients

**Reuse:** Used on:
- `/admin/debts` — select client to view/scan debts
- `/admin/emails` — select client to send email
- `/admin/certificates` — select client to view certificates

### Visual

```
┌─────────────────────────────────────────────────────────┐
│  🔍  Search clients by name or AFM...                   │
└─────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────┐
  │  ΝΔ  Νίκος Δημητρακόπουλος  167755928  ● Active  │
  │  ΜΠ  Μαρία Παπαδοπούλου     123456789  ● Pending │
  │  ΓΚ  Γιώργος Καραγιάννης    987654321  ● Active  │
  └─────────────────────────────────────────────────────┘
```

After selection:
```
┌─────────────────────────────────────────────────────────┐
│  ΝΔ  Νίκος Δημητρακόπουλος · 167755928 · €160.46   ✕  │
└─────────────────────────────────────────────────────────┘
```

---

## Feature 3: Per-Client Email History

### Design

When a client is selected on the debts page, show an "Emails Sent" section below the debt results.

**Component:** `<ClientEmailHistory clientId={string} />`
- Card with header "Emails Sent" and count badge
- Table rows: date (relative, e.g. "2 days ago"), subject, status badge (Sent/Failed/Pending)
- Clicking a row expands to show email body HTML preview
- Empty state: "No emails sent to this client yet"
- Limit: show last 20 emails, with "Show all" link to `/admin/emails?clientId=X`

**Data fetching:**
- Server action: `getClientEmailLogs(clientId, limit=20)` — already partially exists in `getEmailLogs()`, just needs a clientId filter

### Placement

On the debts page, after the debt service cards and scan results:

```
[Client Search Bar]
[Debt Service Cards: AADE | EFKA | GEMI | Municipality]
[Scan Results / Debt Summary]
─────────────────────────────────
[Emails Sent (3)]
  2 Mar 2026  Ενημέρωση οφειλών  ✅ Sent
  28 Feb 2026 Ενημέρωση οφειλών  ✅ Sent
  15 Feb 2026 Ενημέρωση οφειλών  ❌ Failed
```

---

## Implementation Priority

1. **Client Search Bar** — smallest scope, unblocks UX for all pages
2. **Add Client Wizard** — highest value, requires bot + API + frontend
3. **Per-Client Email History** — straightforward query + UI

---

## Open Questions

1. **AMKA requirement for EFKA login:** The wizard needs TaxisNet creds only, but EFKA login flow requires AMKA. Need to investigate if we can skip AMKA entry or use a different portal (myAADE profile) that only needs TaxisNet creds. If not, we ask the user for AMKA in Step 1 alongside the creds.
