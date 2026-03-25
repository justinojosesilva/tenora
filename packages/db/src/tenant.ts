import type { PrismaClient } from '@prisma/client'
import { withTenantRLS } from './rls.js'

export function tenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error('[tenantDb] tenantId é obrigatório')
  }

  return {
    run: async <T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> => {
      return withTenantRLS(tenantId, fn)
    },
  }
}
