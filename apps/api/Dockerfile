FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Dependências ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copia apenas os arquivos necessários para instalar dependências
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/trpc/package.json ./packages/trpc/
COPY packages/queues/package.json ./packages/queues/
COPY packages/validators/package.json ./packages/validators/

RUN pnpm install --frozen-lockfile --prod=false

# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copia o código fonte
COPY apps/api ./apps/api
COPY packages ./packages

# Gera o Prisma client e faz o build da API
RUN pnpm --filter @tenora/db db:generate
RUN pnpm --filter @tenora/api build

# ── Produção ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production

# Copia só o necessário para rodar
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/trpc/package.json ./packages/trpc/
COPY --from=builder /app/packages/queues/package.json ./packages/queues/
COPY --from=builder /app/packages/validators/package.json ./packages/validators/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]