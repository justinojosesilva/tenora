# Sprint 1 — Auth, Monorepo & Tenant

**Semanas 4–5 · 20 tasks · 42 story points**

---

## Resumo

| Área                           | Tasks | Points | Status          |
| ------------------------------ | ----- | ------ | --------------- |
| Infra & Monorepo               | 5     | 10 pts | ✅ Concluída    |
| Banco de Dados & Multi-tenant  | 5     | 11 pts | 🔄 Em andamento |
| Auth, RBAC & tRPC              | 7     | 15 pts | 🔄 Em andamento |
| Filas BullMQ & Observabilidade | 3     | 6 pts  | ⬜ A iniciar    |

**Definição de "pronto":** todas as 20 tasks concluídas + testes passando no CI + deploy funcionando em staging + beta tester consegue fazer login, ver o dashboard vazio e a sidebar completa de navegação.

**Bloqueadores externos** (iniciar antes do Sprint 1):

- Credenciamento PSP (Asaas/Pagar.me)
- Contratação do 2º dev backend
- Sandbox Pluggy testado com bancos dos beta testers

---

## Área 1 — Infra & Monorepo

### T-01 · Configurar monorepo com Turborepo + pnpm workspaces

**Responsável:** Tech Lead · **Story Points:** 3 · **Tipo:** setup · **Semana:** 4 · **Status:** ✅ Done

**Critérios de aceite:**

- `pnpm dev` na raiz sobe web e api em paralelo com hot reload
- Build incremental: alterar `packages/db` rebuilda apenas os apps dependentes
- Scripts `turbo build`, `turbo test` e `turbo lint` funcionando
- Estrutura de diretórios: `apps/web`, `apps/api`, `packages/db`, `packages/trpc`, `packages/queues`, `packages/validators`

---

### T-02 · Configurar Docker Compose para ambiente de desenvolvimento

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** setup · **Semana:** 4 · **Dependências:** T-01 · **Status:** ✅ Done

**Critérios de aceite:**

- `docker compose up` sobe PostgreSQL 16, Redis 7 e Bull Board
- Volume persistente para PostgreSQL (`pgdata`)
- Bull Board acessível em `localhost:3002`
- `.env.example` documentado com todas as variáveis necessárias
- README com instruções de setup em menos de 5 comandos

---

### T-03 · Configurar GitHub Actions — CI com lint, type-check e testes

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** ci/cd · **Semana:** 4 · **Dependências:** T-01 · **Status:** ✅ Done

**Critérios de aceite:**

- Pipeline roda em todo PR para `main` e `develop`
- Steps: lint (ESLint) → type-check (tsc) → testes (vitest) → build
- Cache de dependências pnpm e Turborepo configurado (builds 3× mais rápidos)
- PR bloqueado se pipeline falhar
- Tempo total do pipeline abaixo de 3 minutos

**Histórico de bloqueios resolvidos:**

1. ESLint 9 sem flat config → criado `eslint.config.js` em `apps/api` e `apps/web`
2. `jiti` não instalado → mantido `eslint.config.js` como `.js` puro
3. `apps/api` sem `tsconfig.json` → criado herdando `typescript-config/base.json`
4. 8 erros de type-check → módulos faltando, typo `registerWebSocket` → `registerWebhooks`, `PropertyCreateSchema` não exportado
5. TS2742 tipo não portável no tRPC → anotação explícita `TRPCRouter` em todos os routers
6. `--passWithNoTests` faltando em `apps/api` e `apps/web` + `rls.test.ts` vazio
7. JSON parse error no vitest → criado `packages/db/tsconfig.json` e `vitest.config.ts`

---

### T-04 · Configurar deploy automático para staging — Vercel (web) + Railway (api)

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** ci/cd · **Semana:** 4 · **Dependências:** T-03 · **Status:** ✅ Done (com ressalvas)

**Critérios de aceite:**

- Merge em `develop` dispara deploy automático para staging
- Merge em `main` dispara deploy para produção (com aprovação manual)
- Preview deploys por PR no Vercel
- Variáveis de ambiente configuradas por ambiente (dev / staging / prod)
- URL de staging funcional e compartilhada com beta testers

