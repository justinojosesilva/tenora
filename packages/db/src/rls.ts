import { Prisma, PrismaClient } from '@prisma/client'

const withTenantExtension = (tenantId: string) =>
  Prisma.defineExtension({
    name: 'rls-tenant',
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Cada operação roda dentro de uma transação
          // que define o tenant_id para o RLS do PostgreSQL
          const [, result] = await (this as any).$transaction([
            (this as any).$executeRaw`
              SELECT set_config('app.tenant_id', ${tenantId}, TRUE)
            `,
            query(args),
          ])
          return result
        },
      },
    },
  })

// Cliente base - sem RLS (usado apenas para migrations e seed)
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Cliente com RLS - usado em TODA a aplicação
export function prismaWithTenant(tenantId: string) {
  if (!tenantId) {
    throw new Error('[RLS] tenantId é obrigatório. Nunca use o db root na aplicação.')
  }
  return db.$extends(withTenantExtension(tenantId))
}

export type TenantDB = ReturnType<typeof prismaWithTenant>
