## 📋 Descrição

<!-- Descreva brevemente as mudanças nesta PR -->

## 🎯 Tipo

- [ ] ✨ Feature
- [ ] 🐛 Bug fix
- [ ] 📚 Documentation
- [ ] ♻️ Refactoring
- [ ] 🔧 Chore
- [ ] ⚡ Performance
- [ ] 🧪 Test

## ✅ Checklist Pré-Merge

### Dependências e Build

- [ ] **pnpm-lock.yaml sincronizado** — `pnpm check:deps` passou sem erros
- [ ] **Sem warnings no linter** — `pnpm lint` retornou 0 warnings/errors
- [ ] **Build passou** — `pnpm build` completou sem erros
- [ ] **Type-check passou** — `pnpm type-check` sem erros TypeScript

### Testes

- [ ] **Testes unitários passando** — `pnpm test`
- [ ] **Testes de integração passando** (se aplicável) — `pnpm --filter @tenora/db test`
- [ ] **Novos testes adicionados** (se necessário)
- [ ] **Cobertura de testes mantida** (não regressão)

### Database

- [ ] **Sem migrações novas** OU **migrations aplicadas localmente** — `pnpm db:migrate` funcionou
- [ ] **Schema.prisma atualizado** (se houve alterações)
- [ ] **Sem breaking changes** em queries existentes

### Documentação

- [ ] **README atualizado** (se mudar comportamento público)
- [ ] **CLAUDE.md atualizado** (se mudar arquitetura/setup)
- [ ] **Notion task atualizado** — status "Concluído" + resumo técnico

### Qualidade

- [ ] **Sem `console.log` ou debug statements** deixados acidentalmente
- [ ] **Imports organizados** — sem circular dependencies
- [ ] **Commits atomicamente bem estruturados**
- [ ] **Nenhuma mudança desnecessária** (whitespace, formatting desnecessário)

## 🔗 Links Relacionados

- Notion task: <!-- link para a task -->
- Related PR: <!-- se houver -->
- Issue: <!-- se houver -->

## 🚀 Como Testar

<!-- Instruções passo-a-passo para validar as mudanças -->
