import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { OwnerFilters } from '@/components/owner/owner-filters'
import { OwnerTableSkeleton } from '@/components/owner/owner-table-skeleton'
import { OwnerPageClient } from '@/components/owner/owner-page-client'

export const metadata = { title: 'Proprietários — Tenora' }

type SearchParams = { search?: string; page?: string }

const PAGE_SIZE = 20
const EDIT_ROLES = new Set(['admin', 'operacional', 'financeiro'])
const DELETE_ROLES = new Set(['admin', 'operacional'])

async function OwnerSection({
  orgId,
  orgRole,
  search,
  page,
}: {
  orgId: string
  orgRole: string | null | undefined
  search?: string
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { cpfCnpj: { contains: search } },
      ],
    }),
  }

  const [owners, total] = await Promise.all([
    db.owner.findMany({
      where,
      include: {
        ownerAccount: { select: { balance: true } },
        properties: {
          where: { deletedAt: null },
          select: { id: true, address: true, city: true, status: true, rentAmount: true },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.owner.count({ where }),
  ])

  const role = orgRole ?? ''
  const canEdit = EDIT_ROLES.has(role)
  const canDelete = DELETE_ROLES.has(role)

  const serialized = owners.map((o) => ({
    id: o.id,
    name: o.name,
    cpfCnpj: o.cpfCnpj,
    email: o.email,
    phone: o.phone,
    balance: o.ownerAccount?.balance.toString() ?? '0',
    propertiesCount: o.properties.length,
    properties: o.properties.map((p) => ({
      id: p.id,
      address: p.address,
      city: p.city,
      status: p.status,
      rentAmount: p.rentAmount?.toString() ?? null,
    })),
  }))

  return (
    <OwnerPageClient
      owners={serialized}
      canEdit={canEdit}
      canDelete={canDelete}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
    />
  )
}

export default async function ProprietariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { orgId, sessionClaims } = await auth()
  const params = await searchParams

  if (!orgId) return null

  const page = Math.max(1, Number(params.page ?? 1))
  const orgRole = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
    | string
    | undefined

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Suspense fallback={null}>
        <OwnerFilters />
      </Suspense>

      <Suspense fallback={<OwnerTableSkeleton />}>
        <OwnerSection orgId={orgId} orgRole={orgRole} search={params.search} page={page} />
      </Suspense>
    </div>
  )
}
