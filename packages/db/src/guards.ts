import { db, prismaWithTenant } from './rls.js'

// Proxy que bloqueia acesso direto ao db root fora das migrations e seed
const ALLOWED_RAW_METHODS = ['$queryRaw', '$executeRaw', '$transaction', '$connect', '$disconnect']

export const safeDb = new Proxy(db, {
  get(target, prop: string) {
    // Permite métodos de manutenção
    if (ALLOWED_RAW_METHODS.includes(prop)) return (target as any)[prop].bind(target)

    // Bloqueia qualquer acesso a models sem tenant
    if (typeof prop === 'string' && !prop.startsWith('$')) {
      throw new Error(
        `[RLS] Acesso direto ao model "${prop}" sem tenant bloqueado. \n` +
          `Use prismaWithTenant(tenantId).${prop} em vez de db.${prop}.`,
      )
    }

    return (target as any)[prop]
  },
})

export { prismaWithTenant }
