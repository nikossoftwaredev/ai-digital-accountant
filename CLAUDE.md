# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev        # Start development server on http://localhost:3000
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run ESLint
pnpm tsc --noEmit  # Check TypeScript errors
```

### Adding UI Components
```bash
npx shadcn@latest add <component>  # Add new shadcn/ui components
```

## Architecture

### Tech Stack
- **Next.js 16.1.1** with App Router and React Server Components
- **NextAuth.js 4.24** for authentication (Google OAuth)
- **next-intl 4.7.0** for internationalization (en, el locales)
- **Tailwind CSS 4** with CSS variables and modern color space
- **shadcn/ui** components (New York style)
- **TypeScript** with strict mode

### Project Structure
- `app/[locale]/` - Dynamic locale-based routing
- `app/api/auth/[...nextauth]/` - NextAuth API routes
- `components/ui/` - shadcn/ui components
- `components/auth/` - Authentication components
- `lib/i18n/` - Internationalization configuration
- `lib/auth/` - NextAuth configuration
- `lib/general/` - General utilities (utils.ts)
- `messages/` - Translation files (en.json, el.json)
- `proxy.ts` - Middleware for i18n routing (not middleware.ts)
- `types/` - Shared TypeScript interfaces

### Key Patterns

#### Internationalization
- All pages/layouts receive `params: Promise<{ locale: string }>`
- Server components: Use `await getTranslations()` with `setRequestLocale(locale)`
- Type-safe translations via `global.d.ts`
- Navigation helpers in `lib/i18n/navigation.ts` (Link, redirect, useRouter)

#### Component Development
- Default to Server Components, use "use client" only when needed
- Always await params in pages/layouts (Next.js 16 requirement)
- Use `@/` path alias for imports
- Utility function `cn()` in `@/lib/general/utils.ts` for merging Tailwind classes

#### UI & Design Rules
- **Always use the frontend-design plugin** when working on any design or UI task
- **Always use shadcn/ui components** — search the web for the correct install command (`npx shadcn@latest add <component>`) and usage patterns before implementing. Do not guess component APIs; look them up.
- **Always use Lucide icons** (`lucide-react`) — they are the icon set used by shadcn/ui. Search for the right icon name on the web when needed.
- **`components/ui/` is reserved for shadcn/ui components only** — custom components go in `components/`
- Use `CircleIcon` (`components/CircleIcon.tsx`) for general icon display with colored circular backgrounds
- Use `SocialIcon` (`components/social-icon.tsx`) for social media link icons with platform-specific colors

#### Styling
- CSS variables defined in `app/globals.css`
- Dark mode via `next-themes` with class strategy
- Custom Tailwind variant: `@custom-variant dark (&:is(.dark *))`
- Always use semantic color naming (e.g., `text-foreground`, `bg-background`)

## Authentication Setup

### NextAuth Configuration
- **Provider**: Google OAuth configured in `lib/auth/auth.ts`
- **Session Management**: SessionProvider wraps the app in `components/providers.tsx`
- **Environment Variables Required**:
  - `NEXTAUTH_SECRET`: Secret key for JWT encryption
  - `NEXTAUTH_URL`: Application URL (http://localhost:3000 for development)
  - `GOOGLE_CLIENT_ID`: From Google Cloud Console
  - `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.developers.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env.local`

## Important Notes

- **PNPM Required**: This project uses PNPM workspaces
- **Locale Validation**: Layout validates locale and returns 404 for invalid locales
- **Static Generation**: Uses `generateStaticParams()` for all locale variants
- **Prisma Setup**: Connected to Supabase PostgreSQL database with User and Todo models

## Development Guidelines

All coding rules, style preferences, and best practices are in `tasks/lessons.md`. Review at session start.

## Workflow Orchestration

### 1. Plan Mode Default

* Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
* If something goes sideways, STOP and re-plan immediately - don't keep pushing
* Use plan mode for verification steps, not just building
* Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

* Use subagents liberally to keep main context window clean
* Offload research, exploration, and parallel analysis to subagents
* For complex problems, throw more compute at it via subagents
* One task per subagent for focused execution

### 3. Self-Improvement Loop

* After ANY correction from the user: update `tasks/lessons.md` with the pattern
* Write rules for yourself that prevent the same mistake
* Ruthlessly iterate on these lessons until mistake rate drops
* Review lessons at session start for relevant project

### 4. Verification Before Done

* Never mark a task complete without proving it works
* Diff behavior between main and your changes when relevant
* Ask yourself: "Would a staff engineer approve this?"
* Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

* For non-trivial changes: pause and ask "is there a more elegant way?"
* If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
* Skip this for simple, obvious fixes - don't over-engineer
* Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

* When given a bug report: just fix it. Don't ask for hand-holding
* Point at logs, errors, failing tests - then resolve them
* Zero context switching required from the user
* Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

* **Simplicity First**: Make every change as simple as possible. Impact minimal code.
* **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
* **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
