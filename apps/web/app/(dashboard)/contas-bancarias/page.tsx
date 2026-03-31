import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { BankAccountsClient } from './_components/bank-accounts-client'

export const metadata = { title: 'Contas Bancárias — Tenora' }

export default async function ContasBancariasPage() {
  const { orgId, sessionClaims, orgRole } = await auth()
  if (!orgId) return null

  const db = prismaWithTenant(orgId)
  const accounts = await db.bankAccount.findMany({
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    include: {
      bankConnection: {
        select: { id: true, pluggyItemId: true, status: true, lastSyncedAt: true },
      },
    },
  })

  const resolvedRole =
    ((sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ?? orgRole?.replace(/^org:/, '')

  const isAdmin = resolvedRole === 'admin'

  const serialized = accounts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    bankConnection: a.bankConnection
      ? {
          ...a.bankConnection,
          lastSyncedAt: a.bankConnection.lastSyncedAt?.toISOString() ?? null,
        }
      : null,
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <BankAccountsClient accounts={serialized} isAdmin={isAdmin} />
    </div>
  )
}
