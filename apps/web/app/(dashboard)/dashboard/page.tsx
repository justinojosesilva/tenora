import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { db as rootDb, prismaWithTenant } from '@tenora/db'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { KpiCardsSkeleton } from '@/components/dashboard/kpi-cards-skeleton'
import { SubscriptionStatus } from '@/components/dashboard/subscription-status'

export const metadata = { title: 'Dashboard — Tenora' }

async function KpiSection({ orgId }: { orgId: string }) {
  const db = prismaWithTenant(orgId)

  const [totalProperties, rentedProperties, activeLeases, pendingCharges] = await Promise.all([
    db.property.count({ where: { deletedAt: null } }),
    db.property.count({ where: { deletedAt: null, status: 'rented' } }),
    db.lease.count({ where: { deletedAt: null, status: 'active' } }),
    db.billingCharge.count({ where: { status: 'pending' } }),
  ])

  return (
    <KpiCards
      totalProperties={totalProperties}
      rentedProperties={rentedProperties}
      activeLeases={activeLeases}
      pendingCharges={pendingCharges}
    />
  )
}

async function SubscriptionSection({ orgId }: { orgId: string }) {
  const tenant = await rootDb.tenant.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
    },
  })

  if (!tenant) return null

  return (
    <SubscriptionStatus
      plan={tenant.plan as 'starter' | 'pro' | 'scale'}
      subscriptionId={tenant.stripeSubscriptionId}
      tenantStatus={tenant.status}
    />
  )
}

export default async function DashboardPage() {
  const { orgId } = await auth()
  if (!orgId) return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Bom dia!</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Visão geral da sua imobiliária</p>

      <div className="mt-8 space-y-8">
        <Suspense fallback={null}>
          <SubscriptionSection orgId={orgId} />
        </Suspense>

        <div>
          <Suspense fallback={<KpiCardsSkeleton />}>
            <KpiSection orgId={orgId} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
