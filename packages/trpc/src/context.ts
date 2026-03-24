import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { getAuth } from '@clerk/fastify'
import { prismaWithTenant, db as rootDb } from '@tenora/db'
import { TRPCError } from '@trpc/server'

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

  return { user, db: tenantDb, tenantId: orgId }
}

export type Context = Awaited<ReturnType<typeof createContext>>
