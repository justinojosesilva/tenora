FROM node:20-bullseye AS base
RUN npm install -g pnpm@9

# ── Dependencies ─────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/trpc/package.json ./packages/trpc/
COPY packages/queues/package.json ./packages/queues/
COPY packages/validators/package.json ./packages/validators/

RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm --filter @tenora/db db:generate
RUN pnpm -r build
RUN pnpm --filter @tenora/api deploy --prod /app/deploy

# ── Runner ───────────────────────────────────────────────
FROM node:20-bullseye AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=builder /app/deploy ./
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY scripts/entrypoint.sh ./entrypoint.sh

RUN npm install -g prisma@5.22.0 && \
    prisma generate --schema=./packages/db/prisma/schema.prisma

RUN chmod +x ./entrypoint.sh && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001
CMD ["./entrypoint.sh"]