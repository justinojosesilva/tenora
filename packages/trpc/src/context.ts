import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { getAuth } from '@clerk/fastify'
import { prismaWithTenant, db as rootDb } from '@tenora/db'
import { TRPCError } from '@trpc/server'
import { TenantStatus } from '@prisma/client'

export async function createContext({ req }: CreateFastifyContextOptions) {
  const { userId, orgId } = getAuth(req) || {}

  if (!userId || !orgId) {
    return { user: null, db: rootDb, tenantId: null }
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

  return { user, db: tenantDb, tenantId: orgId, tenant }
}

export type Context = Awaited<ReturnType<typeof createContext>>
