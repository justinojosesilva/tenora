'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'
import { db as rootDb } from '@tenora/db'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
  return new Stripe(key)
}

export async function createCheckoutSessionAction(
  plan: 'starter' | 'pro' | 'scale',
): Promise<{ error?: string }> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const priceMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    scale: process.env.STRIPE_PRICE_SCALE,
  }
  const priceId = priceMap[plan]
  if (!priceId) return { error: `Price ID do plano "${plan}" não configurado` }

  const stripe = getStripe()

  const tenant = await rootDb.tenant.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  })
  if (!tenant) return { error: 'Tenant não encontrado' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: tenant.stripeCustomerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { tenantId: orgId },
    },
    metadata: { tenantId: orgId },
    success_url: `${appUrl}/billing?success=true`,
    cancel_url: `${appUrl}/billing?canceled=true`,
  })

  if (!tenant.stripeCustomerId && session.customer) {
    await rootDb.tenant.update({
      where: { id: orgId },
      data: { stripeCustomerId: session.customer as string },
    })
  }

  redirect(session.url!)
}

export async function createPortalSessionAction(): Promise<{ error?: string }> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const stripe = getStripe()

  const tenant = await rootDb.tenant.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  })
  if (!tenant?.stripeCustomerId) {
    return { error: 'Sem assinatura ativa. Escolha um plano primeiro.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  })

  redirect(session.url)
}
