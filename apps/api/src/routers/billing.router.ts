import { z } from 'zod'
import Stripe from 'stripe'
import { router, protectedProcedure, adminProcedure, type TRPCRouter } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key)
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe não configurado' })
  return new Stripe(key)
}

const PRICE_IDS = () => ({
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  scale: process.env.STRIPE_PRICE_SCALE ?? '',
})

export const billingRouter: TRPCRouter = router({
  // Retorna o plano e status de assinatura do tenant atual
  status: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' })

    let subscriptionStatus: string | null = null

    if (tenant.stripeSubscriptionId) {
      const stripe = getStripe()
      try {
        const sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId)
        subscriptionStatus = sub.status
      } catch {
        subscriptionStatus = null
      }
    }

    return {
      plan: tenant.plan,
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      subscriptionStatus,
    }
  }),

  // Cria uma Checkout Session para upgrade de plano
  createCheckoutSession: protectedProcedure
    .input(z.object({ plan: z.enum(['starter', 'pro', 'scale']) }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe()
      const prices = PRICE_IDS()
      const priceId = prices[input.plan]

      if (!priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Price ID do plano "${input.plan}" não configurado`,
        })
      }

      const tenant = await ctx.db.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { stripeCustomerId: true },
      })

      if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: tenant.stripeCustomerId ?? undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { tenantId: ctx.tenantId },
        },
        metadata: { tenantId: ctx.tenantId },
        success_url: `${appUrl}/dashboard/billing?success=true`,
        cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      })

      // Salvar stripeCustomerId se criado pela primeira vez
      if (!tenant.stripeCustomerId && session.customer) {
        await ctx.db.tenant.update({
          where: { id: ctx.tenantId },
          data: { stripeCustomerId: session.customer as string },
        })
      }

      return { url: session.url }
    }),

  // Cria um Portal de Billing do Stripe para o tenant gerenciar a assinatura
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe()

    const tenant = await ctx.db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { stripeCustomerId: true },
    })

    if (!tenant?.stripeCustomerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant não possui customer Stripe. Faça uma assinatura primeiro.',
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    })

    return { url: session.url }
  }),

  // Admin: listar todos os price IDs configurados
  prices: adminProcedure.query(() => {
    const prices = PRICE_IDS()
    return {
      starter: prices.starter ? '✓ configurado' : '✗ não configurado',
      pro: prices.pro ? '✓ configurado' : '✗ não configurado',
      scale: prices.scale ? '✓ configurado' : '✗ não configurado',
    }
  }),
})
