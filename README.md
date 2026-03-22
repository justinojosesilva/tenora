# Tenora

Plataforma SaaS de gestão completa para imobiliárias — financeiro, contratos, cobranças e repasses em um único sistema.

## Setup em 5 comandos

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/seu-org/tenora.git && cd tenora && pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir o banco de dados e Redis
docker compose up -d

# 4. Criar o banco e rodar as migrations
pnpm db:migrate

# 5. Iniciar o ambiente de desenvolvimento
pnpm dev
```

Pronto. Acesse:

| Serviço    | URL                         |
|------------|-----------------------------|
| Web        | http://localhost:3000       |
| API        | http://localhost:3001       |
| Health     | http://localhost:3001/health|
| Bull Board | http://localhost:3002       |
| DB Studio  | `pnpm db:studio` → :5555    |

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar         |
|------------|---------------|-------------------|
| Node.js    | 20+           | `node --version`  |
| pnpm       | 8+            | `pnpm --version`  |
| Docker     | 24+           | `docker --version`|

---

## Estrutura do projeto

```
tenora/
├── apps/
│   ├── web/          # Next.js 14 — frontend
│   └── api/          # Fastify + tRPC — backend
├── packages/
│   ├── db/           # Prisma schema + client com RLS
│   ├── trpc/         # Contexto e middlewares tRPC
│   ├── queues/       # Registry de filas BullMQ
│   └── validators/   # Schemas Zod compartilhados
├── infra/
│   └── docker-compose.yml
├── .env.example
└── turbo.json
```

---

## Variáveis de ambiente obrigatórias

Abra o `.env` e preencha pelo menos estas antes de rodar:

```bash
DATABASE_URL        # ex: postgresql://tenora_app:senha@localhost:5432/tenora_dev
REDIS_HOST          # localhost em desenvolvimento
CLERK_SECRET_KEY    # sk_test_... — obtenha em clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # pk_test_...
```

Consulte o `.env.example` para a lista completa com instruções de cada variável.

---

## Comandos úteis

```bash
# Desenvolvimento
pnpm dev              # sobe web + api em paralelo com hot reload
pnpm build            # build de produção (incremental via Turborepo)
pnpm lint             # lint em todos os pacotes
pnpm type-check       # type-check TypeScript

# Banco de dados
pnpm db:migrate       # aplica migrations pendentes
pnpm db:generate      # regenera o Prisma client após alterar o schema
pnpm db:seed          # popula com dados de desenvolvimento
pnpm db:studio        # abre o Prisma Studio no browser
pnpm db:reset         # apaga e recria o banco do zero

# Docker
docker compose up -d      # sobe os serviços em background
docker compose down       # para os serviços (dados preservados)
docker compose down -v    # para e apaga os dados (reset total)
docker compose ps         # verifica o status dos containers
```

---

## Arquitetura

```
Browser → Next.js middleware (Clerk auth)
        → Server Component → tRPC client
        → Fastify (tRPC server) → Prisma + RLS
        → PostgreSQL (dados isolados por tenant)

Eventos assíncronos:
  Webhook Pluggy → bank:sync queue (BullMQ/Redis)
                 → Worker → motor de split
                 → notification:send queue
```

**Multi-tenant:** cada imobiliária é um tenant isolado via Row-Level Security no PostgreSQL. Nunca use `db` diretamente — sempre `prismaWithTenant(tenantId)`.

---

## Stack

| Camada       | Tecnologia                              |
|--------------|-----------------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind CSS    |
| Backend      | Fastify, tRPC, Node.js                  |
| Banco        | PostgreSQL 16 + Prisma ORM + RLS        |
| Filas        | BullMQ + Redis 7                        |
| Auth         | Clerk (multi-tenant, RBAC)              |
| Billing      | Stripe                                  |
| Open Finance | Pluggy                                  |
| Pagamentos   | Asaas (PIX + Boleto)                    |
| Monorepo     | Turborepo + pnpm workspaces             |
| CI/CD        | GitHub Actions → Vercel + Railway       |

---

## Contribuindo

1. Crie uma branch a partir de `develop`: `git checkout -b feat/nome-da-feature`
2. Commits seguem [Conventional Commits](https://www.conventionalcommits.org/)
3. Abra um PR para `develop` — o CI valida lint, tipos e testes automaticamente
4. Merge em `main` dispara deploy para produção com aprovação manual

---

## Licença

Proprietário — Tenora © 2026. Todos os direitos reservados.