import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db as rootDb } from '@tenora/db'
import { SettingsPageClient } from './_components/settings-page-client'

export const metadata = { title: 'Configurações — Tenora' }

export default async function SettingsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

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
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie a sua assinatura e preferências da imobiliária.
        </p>
      </div>

      <SettingsPageClient
        currentPlan={tenant.plan as 'starter' | 'pro' | 'scale'}
        hasStripeCustomer={!!tenant.stripeCustomerId}
        hasActiveSubscription={!!tenant.stripeSubscriptionId}
      />
    </div>
  )
}
