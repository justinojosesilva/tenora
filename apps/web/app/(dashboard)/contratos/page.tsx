import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { LeaseFilters } from '@/components/lease/lease-filters'
import { LeaseTableSkeleton } from '@/components/lease/lease-table-skeleton'
import { LeasePageClient } from '@/components/lease/lease-page-client'

export const metadata = { title: 'Contratos — Tenora' }

type SearchParams = {
  search?: string
  status?: string
  propertyId?: string
  startDate?: string
  endDate?: string
  page?: string
}

const PAGE_SIZE = 20
const WRITE_ROLES = new Set(['admin', 'operacional'])

async function LeaseSection({
  orgId,
  orgRole,
  search,
  status,
  propertyId,
  startDate,
  endDate,
  page,
}: {
  orgId: string
  orgRole: string | null | undefined
  search?: string
  status?: string
  propertyId?: string
  startDate?: string
  endDate?: string
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const validStatuses = ['active', 'ended', 'renewing', 'overdue'] as const
  type ValidStatus = (typeof validStatuses)[number]
  const statusFilter =
    status && validStatuses.includes(status as ValidStatus) ? (status as ValidStatus) : undefined

  const where = {
    deletedAt: null,
    ...(statusFilter && { status: statusFilter }),
    ...(propertyId && { propertyId }),
    ...(startDate && { startDate: { gte: new Date(startDate) } }),
    ...(endDate && { endDate: { lte: new Date(endDate) } }),
    ...(search && {
      OR: [
        { tenantName: { contains: search, mode: 'insensitive' as const } },
        { property: { address: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [leases, total, properties] = await Promise.all([
    db.lease.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            type: true,
            status: true,
            owner: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lease.count({ where }),
    db.property.findMany({
      where: { deletedAt: null, status: { in: ['available', 'rented'] } },
      select: { id: true, address: true, city: true, status: true },
      orderBy: { address: 'asc' },
    }),
  ])

  const canWrite = WRITE_ROLES.has(orgRole ?? '')

  const serialized = leases.map((l) => ({
    id: l.id,
    propertyId: l.propertyId,
    tenantName: l.tenantName,
    tenantCpf: l.tenantCpf,
    tenantEmail: l.tenantEmail,
    tenantPhone: l.tenantPhone,
    rentAmount: l.rentAmount.toString(),
    adminFeePct: l.adminFeePct.toString(),
    readjustIndex: l.readjustIndex,
    dueDayOfMonth: l.dueDayOfMonth,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    signedAt: l.signedAt?.toISOString() ?? null,
    status: l.status as 'active' | 'ended' | 'renewing' | 'overdue',
    property: {
      id: l.property.id,
      address: l.property.address,
      city: l.property.city,
      state: l.property.state,
      type: l.property.type,
      owner: l.property.owner ? { name: l.property.owner.name } : null,
    },
  }))

  return (
    <LeasePageClient
      leases={serialized}
      properties={properties.map((p) => ({
        id: p.id,
        address: p.address,
        city: p.city,
        status: p.status,
      }))}
      canWrite={canWrite}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
    />
  )
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { orgId, sessionClaims, orgRole } = await auth()
  const params = await searchParams

  if (!orgId) return null

  const page = Math.max(1, Number(params.page ?? 1))

  const resolvedRole =
    ((sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ?? orgRole?.replace(/^org:/, '')

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Suspense fallback={null}>
        <LeaseFilters />
      </Suspense>

      <Suspense fallback={<LeaseTableSkeleton />}>
        <LeaseSection
          orgId={orgId}
          orgRole={resolvedRole}
          search={params.search}
          status={params.status}
          propertyId={params.propertyId}
          startDate={params.startDate}
          endDate={params.endDate}
          page={page}
        />
      </Suspense>
    </div>
  )
}
