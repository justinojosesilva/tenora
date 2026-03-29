import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db as rootDb } from '@tenora/db'
import { BillingPageClient } from './_components/billing-page-client'

export const metadata = { title: 'Assinatura — Tenora' }

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const params = await searchParams

  const tenant = await rootDb.tenant.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  })

  if (!tenant) redirect('/onboarding')

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie o plano da sua imobiliária e dados de cobrança.
        </p>
      </div>

      <BillingPageClient
        currentPlan={tenant.plan as 'starter' | 'pro' | 'scale'}
        hasStripeCustomer={!!tenant.stripeCustomerId}
        hasActiveSubscription={!!tenant.stripeSubscriptionId}
        successMessage={params.success === 'true'}
        canceledMessage={params.canceled === 'true'}
      />
    </div>
  )
}
