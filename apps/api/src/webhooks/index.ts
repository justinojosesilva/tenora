import type { FastifyInstance } from 'fastify'
import { Webhook } from 'svix'
import Stripe from 'stripe'
import { db as rootDb } from '@tenora/db'
import { UserRole } from '@prisma/client'

interface OrganizationMembershipCreatedPayload {
  type: 'organizationMembership.created'
  data: {
    id: string
    object: string
    status: 'active' | 'pending_invitation'
    role: string
    public_metadata?: Record<string, string>
    public_organization_data?: {
      id: string
      name: string
      slug: string
    }
    public_user_data?: {
      user_id: string
      primary_email_address?: string
      primary_email_address_id?: string
      image_url?: string
      first_name?: string
      last_name?: string
      identifier?: string
    }
  }
}

interface OrganizationCreatedPayload {
  type: 'organization.created'
  data: {
    id: string
    name: string
    slug: string
    public_metadata?: Record<string, unknown>
    created_by?: string
  }
}

interface UserUpdatedPayload {
  type: 'user.updated'
  data: {
    id: string
    primary_email_address?: {
      email_address: string
    }
    first_name?: string
    last_name?: string
  }
}

type ClerkWebhookEvent =
  | OrganizationMembershipCreatedPayload
  | OrganizationCreatedPayload
  | UserUpdatedPayload

export async function registerWebhooks(server: FastifyInstance) {
  server.post('/webhooks/clerk', async (request, reply) => {
    try {
      const svixSecret = process.env.CLERK_WEBHOOK_SECRET
      if (!svixSecret) {
        server.log.error('CLERK_WEBHOOK_SECRET não configurada')
        return reply.status(500).send({ error: 'Webhook secret not configured' })
      }

      // Validar assinatura via svix
      const wh = new Webhook(svixSecret)

      // Converter body para string se necessário
      const bodyString =
        typeof request.body === 'string'
          ? request.body
          : request.body
            ? JSON.stringify(request.body)
            : ''

      // Converter headers para Record<string, string>
      const headers = Object.entries(request.headers).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
          return acc
        },
        {} as Record<string, string>,
      )

      const event = wh.verify(bodyString, headers) as ClerkWebhookEvent

      server.log.info({ msg: 'Webhook Clerk recebido', type: event.type })

      switch (event.type) {
        case 'organizationMembership.created': {
          const payload = event as OrganizationMembershipCreatedPayload
          const tenantId = payload.data.public_organization_data?.id
          const userId = payload.data.public_user_data?.user_id
          const email = payload.data.public_user_data?.primary_email_address
          const name = [
            payload.data.public_user_data?.first_name,
            payload.data.public_user_data?.last_name,
          ]
            .filter(Boolean)
            .join(' ')

          if (!tenantId || !userId) {
            server.log.warn({
              msg: 'Webhook organizationMembership.created sem tenantId ou userId',
              payload,
            })
            return reply.status(400).send({ error: 'Missing tenantId or userId' })
          }

          // Verificar se tenant existe
          const tenant = await rootDb.tenant.findUnique({ where: { id: tenantId } })
          if (!tenant) {
            server.log.warn({ msg: 'Tenant não encontrado para webhook', tenantId })
            return reply.status(404).send({ error: 'Tenant not found' })
          }

          // Upsert user com RLS (tenant context)
          const { prismaWithTenant } = await import('@tenora/db')
          const tenantDb = prismaWithTenant(tenantId)

          // Extrair role dos metadados do convite (salvo pelo usersRouter.invite)
          const invitationRole = payload.data.public_metadata?.role as UserRole | undefined
          const role =
            invitationRole && Object.values(UserRole).includes(invitationRole)
              ? invitationRole
              : UserRole.visualizador

          await tenantDb.user.upsert({
            where: { clerkId: userId },
            create: {
              tenantId,
              clerkId: userId,
              email: email || 'unknown@example.com',
              name: name || 'Novo Usuário',
              role,
            },
            update: {
              email: email || undefined,
              name: name || undefined,
            },
          })

          server.log.info({ msg: 'User sincronizado do webhook', userId, tenantId })
          break
        }

        case 'organization.created': {
          const payload = event as OrganizationCreatedPayload
          const orgId = payload.data.id
          const orgName = payload.data.name
          const slug = payload.data.slug
          const meta = payload.data.public_metadata ?? {}
          const cnpj = typeof meta.cnpj === 'string' ? meta.cnpj : null

          // Upsert tenant — idempotente caso webhook chegue duplicado
          await rootDb.tenant.upsert({
            where: { id: orgId },
            create: {
              id: orgId,
              name: orgName,
              slug: slug || orgId,
              cnpj,
            },
            update: {
              name: orgName,
              slug: slug || undefined,
              cnpj: cnpj || undefined,
            },
          })

          server.log.info({ msg: 'Tenant criado via webhook', orgId, orgName })
          break
        }

        case 'user.updated': {
          const payload = event as UserUpdatedPayload
          const userId = payload.data.id
          const email = payload.data.primary_email_address?.email_address
          const name = [payload.data.first_name, payload.data.last_name].filter(Boolean).join(' ')

          // Atualizar user em TODOS os tenants onde ele existe
          // Nota: isso é feito sem tenant context porque estamos atualizando globalmente
          // Idealmente, isso seria mais granular, mas por enquanto busca todos os users com este clerkId
          if (email || name) {
            await rootDb.user.updateMany({
              where: { clerkId: userId },
              data: {
                ...(email && { email }),
                ...(name && { name }),
              },
            })

            server.log.info({ msg: 'User atualizado globalmente', userId })
          }
          break
        }

        default: {
          // Ignorar outros eventos
          server.log.debug({ msg: 'Webhook Clerk type não tratado', type: (event as any).type })
        }
      }

      return reply.status(200).send({ success: true })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not verify message signature')) {
        server.log.warn({ msg: 'Webhook signature inválida', error: error.message })
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      server.log.error({ msg: 'Erro ao processar webhook Clerk', error })
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // ── Stripe Webhook ──────────────────────────────────────────────────────────
  server.post('/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecret || !webhookSecret) {
      server.log.error('STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados')
      return reply.status(500).send({ error: 'Stripe not configured' })
    }

    const stripe = new Stripe(stripeSecret)
    const sig = request.headers['stripe-signature'] as string

    let event: Stripe.Event
    try {
      const rawBody =
        (request as any).rawBody instanceof Buffer
          ? (request as any).rawBody
          : Buffer.from(
              typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
            )

      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      server.log.warn({ msg: 'Stripe webhook signature inválida', error: msg })
      return reply.status(400).send({ error: `Webhook Error: ${msg}` })
    }

    server.log.info({ msg: 'Stripe webhook recebido', type: event.type })

    const planMap: Record<string, 'starter' | 'pro' | 'scale'> = {
      [process.env.STRIPE_PRICE_STARTER ?? '']: 'starter',
      [process.env.STRIPE_PRICE_PRO ?? '']: 'pro',
      [process.env.STRIPE_PRICE_SCALE ?? '']: 'scale',
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const plan = planMap[priceId] ?? 'starter'

        await rootDb.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            plan,
          },
        })

        server.log.info({ msg: 'Tenant plan atualizado via Stripe', customerId, plan })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await rootDb.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: null,
            plan: 'starter',
          },
        })

        server.log.info({ msg: 'Assinatura cancelada — tenant resetado para starter', customerId })
        break
      }

      default:
        server.log.debug({ msg: 'Stripe event type não tratado', type: event.type })
    }

    return reply.status(200).send({ received: true })
  })
}
