import { describe, it } from 'vitest'

describe('RLS — isolamento de tenant', () => {
  it.todo('tenant A só vê seus próprios imóveis')
  it.todo('tenant B não vê dados do tenant A')
  it.todo('insert com tenantId errado é bloqueado')
  it.todo('update de registro de outro tenant não afeta nenhuma linha')
  it.todo('delete de registro de outro tenant não afeta nenhuma linha')
})
