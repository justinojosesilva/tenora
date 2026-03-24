import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export async function withTenantRLS<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, TRUE)
    `
    return fn(tx)
  })
}

export function prismaWithTenant(tenantId: string): PrismaClient {
  return new Proxy(db, {
    get(target, modelName: string) {
      if (modelName.startsWith('$') || typeof (target as any)[modelName] !== 'object') {
        const value = (target as any)[modelName]
        return typeof value === 'function' ? value.bind(target) : value
      }

      return new Proxy((target as any)[modelName], {
        get(model, method: string) {
          const fn = (model as any)[method]
          if (typeof fn !== 'function') return fn
          return (...args: any[]) =>
            withTenantRLS(tenantId, (tx) => (tx as any)[modelName][method](...args))
        },
      })
    },
  }) as unknown as PrismaClient
}

export type TenantDB = ReturnType<typeof prismaWithTenant>
