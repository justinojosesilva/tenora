import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import type { PropertyStatus, PropertyType } from '@tenora/db'
import { PropertyFilters } from '@/components/property/property-filters'
import { PropertyListSkeleton } from '@/components/property/property-list-skeleton'
import { PropertyPageClient } from '@/components/property/property-page-client'

export const metadata = { title: 'Imóveis — Tenora' }

type SearchParams = {
  search?: string
  status?: string
  type?: string
  page?: string
}

const PAGE_SIZE = 20

const EDIT_ROLES = new Set(['admin', 'operacional', 'financeiro'])
const DELETE_ROLES = new Set(['admin', 'operacional'])

async function PropertySection({
  orgId,
  orgRole,
  search,
  status,
  type,
  page,
}: {
  orgId: string
  orgRole: string | null | undefined
  search?: string
  status?: PropertyStatus
  type?: PropertyType
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(type && { type }),
    ...(search && { address: { contains: search, mode: 'insensitive' as const } }),
  }

  const [properties, owners, total] = await Promise.all([
    db.property.findMany({
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.owner.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.property.count({ where }),
  ])

  const role = orgRole ?? ''
  const canEdit = EDIT_ROLES.has(role)
  const canDelete = DELETE_ROLES.has(role)

  // Serialize dates for client component
  const serialized = properties.map((p) => ({
    ...p,
    area: p.area?.toString() ?? null,
    rentAmount: p.rentAmount?.toString() ?? null,
    adminFeePct: p.adminFeePct.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt?.toISOString() ?? null,
  }))

  return (
    <PropertyPageClient
      properties={serialized}
      owners={owners}
      canEdit={canEdit}
      canDelete={canDelete}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
    />
  )
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { orgId, sessionClaims } = await auth()
  const params = await searchParams

  if (!orgId) return null

  const page = Math.max(1, Number(params.page ?? 1))
  const status = params.status as PropertyStatus | undefined
  const type = params.type as PropertyType | undefined
  const orgRole = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
    | string
    | undefined

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Suspense fallback={null}>
        <PropertyFilters />
      </Suspense>

      <Suspense fallback={<PropertyListSkeleton />}>
        <PropertySection
          orgId={orgId}
          orgRole={orgRole}
          search={params.search}
          status={status}
          type={type}
          page={page}
        />
      </Suspense>
    </div>
  )
}