**Entregues:**

- ✅ Vercel funcionando — https://tenora-web-kappa.vercel.app/
- ✅ Dockerfile funcional validado localmente (`pnpm deploy` + `cp -rL`)
- ✅ Workflow `deploy.yml` configurado no GitHub Actions
- ✅ Environments staging e production configurados no GitHub

**Ressalva — Railway descartado:**
Após 12 bloqueios (Railpack ignorando pnpm, symlinks no Docker, npx baixando Prisma v7, etc.), Railway foi descartado. Avaliar alternativas antes do Sprint 2:

- **Render.com** — 750h/mês gratuito, suporte nativo a Docker ⭐ Recomendado
- **Fly.io** — plano gratuito generoso, deploy via Dockerfile
- **Google Cloud Run** — 2M requisições/mês gratuitas, escala para zero
- **Koyeb** — suporte nativo a pnpm monorepo, 2 instâncias gratuitas

---

### T-05 · Configurar ESLint, Prettier e Husky com pre-commit hooks

**Responsável:** Tech Lead · **Story Points:** 1 · **Tipo:** setup · **Semana:** 4 · **Dependências:** T-01 · **Status:** 🔄 In Progress

**Critérios de aceite:**

- Config compartilhada em `packages/config-eslint` e `packages/config-prettier`
- Pre-commit roda lint-staged apenas nos arquivos alterados
- Commit bloqueado se houver erros de lint ou formatação
- VSCode settings recomendados no `.vscode/settings.json`

---

## Área 2 — Banco de Dados & Multi-tenant

### T-06 · Criar schema Prisma base — tenants, users e estrutura de auditoria

**Responsável:** Tech Lead · **Story Points:** 3 · **Tipo:** backend · **Semana:** 4 · **Dependências:** T-02 · **Status:** 🔄 In Progress

**Critérios de aceite:**

- Models: `Tenant`, `User`, `UserRole` com todos os campos definidos no modelo de dados
- Toda model com `tenantId` como FK obrigatória (exceto `Tenant`)
- Campos de auditoria em toda model: `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- Migration inicial gerada e aplicada no banco de dev
- `packages/db/index.ts` exportando o Prisma client tipado

---

### T-07 · Implementar Row-Level Security (RLS) no PostgreSQL + middleware Prisma

**Responsável:** Tech Lead · **Story Points:** 3 · **Tipo:** segurança · **Semana:** 4 · **Dependências:** T-06 · **Status:** 🔄 In Progress

**Critérios de aceite:**

- Policies RLS criadas para todas as tabelas com `tenantId`
- Policy usa `current_setting('app.tenant_id')` para filtrar rows
- Middleware Prisma injeta `SET LOCAL app.tenant_id = '...'` antes de cada query
- Teste de isolamento: query com `tenant_id = A` nunca retorna dados do tenant B
- Função `prismaWithTenant(tenantId)` exportada e tipada em `packages/db`

**Nota técnica:** Coluna `tenant_id` é `TEXT` no Prisma gerado. A função `current_tenant_id()` deve retornar `TEXT` (não `uuid`) para evitar erro de operador no PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;
```

---

### T-08 · Criar seed de desenvolvimento com dados realistas de imobiliária

**Responsável:** Backend Dev · **Story Points:** 2 · **Tipo:** backend · **Semana:** 5 · **Dependências:** T-06 · **Status:** ⬜ Todo

**Critérios de aceite:**

- `pnpm db:seed` popula o banco com 2 tenants de teste
- Tenant 1: "Imobiliária Central" com 10 imóveis, 8 contratos, 3 usuários
- Tenant 2: "Gestora Silva" com 5 imóveis, 4 contratos, 2 usuários
- Dados isolados — query de um tenant nunca retorna dados do outro
- Script idempotente: rodar duas vezes não cria duplicatas

---

