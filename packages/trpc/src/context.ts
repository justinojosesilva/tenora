import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { getAuth } from '@clerk/fastify'
import { prismaWithTenant, db as rootDb } from '@tenora/db'
import { TRPCError } from '@trpc/server'
import { TenantStatus } from '@prisma/client'
import Redis from 'ioredis'

// Create Redis client for context
function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL
  return new Redis(
    redisUrl ||
      ({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      } as any),
  )
}

export async function createContext({ req }: CreateFastifyContextOptions) {
  const { userId, orgId } = getAuth(req) || {}
  const redis = createRedisClient()

  if (!userId || !orgId) {
    return { user: null, db: rootDb, tenantId: null, redis }
  }

  const tenantDb = prismaWithTenant(orgId)

  const user = await tenantDb.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, name: true, role: true, tenantId: true },
  })

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não encontrado!' })
  }

  // Validar se o tenant está ativo
  const tenant = await rootDb.tenant.findUnique({ where: { id: orgId } })
  if (!tenant || tenant.status !== TenantStatus.active) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant inativo ou suspenso.' })
  }

  return { user, db: tenantDb, tenantId: orgId, tenant, redis }
}

export type Context = Awaited<ReturnType<typeof createContext>>
