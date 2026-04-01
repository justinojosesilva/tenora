import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { ChargesPageClient, type ChargeRow } from '@/components/charges/charges-page-client'

export const metadata = { title: 'Cobranças — Tenora' }

type SearchParams = {
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
  propertyId?: string
  page?: string
}

const PAGE_SIZE = 20
const WRITE_ROLES = new Set(['admin', 'financeiro', 'operacional'])
const VALID_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

async function ChargesSection({
  orgId,
  orgRole,
  status,
  dueDateFrom,
  dueDateTo,
  propertyId,
  page,
}: {
  orgId: string
  orgRole: string | null | undefined
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
  propertyId?: string
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const statusFilter =
    status && VALID_STATUSES.includes(status as ValidStatus) ? (status as ValidStatus) : undefined

  const baseWhere = {
    ...(statusFilter && { status: statusFilter }),
    ...(propertyId && { lease: { propertyId } }),
    ...(dueDateFrom && { dueDate: { gte: new Date(dueDateFrom) } }),
    ...(dueDateTo && {
      dueDate: {
        ...(dueDateFrom ? { gte: new Date(dueDateFrom) } : {}),
        lte: new Date(dueDateTo),
      },
    }),
  }

  const [charges, total, pendingSummary, paidSummary, overdueSummary, allSummary] =
    await Promise.all([
      db.billingCharge.findMany({
        where: baseWhere,
        select: {
          id: true,
          leaseId: true,
          amount: true,
          dueDate: true,
          paidAt: true,
          paidAmount: true,
          status: true,
          reference: true,
          type: true,
          pixCode: true,
          qrCodeImage: true,
          asaasChargeId: true,
          lease: {
            select: {
              tenantName: true,
              property: {
                select: {
                  address: true,
                  city: true,
                  owner: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.billingCharge.count({ where: baseWhere }),
      db.billingCharge.aggregate({
        where: { ...baseWhere, status: 'pending' },
        _count: true,
        _sum: { amount: true },
      }),
      db.billingCharge.aggregate({
        where: { ...baseWhere, status: 'paid' },
        _count: true,
        _sum: { amount: true },
      }),
      db.billingCharge.aggregate({
        where: { ...baseWhere, status: 'overdue' },
        _count: true,
        _sum: { amount: true },
      }),
      db.billingCharge.aggregate({
        where: baseWhere,
        _count: true,
        _sum: { amount: true },
      }),
    ])

  const canWrite = WRITE_ROLES.has(orgRole ?? '')

  const serialized: ChargeRow[] = charges.map((c) => ({
    id: c.id,
    leaseId: c.leaseId,
    amount: c.amount.toString(),
    dueDate: c.dueDate.toISOString(),
    paidAt: c.paidAt?.toISOString() ?? null,
    paidAmount: c.paidAmount?.toString() ?? null,
    status: c.status as ChargeRow['status'],
    reference: c.reference,
    type: c.type,
    pixCode: c.pixCode ?? null,
    qrCodeImage: c.qrCodeImage ?? null,
    asaasChargeId: c.asaasChargeId ?? null,
    lease: {
      tenantName: c.lease.tenantName,
      property: {
        address: c.lease.property.address,
        city: c.lease.property.city,
        owner: c.lease.property.owner ? { name: c.lease.property.owner.name } : null,
      },
    },
  }))

  return (
    <ChargesPageClient
      charges={serialized}
      tabSummaries={{
        all: {
          count: allSummary._count,
          total: parseFloat(allSummary._sum.amount?.toString() ?? '0'),
        },
        pending: {
          count: pendingSummary._count,
          total: parseFloat(pendingSummary._sum.amount?.toString() ?? '0'),
        },
        paid: {
          count: paidSummary._count,
          total: parseFloat(paidSummary._sum.amount?.toString() ?? '0'),
        },
        overdue: {
          count: overdueSummary._count,
          total: parseFloat(overdueSummary._sum.amount?.toString() ?? '0'),
        },
      }}
      canWrite={canWrite}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      activeTab={statusFilter ?? 'all'}
    />
  )
}

export default async function CobrancasPage({
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
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}>
        <ChargesSection
          orgId={orgId}
          orgRole={resolvedRole}
          status={params.status}
          dueDateFrom={params.dueDateFrom}
          dueDateTo={params.dueDateTo}
          propertyId={params.propertyId}
          page={page}
        />
      </Suspense>
    </div>
  )
}
