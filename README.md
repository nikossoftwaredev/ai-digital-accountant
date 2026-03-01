# Next.js Auth + Internationalization + Prisma Starter

A modern full-stack starter template built with Next.js 16, NextAuth.js, Prisma ORM, and next-intl for internationalization.

## 🚀 Quick Start

### Use this template

Click the **"Use this template"** button on GitHub or use this direct link:

[![Use this template](https://img.shields.io/badge/Use%20this%20template-2ea44f?style=for-the-badge)](https://github.com/nikossoftwaredev/next-auth-intl-prisma-starter/generate)

This will create a new repository in your GitHub account with all the starter code.

## Features

- 🔐 **Authentication** with NextAuth.js (Google OAuth, easily extendable)
- 🗄️ **Database** integration with Prisma ORM + Supabase (PostgreSQL)
- 🌍 **Internationalization** with next-intl (English, Greek & Spanish)
- 📝 **Todo CRUD** functionality with user-specific data
- 🌙 **Dark/Light Mode** with next-themes and system preference detection
- 🎨 **UI Components** from shadcn/ui (Radix UI + Tailwind CSS)
- 📘 **TypeScript** with strict mode for better DX
- ⚡ **Server Actions** for secure database operations
- 🚀 **Next.js 15** with App Router and Turbopack
- 📦 **PNPM** for fast, efficient package management
- 🔧 **ESLint & Prettier** configured with best practices

## Prerequisites

- Node.js 18+
- PNPM (required package manager)
- PostgreSQL database

## Getting Started

### 1. Clone the repository or use the template

**Option A: Use as a template (recommended)**
1. Click the "Use this template" button on GitHub
2. Clone your new repository:
```bash
git clone <your-new-repo-url>
cd <your-repo-name>
```

**Option B: Clone directly**
```bash
git clone https://github.com/nikossoftwaredev/next-auth-intl-prisma-starter.git
cd next-auth-intl-prisma-starter
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/database_name?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.developers.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (or use existing)
3. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. Copy the Client ID and Client Secret to your `.env.local`

### 5. Set up the database

#### Option A: Use a local PostgreSQL database

1. Install PostgreSQL if not already installed
2. Create a new database
3. Update the `DATABASE_URL` in `.env.local`

#### Option B: Use a hosted database service

Popular options:
- [Neon](https://neon.tech) - Serverless Postgres
- [Supabase](https://supabase.com) - Postgres with additional features
- [Railway](https://railway.app) - Simple deployment platform
- [PlanetScale](https://planetscale.com) - MySQL-compatible (requires changing provider in schema.prisma)

### 6. Initialize Prisma and create database tables

```bash
# Generate Prisma Client
pnpm prisma generate

# Create database tables
pnpm prisma db push

# (Optional) Open Prisma Studio to view your database
pnpm prisma studio
```

### 7. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Schema

The application uses two main models:

- **User**: Stores authenticated user information from Google OAuth
- **Todo**: Stores user-specific todo items with title, description, and completion status

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── [locale]/          # Locale-based routing
│   └── api/auth/          # NextAuth API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   └── examples/          # Todo CRUD components
├── lib/
│   ├── auth/              # NextAuth configuration
│   ├── i18n/              # Internationalization config
│   └── prisma.ts          # Prisma client singleton
├── server_actions/
│   └── todos.ts           # Todo CRUD server actions
├── prisma/
│   └── schema.prisma      # Database schema (or lib/db/schema.prisma)
├── messages/              # Translation files
│   ├── en.json            # English translations
│   ├── el.json            # Greek translations
│   └── es.json            # Spanish translations
└── types/                 # TypeScript definitions
```

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm tsc --noEmit # Type check

# Prisma commands
pnpm prisma generate     # Generate Prisma Client
pnpm prisma db push      # Push schema changes to database
pnpm prisma db pull      # Pull schema from database
pnpm prisma migrate dev  # Create and apply migrations (development)
pnpm prisma migrate deploy # Apply migrations (production)
pnpm prisma studio       # Open Prisma Studio GUI
```

## Deployment

### Database Migration

For production deployments, use migrations instead of `db push`:

```bash
# Create a migration
pnpm prisma migrate dev --name init

# Deploy migrations in production
pnpm prisma migrate deploy
```

### Environment Variables

Make sure to set all required environment variables in your deployment platform:

- `DATABASE_URL` - Production database connection string (pooled connection)
- `DIRECT_URL` - Direct database connection string (non-pooled, for migrations)
- `NEXTAUTH_SECRET` - Strong secret key (different from development)
- `NEXTAUTH_URL` - Your production URL
- `GOOGLE_CLIENT_ID` - Same as development or production-specific
- `GOOGLE_CLIENT_SECRET` - Same as development or production-specific

Note: For services like Supabase or PlanetScale, `DATABASE_URL` is typically the pooled connection URL, while `DIRECT_URL` is the direct connection URL used for migrations.

### Deployment Platforms

This app can be deployed to:
- [Vercel](https://vercel.com) - Recommended for Next.js apps
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- Any platform supporting Node.js

## Troubleshooting

### Database Connection Issues

If you encounter connection issues:

1. Verify your `DATABASE_URL` is correct
2. Ensure PostgreSQL is running
3. Check firewall/network settings
4. For SSL connections, add `?sslmode=require` to the connection string

### Prisma Client Generation

If TypeScript can't find Prisma types:

```bash
pnpm prisma generate
```

### Google OAuth Issues

- Ensure redirect URIs match exactly (including trailing slashes)
- Check that your Google Cloud project has the necessary APIs enabled
- Verify client ID and secret are correct

## License

MIT

## Contributing

Pull requests are welcome! Please check existing issues before submitting new ones.