### T-09 · Escrever testes de integração para isolamento de tenant (RLS)

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** teste · **Semana:** 5 · **Dependências:** T-07, T-08 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Teste: usuário do tenant A tentando acessar dados do tenant B recebe array vazio (não erro 403)
- Teste: query sem `tenant_id` no contexto lança erro antes de chegar ao banco
- Teste: `CREATE`, `UPDATE` e `DELETE` respeitam o isolamento
- Testes rodam em banco de teste isolado (não dev)
- Coverage do módulo de RLS acima de 80%

**Esqueleto já criado em** `packages/db/src/__tests__/rls.test.ts` com `it.todo()`.

---

### T-10 · Configurar estratégia de migrations — ambientes dev, staging e prod

**Responsável:** Tech Lead · **Story Points:** 1 · **Tipo:** setup · **Semana:** 5 · **Dependências:** T-04, T-06 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Deploy para staging roda `prisma migrate deploy` automaticamente
- Deploy para prod requer aprovação manual antes de rodar migrations
- Rollback documentado: como reverter uma migration problemática
- Alertas configurados se migration falhar em produção

---

## Área 3 — Auth, RBAC & tRPC

### T-11 · Integrar Clerk — login, magic link, OAuth Google e webhook de sincronização

**Responsável:** Backend Dev · **Story Points:** 3 · **Tipo:** auth · **Semana:** 4 · **Dependências:** T-06 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Login via email/senha, magic link e Google OAuth funcionando
- Webhook Clerk sincroniza `user.created` e `user.updated` com a tabela `users` do banco
- Sessão persistida via Clerk session token (não JWT próprio)
- Middleware Next.js protege todas as rotas `/(dashboard)/**`
- Redirecionamento correto: usuário não autenticado → `/login`, autenticado sem org → `/onboarding`

---

### T-12 · Implementar tenant resolver — extrair orgId do Clerk e injetar no contexto

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** auth · **Semana:** 4 · **Dependências:** T-07, T-11 · **Status:** ⬜ Todo

**Critérios de aceite:**

- `orgId` do Clerk mapeado para `tenantId` no banco via tabela `tenants`
- Contexto tRPC: `ctx.tenantId`, `ctx.user`, `ctx.db` disponíveis em todo procedimento
- Request sem `orgId` válido retorna erro 401 antes de chegar ao procedimento
- Tenant inativo (`status = suspended`) retorna erro 403 com mensagem clara

---

### T-13 · Implementar RBAC — roles admin, financeiro, operacional e visualizador

**Responsável:** Backend Dev · **Story Points:** 3 · **Tipo:** auth · **Semana:** 5 · **Dependências:** T-12 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Enum de roles: `ADMIN`, `FINANCEIRO`, `OPERACIONAL`, `VISUALIZADOR`
- Middleware tRPC `requireRole(...roles)` protege procedimentos sensíveis
- Matriz de permissões documentada: quem pode criar/editar/excluir em cada módulo
- Teste: role `VISUALIZADOR` tentando criar imóvel recebe erro 403
- Role padrão para novo usuário convidado: `VISUALIZADOR`

---

### T-14 · Configurar servidor tRPC (Fastify) com contexto, middlewares e health check

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** backend · **Semana:** 4 · **Dependências:** T-12 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Servidor Fastify com adapter tRPC funcionando em `localhost:3001`
- `GET /health` retorna `{status: 'ok', db: 'connected', redis: 'connected'}`
- Logger estruturado (pino) em todos os requests com `tenantId` e `userId`
- CORS configurado para aceitar apenas origens permitidas
- Rate limiting básico: 100 req/min por IP em rotas públicas

---

### T-15 · Implementar fluxo de convite de usuários por email

**Responsável:** Backend Dev · **Story Points:** 2 · **Tipo:** auth · **Semana:** 5 · **Dependências:** T-13 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Admin convida usuário por email com role definida no convite
- Link de convite expira em 7 dias
- Usuário convidado ao aceitar é automaticamente vinculado ao tenant e role
- Convite já aceito ou expirado mostra mensagem de erro clara
- Admin pode cancelar convite pendente

