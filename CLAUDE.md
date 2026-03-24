# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start all apps in parallel (web :3000, api :3001)
pnpm build            # Incremental build via Turborepo
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check across all packages
pnpm test             # Run tests across all packages
pnpm format           # Prettier formatting

# Database
pnpm db:migrate       # Run Prisma migrations
pnpm db:generate      # Regenerate Prisma client
pnpm db:studio        # Prisma Studio at :5555
pnpm db:seed          # Seed the database
pnpm db:reset         # Reset and re-run all migrations (destructive)

# Individual app
pnpm --filter @tenora/api dev
pnpm --filter @tenora/web dev
pnpm --filter @tenora/api test  # Vitest

# Docker (local infra: Postgres 16, Redis 7, Bull Board :3002)
docker compose up -d
```

## Architecture

### Monorepo Structure

- **`apps/api`** — Fastify 5 + tRPC 11 backend. Entry: `src/server.ts`. Built with tsup to a single ESM bundle.
- **`apps/web`** — Next.js 14 + React 19 frontend.
- **`packages/db`** — Prisma ORM client and Row-Level Security utilities. Exports `db` (root) and `prismaWithTenant(tenantId)`.
- **`packages/trpc`** — tRPC router factory, context creation, and middleware (`isAuthed`, `requireRole`). Exports `publicProcedure`, `protectedProcedure`, `adminProcedure`.
- **`packages/validators`** — Shared Zod schemas used by both API and web.
- **`packages/queues`** — BullMQ queue definitions for async jobs.

### Multi-Tenancy (Critical)

The app uses PostgreSQL Row-Level Security for tenant isolation:

- Every request sets `app.tenant_id` via a Prisma extension in `packages/db/src/rls.ts`.
- Use `prismaWithTenant(tenantId)` for all tenant-scoped queries — never use the root `db` directly in application code.
- `safeDb` proxy blocks accidental direct model access without tenant context.
- `tenantId` comes from Clerk's `orgId` (organization ID), extracted in `packages/trpc/src/context.ts`.

### Authentication & Authorization

- Auth is handled by Clerk. The tRPC context (`packages/trpc/src/context.ts`) extracts `userId` and `orgId` from the JWT via Fastify's Clerk plugin.
- **Roles**: `admin`, `financeiro`, `operacional`, `visualizador` — enforced via `requireRole()` middleware.
- Use `protectedProcedure` for all authenticated routes; `adminProcedure` for admin-only routes.

### Adding a New tRPC Router

1. Create `apps/api/src/routers/<name>.router.ts` using `protectedProcedure` from `@tenora/trpc`.
2. Register it in `apps/api/src/routers/_app.router.ts`.
3. Add input validation with a Zod schema (define in `packages/validators/` if shared with the web).

### Database Schema

Domain models in `packages/db/prisma/schema.prisma`:

- **Tenant** → **User** (employees), **Owner** (property owners), **Property**, **Lease**
- **Lease** → **BillingCharge** (cobranças), **TransactionSplit**
- **BankConnection** / **BankAccount** → **Transaction** (synced via Pluggy)
- Financial: `Transaction`, `TransactionSplit`, `BillingCharge`, `Category`
- Operations: `MaintenanceOrder`

### Environment Variables

Two database URLs are required (RLS design):

- `DATABASE_URL` — app user (subject to RLS)
- `DATABASE_URL_MIGRATOR` — migrator user with `BYPASSRLS` (used only by Prisma migrations)
- `DATABASE_SHADOW_URL` — shadow DB for migration validation
- Clerk: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- External integrations: Stripe, Pluggy, Asaas keys

### Deployment

- API builds to `dist/server.js` (single ESM bundle). The root `Dockerfile` is a multi-stage build targeting the API for Railway.
- Web deploys to Vercel.
