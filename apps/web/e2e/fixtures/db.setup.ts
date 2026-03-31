/**
 * Playwright setup fixture: seed de dados E2E via factory
 *
 * Cria dados de teste isolados no banco antes dos smoke tests rodarem.
 * Requer as variáveis de ambiente:
 *   DATABASE_URL     — URL do banco (tenora_app, com RLS)
 *   E2E_TENANT_A_ID  — ID do tenant A no banco (obtido da conta Clerk)
 *   E2E_TENANT_B_ID  — (opcional) ID do tenant B para testes de isolamento
 *
 * Os IDs dos recursos criados são gravados em e2e/.e2e-data.json e
 * limpos pelo teardown global (db.teardown.ts).
 */
import { test as setup } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { prismaWithTenant } from '@tenora/db'
import { E2E_DATA_FILE } from './e2e-data.paths'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function randomCpfCnpj(): string {
  const d = () => Math.floor(Math.random() * 9 + 1)
  return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`
}

async function seedTenantProperty(tenantId: string): Promise<string> {
  const rls = prismaWithTenant(tenantId)

  const owner = await rls.owner.create({
    data: {
      tenantId,
      name: `E2E Owner ${uid()}`,
      cpfCnpj: randomCpfCnpj(),
      email: `e2e-owner-${uid()}@test.com`,
    },
  })

  const property = await rls.property.create({
    data: {
      tenantId,
      ownerId: owner.id,
      address: `Rua E2E ${uid()}, 100`,
      city: 'São Paulo',
      state: 'SP',
      type: 'residential',
      status: 'available',
      adminFeePct: 10,
      rentAmount: 1500,
    },
  })

  return property.id
}

setup('seed E2E test data', async () => {
  const tenantAId = process.env.E2E_TENANT_A_ID
  const tenantBId = process.env.E2E_TENANT_B_ID

  if (!tenantAId) {
    console.log(
      '[db.setup] E2E_TENANT_A_ID não definido — pulando seed. ' +
        'O teste 03-lease-flow usará dados existentes no staging.',
    )
    writeFileSync(E2E_DATA_FILE, JSON.stringify({}))
    return
  }

  const createdTenantIds: string[] = []
  const propertyIds: Record<string, string> = {}

  propertyIds['A'] = await seedTenantProperty(tenantAId)
  createdTenantIds.push(tenantAId)
  console.log(`[db.setup] Imóvel criado para tenant A: ${propertyIds['A']}`)

  if (tenantBId) {
    propertyIds['B'] = await seedTenantProperty(tenantBId)
    createdTenantIds.push(tenantBId)
    console.log(`[db.setup] Imóvel criado para tenant B: ${propertyIds['B']}`)
  }

  writeFileSync(
    E2E_DATA_FILE,
    JSON.stringify({ tenantIds: createdTenantIds, propertyIds }, null, 2),
  )
})
