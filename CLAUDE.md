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
pnpm db:migrate       # Run Prisma migrations (dev, requires TTY)
pnpm db:generate      # Regenerate Prisma client
pnpm db:studio        # Prisma Studio at :5555
pnpm db:seed          # Seed the database
pnpm db:reset         # Reset and re-run all migrations (destructive)

# Individual app/package
pnpm --filter @tenora/api dev
pnpm --filter @tenora/web dev
pnpm --filter @tenora/api test   # Vitest (unit)
pnpm --filter @tenora/db test    # Vitest (RLS integration — requires Postgres)

# Docker (local infra: Postgres 16 :5432, Redis 7 :6379, Bull Board :3002)
docker compose up -d
```

## Architecture

### Monorepo Structure

- **`apps/api`** — Fastify 5 + tRPC 11 backend. Entry: `src/server.ts`. Built with tsup to a single ESM bundle. Deploys to **Render**.
- **`apps/web`** — Next.js 16 + React 19 frontend. Deploys to **Vercel**.
- **`packages/db`** — Prisma ORM client and Row-Level Security utilities. Exports `db` (root) and `prismaWithTenant(tenantId)`.
- **`packages/trpc`** — tRPC router factory, context creation, and middleware (`isAuthed`, `requireRole`). Exports `publicProcedure`, `protectedProcedure`, `adminProcedure`.
- **`packages/validators`** — Shared Zod schemas used by both API and web.
- **`packages/queues`** — BullMQ queue definitions and job data types for async jobs.

### TypeScript Import Rules (Critical)

All packages use `"module": "ESNext"` and `"moduleResolution": "Bundler"` — **never use `NodeNext`**. This is required because Next.js/Turbopack reads TypeScript source directly and cannot resolve `.js → .ts` mappings.

- **Never add `.js` extensions** to relative imports in TypeScript source files.
- **Never use `export * from '@prisma/client'`** (CJS barrel re-export) — Turbopack cannot statically analyze it. Use explicit named `export type { ... }` instead.
- This applies to all packages: `db`, `trpc`, `validators`, `queues`, and `apps/api`.

### Multi-Tenancy (Critical)

The app uses PostgreSQL Row-Level Security for tenant isolation:

- Every request sets `app.tenant_id` via a Prisma extension in `packages/db/src/rls.ts`.
- Use `prismaWithTenant(tenantId)` for **all** tenant-scoped queries — never use the root `db` directly in application code.
- `safeDb` proxy blocks accidental direct model access without tenant context.
- `tenantId` comes from Clerk's `orgId` (organization ID), extracted in `packages/trpc/src/context.ts`.
- Two DB users: `tenora_app` (RLS enforced, used at runtime) and `tenora_migrator` (`BYPASSRLS`, used only by Prisma migrations).

### Authentication & Authorization

- Auth is handled by Clerk. The tRPC context (`packages/trpc/src/context.ts`) extracts `userId` and `orgId` from the JWT via Fastify's Clerk plugin (`@clerk/fastify`).
- Context factory validates tenant status (`active`) before returning context.
- **Roles**: `admin`, `financeiro`, `operacional`, `visualizador` — stored in Clerk session metadata, enforced via `requireRole()` middleware.
- Use `protectedProcedure` for all authenticated routes; `adminProcedure` for admin-only routes.

### Adding a New tRPC Router

1. Create `apps/api/src/routers/<name>.router.ts` using `protectedProcedure` from `@tenora/trpc`.
2. Register it in `apps/api/src/routers/_app.router.ts`.
3. Add input validation with a Zod schema (define in `packages/validators/` if shared with the web).

### Registered tRPC Routers

| Key          | File                   | Purpose                                                       |
| ------------ | ---------------------- | ------------------------------------------------------------- |
| `property`   | `property.router.ts`   | CRUD de imóveis + busca/filtro por status, tipo, proprietário |
| `owner`      | `owner.router.ts`      | CRUD de proprietários                                         |
| `document`   | `document.router.ts`   | Upload/download de documentos de imóvel (Cloudflare R2)       |
| `users`      | `users.router.ts`      | Gestão de membros do tenant (admin only)                      |
| `onboarding` | `onboarding.router.ts` | Wizard pós-cadastro (vinculação bancária, dados iniciais)     |

### Database Schema

Domain models in `packages/db/prisma/schema.prisma`:

- **Tenant** → **User** (funcionários), **Owner** (proprietários), **Property**, **Lease**
- **Property** → **PropertyDocument** (arquivos no R2/S3)
- **Lease** → **BillingCharge** (cobranças), **TransactionSplit**
- **BankAccount** → **BankConnection** (Pluggy) → **Transaction** (sincronização bancária)
- Financial: `Transaction`, `TransactionSplit`, `BillingCharge`, `Category`
- Operations: `MaintenanceOrder`

The datasource block uses three URLs:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")           # tenora_app (RLS enforced)
  directUrl         = env("DATABASE_URL_MIGRATOR")  # tenora_migrator (BYPASSRLS)
  shadowDatabaseUrl = env("DATABASE_SHADOW_URL")    # shadow DB for prisma migrate dev
}
```

