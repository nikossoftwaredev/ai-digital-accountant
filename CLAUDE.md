# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev                    # Start Next.js dev server (from apps/web)
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm tsc --noEmit           # Check TypeScript errors
npx prisma db push          # Push schema to database (from packages/shared)
npx prisma generate         # Regenerate Prisma client (from packages/shared)
npx prisma studio           # Open Prisma Studio (from packages/shared)
```

### Adding UI Components
```bash
npx shadcn@latest add <component>  # Run from apps/web/
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router and React Server Components
- **NextAuth.js 4** with Credentials Provider (email + password + TOTP 2FA)
- **next-intl** for internationalization (Greek-only, `localePrefix: "never"`)
- **Prisma** + Supabase PostgreSQL
- **AES-256-GCM** encryption for stored credentials
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **TypeScript** with strict mode

### Monorepo Structure
```
ai-digital-accountant/
  pnpm-workspace.yaml
  packages/shared/           # @repo/shared
    prisma/schema.prisma     # 6 domain models + 10 enums
    src/db/client.ts         # PrismaClient singleton
    src/encryption/index.ts  # AES-256-GCM encrypt/decrypt
    src/index.ts             # Barrel export
  apps/web/                  # @repo/web (Next.js admin panel)
    app/[locale]/admin/      # Admin routes (dashboard, clients, scans, emails, settings)
    app/[locale]/login/      # Login page
    app/api/auth/            # NextAuth + register API routes
    components/admin/        # Admin components (shared/, clients/, settings/, dashboard/)
    components/ui/           # shadcn/ui components only
    components/auth/         # Login form
    lib/auth/                # auth.ts, session.ts, rate-limit.ts, totp.ts, audit.ts
    lib/i18n/                # Internationalization (routing, navigation, request)
    lib/general/             # utils.ts, format.ts
    server_actions/          # Server actions (clients.ts, dashboard.ts, settings.ts)
    messages/                # Translation files (el.json, en.json)
  apps/bot/                  # @repo/bot (Playwright scraper, Phase B)
```

### Key Patterns

#### Imports
- `import { prisma } from "@repo/shared";` — Prisma client
- `import { encrypt, decrypt } from "@repo/shared";` — Encryption
- `import { getAccountantId } from "@/lib/auth/session";` — Auth helper for server actions
- `import { logAuditEvent } from "@/lib/auth/audit";` — Audit logging
- `import { Link, useRouter } from "@/lib/i18n/navigation";` — i18n-aware navigation
- `@/` path alias points to `apps/web/`

#### Server Actions
- File-level `"use server"` directive
- Always call `getAccountantId()` for auth
- Validate with Zod
- Serialize Prisma Decimal → `Number()`, Date → `.toISOString()`
- Call `revalidatePath()` after mutations
- Return `{ success: boolean; error?: string }`

#### Internationalization
- Greek-only app with `localePrefix: "never"` and `defaultLocale: "el"`
- All pages receive `params: Promise<{ locale: string }>` (Next.js 16)
- Server components: `await getTranslations()` + `setRequestLocale(locale)`
- Client components: `useTranslations("Admin.clients")` etc.
- Translation keys in `messages/el.json` (primary) and `messages/en.json` (fallback)
- Type safety derived from `el.json` via `global.d.ts`

#### Component Development
- Default to Server Components, use `"use client"` only when needed
- Arrow functions only — no `function` declarations
- `cn()` from `@/lib/general/utils` for merging Tailwind classes
- `components/ui/` is reserved for shadcn/ui — custom components go elsewhere

#### Encryption
- TaxisNet credentials and SMTP password stored as `JSON.stringify(EncryptedPayload)`
- Each encrypted field carries its own IV and auth tag in the JSON
- TOTP secret: same pattern, encrypted with `encrypt()` from `@repo/shared`

#### Authentication
- Credentials Provider: email + password + optional TOTP 2FA
- JWT strategy with 15-minute session
- Rate limiting: 5 failed attempts → 15-min lockout
- Audit logging for all auth events

## Database Models

| Model | Purpose |
|-------|---------|
| **Accountant** | Admin user (auth, office info, SMTP, scan prefs, 2FA) |
| **Client** | Accountant's customer (name, AFM, encrypted TaxisNet creds) |
| **Scan** | Scan execution record (status, platforms, errors) |
| **Debt** | Individual debt from a scan (category, amount, platform) |
| **EmailLog** | Sent email tracking |
| **AuditLog** | Security event log |

## Environment Variables

```bash
# Required (apps/web/.env.local)
NEXTAUTH_SECRET=           # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=              # Supabase pooler connection string
DIRECT_URL=                # Supabase direct connection string
ENCRYPTION_MASTER_KEY=     # openssl rand -hex 32

# Phase B (future)
REDIS_URL=redis://localhost:6379
```

## Development Guidelines

All coding rules, style preferences, and best practices are in `tasks/lessons.md`. Review at session start.

## Workflow Orchestration

### 1. Plan Mode Default
* Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
* If something goes sideways, STOP and re-plan immediately

### 2. Subagent Strategy
* Use subagents liberally to keep main context window clean
* One task per subagent for focused execution

### 3. Self-Improvement Loop
* After ANY correction: update `tasks/lessons.md` with the pattern

### 4. Verification Before Done
* Never mark a task complete without proving it works
* Run `pnpm tsc --noEmit` and `pnpm lint` before committing

## Core Principles

* **Simplicity First**: Make every change as simple as possible
* **No Laziness**: Find root causes. No temporary fixes
* **Minimal Impact**: Changes should only touch what's necessary
