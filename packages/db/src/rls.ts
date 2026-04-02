import type { Prisma } from '@prisma/client'
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

export async function withTenantRLS<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, TRUE)
      `
      return fn(tx)
    },
    { timeout: 30000 },
  )
}

type AnyRecord = Record<string, unknown>
type AnyFn = (...args: unknown[]) => Promise<unknown>

export function prismaWithTenant(tenantId: string): PrismaClient {
  return new Proxy(db, {
    get(target, modelName: string) {
      if (modelName === '$transaction') {
        return (
          fnOrQueries:
            | ((tx: Prisma.TransactionClient) => Promise<unknown>)
            | readonly Prisma.PrismaPromise<unknown>[],
          options?: Parameters<PrismaClient['$transaction']>[1],
        ) => {
          if (typeof fnOrQueries === 'function') {
            return db.$transaction(
              async (tx) => {
                await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`
                return fnOrQueries(tx)
              },
              options as Parameters<typeof db.$transaction>[1],
            )
          }
          return withTenantRLS(tenantId, () =>
            db.$transaction(
              fnOrQueries as unknown as (tx: Prisma.TransactionClient) => Promise<unknown>,
              options as Parameters<typeof db.$transaction>[1],
            ),
          )
        }
      }

      const targetRecord = target as unknown as AnyRecord
      if (modelName.startsWith('$') || typeof targetRecord[modelName] !== 'object') {
        const value = targetRecord[modelName]
        return typeof value === 'function' ? (value as AnyFn).bind(target) : value
      }

      return new Proxy(targetRecord[modelName] as AnyRecord, {
        get(model, method: string) {
          const fn = (model as AnyRecord)[method]
          if (typeof fn !== 'function') return fn
          return (...args: unknown[]) =>
            withTenantRLS(tenantId, (tx) => {
              const txRecord = tx as unknown as AnyRecord
              return ((txRecord[modelName] as AnyRecord)[method] as AnyFn)(...args)
            })
        },
      })
    },
  }) as unknown as PrismaClient
}

export type TenantDB = ReturnType<typeof prismaWithTenant>