### Async Job Queues (BullMQ)

Queues defined in `packages/queues/src/`. All queues use Redis. 3-attempt retry with backoff (1s, 5s, 30s). Failed jobs move to `dlq` queue after 3 failures.

| Queue               | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `bank-sync`         | Sincronização de transações via Pluggy                           |
| `billing-generate`  | Geração de cobranças de aluguel                                  |
| `financial-repasse` | Cálculo de repasse ao proprietário                               |
| `notification-send` | Envio de e-mails via Resend                                      |
| `dlq`               | Dead Letter Queue — jobs com falha repetida para inspeção manual |

Bull Board dashboard acessível em `/admin/queues` (requer `role === admin`, protegido via Fastify `preHandler` no escopo do plugin).

### Environment Variables

Two database URLs are required (RLS design):

- `DATABASE_URL` — app user (subject to RLS)
- `DATABASE_URL_MIGRATOR` — migrator user with `BYPASSRLS` (used only by Prisma migrations)
- `DATABASE_SHADOW_URL` — shadow DB for migration validation (`prisma migrate dev` only)
- `API_PORT`, `API_HOST`, `API_URL` — Fastify server config
- `NEXT_PUBLIC_API_URL` — Frontend → API URL
- Clerk: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (ou `REDIS_URL`)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`
- Pluggy: `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ENV`, `PLUGGY_WEBHOOK_SECRET`
- Asaas: `ASAAS_API_KEY`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN`
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`
- Observability: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`
- Storage (R2): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Deployment

- API builds to `dist/server.js` (single ESM bundle via tsup). The root `Dockerfile` is a multi-stage build targeting the API for **Render**.
- Web deploys to **Vercel**.
- Migrations: `prisma migrate deploy` runs automatically on push to `main` (GitHub Actions `deploy.yml`) for staging. Production requires manual approval via GitHub environment protection.

### Observability

- **Sentry** — error tracking on both API and web. `beforeSend` on the web client filters out browser extension errors (frames from `chrome-extension://`, `moz-extension://`, or `<anonymous>`).
- **PostHog** — product analytics. Key events tracked: `login` (null→string userId transition via `useRef`), `onboarding_completed`, `property_created`.
- **Bull Board** — queue monitoring at `/admin/queues`.
- **`/health`** — endpoint that tests DB + Redis connectivity.

### CI/CD (GitHub Actions)

**`ci.yml`** — runs on every push/PR:

1. **ci** job: lint → type-check → test (excl. DB) → build
2. **test** job: DB integration tests with Postgres service container (RLS isolation)
3. **e2e** job: Playwright smoke tests (only if `E2E_BASE_URL` configured)

**`deploy.yml`** — runs on push to `main`:

1. **migrate-staging** + deploy to Render (auto)
2. **migrate-prod** + deploy to production (requires manual approval)
