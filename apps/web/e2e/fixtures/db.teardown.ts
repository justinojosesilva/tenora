/**
 * Playwright global teardown: limpeza dos dados E2E criados pelo db.setup.ts
 *
 * Lê os IDs gravados em e2e/.e2e-data.json e apaga os recursos criados
 * para o tenant (imóveis e proprietários E2E) sem remover o tenant em si
 * (que pertence ao Clerk/staging).
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { prismaWithTenant } from '@tenora/db'
import { E2E_DATA_FILE } from './e2e-data.paths'

export default async function globalTeardown() {
  if (!existsSync(E2E_DATA_FILE)) return

  let data: { tenantIds?: string[]; propertyIds?: Record<string, string> }

  try {
    data = JSON.parse(readFileSync(E2E_DATA_FILE, 'utf-8'))
  } catch {
    return
  } finally {
    unlinkSync(E2E_DATA_FILE)
  }

  const { tenantIds = [] } = data

  for (const tenantId of tenantIds) {
    try {
      const rls = prismaWithTenant(tenantId)
      await rls.billingCharge.deleteMany({ where: { tenantId } })
      await rls.lease.deleteMany({ where: { tenantId } })
      await rls.property.deleteMany({ where: { tenantId } })
      await rls.owner.deleteMany({ where: { tenantId } })
      console.log(`[db.teardown] Dados E2E removidos para tenant ${tenantId}`)
    } catch (err) {
      console.error(`[db.teardown] Erro ao limpar tenant ${tenantId}:`, err)
    }
  }
}