---

### T-16 · Criar tela de login e onboarding inicial (cadastro da imobiliária)

**Responsável:** Frontend Dev · **Story Points:** 2 · **Tipo:** frontend · **Semana:** 5 · **Dependências:** T-11 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Tela de login com email/senha, magic link e botão Google — identidade visual Tenora
- Fluxo de onboarding: nome da imobiliária → CNPJ → número de imóveis → confirmar
- Validação de CNPJ em tempo real (formato e dígito verificador)
- Após onboarding: redirect para dashboard com mensagem de boas-vindas
- Responsivo — funciona em mobile sem sidebar

---

### T-17 · Criar layout base do dashboard — sidebar, topbar e sistema de navegação

**Responsável:** Frontend Dev · **Story Points:** 1 · **Tipo:** frontend · **Semana:** 5 · **Dependências:** T-16 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Sidebar roxa com todos os itens de navegação agrupados por seção
- Item ativo destacado visualmente
- Sidebar colapsável em telas menores (menu hamburguer)
- Topbar com seletor de período e área para badges de alerta
- Avatar + nome da imobiliária no rodapé da sidebar
- Skeleton loading no conteúdo principal enquanto dados carregam

---

## Área 4 — Filas BullMQ & Observabilidade

### T-18 · Configurar BullMQ — registry de filas, conexão Redis e Bull Board

**Responsável:** Backend Dev · **Story Points:** 2 · **Tipo:** infra · **Semana:** 5 · **Dependências:** T-02, T-14 · **Status:** ⬜ Todo

**Critérios de aceite:**

- 4 filas criadas: `bank:sync`, `billing:generate`, `financial:repasse`, `notification:send`
- Configuração de retry: 3 tentativas com backoff exponencial (1s, 5s, 30s)
- Dead Letter Queue configurada para jobs que falham após 3 tentativas
- Bull Board mostrando todas as filas em `localhost:3002`
- `packages/queues/index.ts` exportando nomes e tipos das filas

---

### T-19 · Configurar Sentry (erros) e PostHog (analytics de produto)

**Responsável:** Tech Lead · **Story Points:** 2 · **Tipo:** observabilidade · **Semana:** 5 · **Dependências:** T-04 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Sentry capturando erros de runtime em web e api com stack trace completo
- Erros enriquecidos com `tenantId`, `userId` e ambiente
- PostHog identificando usuário após login (sem PII exposto)
- Eventos básicos rastreados: `login`, `onboarding_completed`, `page_view`
- Alertas Sentry configurados para erros críticos (500, falhas de job)

---

### T-20 · Escrever testes de smoke E2E — login → onboarding → dashboard

**Responsável:** Tech Lead + Frontend · **Story Points:** 2 · **Tipo:** teste · **Semana:** 5 · **Dependências:** T-17, T-11 · **Status:** ⬜ Todo

**Critérios de aceite:**

- Teste E2E com Playwright: usuário novo → login → onboarding → chega no dashboard
- Teste de isolamento: login como tenant A não vê dados do tenant B
- Testes rodam no pipeline de CI contra o ambiente de staging
- Screenshot on failure para debug facilitado

---

## Decisão pendente antes do Sprint 2

### Plataforma de deploy do backend (Railway descartado)

| Plataforma       | Gratuidade             | Docker | Monorepo pnpm | Recomendação   |
| ---------------- | ---------------------- | ------ | ------------- | -------------- |
| **Render.com**   | 750h/mês sem limite    | ✅     | ✅            | ⭐ MVP         |
| Fly.io           | Generoso, sem limite   | ✅     | ✅            | ✅ Alternativa |
| Google Cloud Run | 2M req/mês             | ✅     | ✅            | 🔜 Fase 3+     |
| Koyeb            | 2 instâncias gratuitas | ✅     | ✅ Nativo     | ✅ Alternativa |

**Próximo passo:** testar o Render com o Dockerfile atual antes do início do Sprint 2.

---

_Gerado em 23/03/2026 · Tenora v2.0_
