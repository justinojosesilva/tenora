import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { Webhook } from 'svix'
import Stripe from 'stripe'
import { db as rootDb } from '@tenora/db'
import { UserRole } from '@prisma/client'
import { bankSyncQueue, notificationSendQueue, financialRepasseQueue } from '@tenora/queues'

// ── Pluggy Webhook Types ──────────────────────────────────────────────────────

interface PluggyWebhookEvent {
  event: string
  itemId: string
  data?: Record<string, unknown>
}

// Mapeamento de evento Pluggy → status da BankConnection
const PLUGGY_ITEM_EVENT_STATUS: Record<string, string> = {
  'item/updated': 'active',
  'item/login_succeeded': 'active',
  'item/error': 'error',
  'item/login_error': 'error',
  'item/outdated': 'outdated',
  'item/waiting_user_input': 'waiting_user_input',
}

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

// ── Asaas Webhook Types ────────────────────────────────────────────────────────

interface AsaasPaymentPayload {
  id: string
  customer?: string
  description?: string
  value: number
  status: string
  billingType: string
  pixQrCode?: string
  pixCopyPaste?: string
  bankSlipUrl?: string
  bankSlipCode?: string
  reference?: string
  dueDate?: string
  confirmedDate?: string
  [key: string]: unknown
}

interface AsaasWebhookEvent {
  event: string
  payment?: AsaasPaymentPayload
  [key: string]: unknown
}

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
          const unknownEvent = event as Record<string, unknown>
          server.log.debug({ msg: 'Webhook Clerk type não tratado', type: unknownEvent.type })
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
      const rawBodyProperty = request as unknown as { rawBody?: Buffer }
      const rawBody =
        rawBodyProperty.rawBody instanceof Buffer
          ? rawBodyProperty.rawBody
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
            status: 'active',
          },
        })

        server.log.info({
          msg: 'Tenant sincronizado via Stripe',
          customerId,
          plan,
          status: 'active',
          subscriptionId: subscription.id,
        })
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
            status: 'suspended',
          },
        })

        server.log.info({
          msg: 'Assinatura cancelada via Stripe — tenant suspenso',
          customerId,
          status: 'suspended',
        })
        break
      }

      default:
        server.log.debug({ msg: 'Stripe event type não tratado', type: event.type })
    }

    return reply.status(200).send({ received: true })
  })

  // ── Pluggy Webhook ────────────────────────────────────────────────────────
  server.post('/webhooks/pluggy', { config: { rawBody: true } }, async (request, reply) => {
    const webhookSecret = process.env.PLUGGY_WEBHOOK_SECRET

    if (!webhookSecret) {
      server.log.error('PLUGGY_WEBHOOK_SECRET não configurada')
      return reply.status(500).send({ error: 'Webhook secret not configured' })
    }

    // 1. Validar assinatura HMAC-SHA256
    const signature = request.headers['x-pluggy-signature'] as string | undefined

    if (!signature) {
      server.log.warn({ msg: 'Pluggy webhook recebido sem assinatura' })
      return reply.status(400).send({ error: 'Missing x-pluggy-signature header' })
    }

    const rawBodyProperty = request as unknown as { rawBody?: Buffer }
    const rawBody =
      rawBodyProperty.rawBody instanceof Buffer
        ? rawBodyProperty.rawBody
        : Buffer.from(
            typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
          )

    const expectedSig = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
    const incomingSig = signature.startsWith('sha256=') ? signature.slice(7) : signature

    let signaturesMatch = false
    try {
      signaturesMatch = timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(incomingSig, 'hex'),
      )
    } catch {
      signaturesMatch = false
    }

    if (!signaturesMatch) {
      server.log.warn({ msg: 'Pluggy webhook signature inválida' })
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    // 2. Parsear e logar o evento recebido
    const body = request.body as PluggyWebhookEvent

    server.log.info({
      msg: 'Webhook Pluggy recebido',
      event: body.event,
      itemId: body.itemId,
    })

    // 3. Buscar BankConnection pelo pluggyItemId para obter tenantId e bankConnectionId
    const bankConnection = await rootDb.bankConnection.findFirst({
      where: { pluggyItemId: body.itemId },
      include: { bankAccount: { select: { tenantId: true } } },
    })

    if (!bankConnection) {
      server.log.warn({
        msg: 'BankConnection não encontrada para pluggyItemId — ignorando webhook',
        pluggyItemId: body.itemId,
        event: body.event,
      })
      return reply.status(200).send({ received: true })
    }

    const tenantId = bankConnection.bankAccount.tenantId

    // 4a. Eventos de item/* → atualizar status da BankConnection
    if (body.event.startsWith('item/')) {
      const newStatus = PLUGGY_ITEM_EVENT_STATUS[body.event] ?? 'active'
      await rootDb.bankConnection.update({
        where: { id: bankConnection.id },
        data: { status: newStatus },
      })
      server.log.info({
        msg: 'BankConnection.status atualizado via webhook',
        bankConnectionId: bankConnection.id,
        tenantId,
        event: body.event,
        newStatus,
      })
    }

    // 4b. Eventos de transactions/* → enfileirar job bank-sync
    if (body.event.startsWith('transactions/')) {
      await bankSyncQueue.add('bank-sync', {
        tenantId,
        bankConnectionId: bankConnection.id,
      })
      server.log.info({
        msg: 'Job bank-sync enfileirado',
        tenantId,
        bankConnectionId: bankConnection.id,
        event: body.event,
        pluggyItemId: body.itemId,
      })
    }

    // 5. Retornar 200 imediatamente (processamento é assíncrono)
    return reply.status(200).send({ received: true })
  })

  // ── Asaas Webhook ─────────────────────────────────────────────────────────
  server.post('/webhooks/asaas', async (request, reply) => {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN

    if (!webhookToken) {
      server.log.error('ASAAS_WEBHOOK_TOKEN não configurada')
      return reply.status(500).send({ error: 'Webhook token not configured' })
    }

    // 1. Validar token via query param ou header
    const tokenFromHeader = (request.headers['authorization'] as string)?.replace('Bearer ', '')
    const tokenFromQuery = (request.query as Record<string, string>)?.token
    const incomingToken = tokenFromHeader || tokenFromQuery

    if (!incomingToken || incomingToken !== webhookToken) {
      server.log.warn({ msg: 'Asaas webhook token inválido' })
      return reply.status(401).send({ error: 'Invalid token' })
    }

    // 2. Parsear evento
    const body = request.body as AsaasWebhookEvent

    server.log.info({
      msg: 'Webhook Asaas recebido',
      event: body.event,
      paymentId: body.payment?.id,
    })

    // 3. Processar evento
    switch (body.event) {
      case 'PAYMENT_RECEIVED': {
        const payment = body.payment
        if (!payment || !payment.id) {
          server.log.warn({
            msg: 'Asaas PAYMENT_RECEIVED sem dados de pagamento',
            body,
          })
          return reply.status(200).send({ received: true })
        }

        // Buscar BillingCharge com dados do contrato e imóvel para cálculo de repasse
        const charge = await rootDb.billingCharge.findFirst({
          where: { asaasChargeId: payment.id },
          include: {
            lease: {
              include: {
                tenant: { select: { id: true } },
                property: { select: { ownerId: true } },
              },
            },
          },
        })

        if (!charge) {
          server.log.warn({
            msg: 'BillingCharge não encontrada para asaasChargeId',
            asaasChargeId: payment.id,
          })
          return reply.status(200).send({ received: true })
        }

        // Idempotência: ignorar se a cobrança já foi baixada
        if (charge.status === 'paid') {
          server.log.info({
            msg: 'PAYMENT_RECEIVED ignorado — cobrança já está paga',
            chargeId: charge.id,
            asaasChargeId: payment.id,
          })
          return reply.status(200).send({ received: true })
        }

        const tenantId = charge.lease.tenant.id
        const rentAmount = Number(charge.lease.rentAmount)
        const adminFeePct = Number(charge.lease.adminFeePct)
        const repasse = rentAmount - (rentAmount * adminFeePct) / 100
        const ownerId = charge.lease.property.ownerId
        const paidAt = payment.confirmedDate ? new Date(payment.confirmedDate) : new Date()

        // Baixar cobrança e atualizar saldo do proprietário em uma transação atômica
        const { prismaWithTenant } = await import('@tenora/db')
        const tenantDb = prismaWithTenant(tenantId)

        await tenantDb.$transaction(async (tx) => {
          await tx.billingCharge.update({
            where: { id: charge.id },
            data: {
              status: 'paid',
              paidAt,
              paidAmount: payment.value,
            },
          })

          if (ownerId) {
            await tx.ownerAccount.upsert({
              where: { ownerId },
              update: { balance: { increment: repasse } },
              create: { tenantId, ownerId, balance: repasse },
            })
          }
        })

        server.log.info({
          msg: 'Cobrança baixada automaticamente via webhook',
          tenantId,
          chargeId: charge.id,
          asaasChargeId: payment.id,
          paidAmount: payment.value,
          repasse,
        })

        // Enfileirar job financial-repasse (deduplicado por chargeId)
        if (ownerId) {
          await financialRepasseQueue.add(
            'financial-repasse',
            { tenantId, chargeId: charge.id, ownerId, amount: repasse },
            { jobId: `repasse-charge-${charge.id}` },
          )
        }

        // Enfileirar notificação de pagamento confirmado
        await notificationSendQueue.add('notification-send', {
          tenantId,
          to: 'notification@tenora.app',
          subject: 'Pagamento Confirmado',
          body: `Pagamento da cobrança ${charge.reference || charge.id} foi confirmado`,
          leaseId: charge.leaseId,
        })

        server.log.info({
          msg: 'Jobs enfileirados para PAYMENT_RECEIVED',
          tenantId,
          chargeId: charge.id,
          asaasChargeId: payment.id,
        })
        break
      }

      case 'PAYMENT_REFUNDED': {
        const payment = body.payment
        if (!payment || !payment.id) {
          server.log.warn({
            msg: 'Asaas PAYMENT_REFUNDED sem dados de pagamento',
            body,
          })
          return reply.status(200).send({ received: true })
        }

        // Buscar BillingCharge com dados do contrato e imóvel
        const charge = await rootDb.billingCharge.findFirst({
          where: { asaasChargeId: payment.id },
          include: {
            lease: {
              include: {
                tenant: { select: { id: true } },
                property: { select: { ownerId: true } },
              },
            },
          },
        })

        if (!charge) {
          server.log.warn({
            msg: 'BillingCharge não encontrada para asaasChargeId (PAYMENT_REFUNDED)',
            asaasChargeId: payment.id,
          })
          return reply.status(200).send({ received: true })
        }

        // Idempotência: ignorar se a cobrança já foi reembolsada
        if (charge.status === 'refunded') {
          server.log.info({
            msg: 'PAYMENT_REFUNDED ignorado — cobrança já foi reembolsada',
            chargeId: charge.id,
            asaasChargeId: payment.id,
          })
          return reply.status(200).send({ received: true })
        }

        const tenantId = charge.lease.tenant.id
        const ownerId = charge.lease.property.ownerId
        const paidAmount = charge.paidAmount ? Number(charge.paidAmount) : payment.value

        // Reverter cobrança e reembolsar saldo do proprietário em uma transação atômica
        const { prismaWithTenant } = await import('@tenora/db')
        const tenantDb = prismaWithTenant(tenantId)

        await tenantDb.$transaction(async (tx) => {
          // Atualizar status da cobrança para reembolsada
          await tx.billingCharge.update({
            where: { id: charge.id },
            data: {
              status: 'refunded',
              paidAmount: 0,
              paidAt: null,
            },
          })

          // Reverter saldo do proprietário se existir
          if (ownerId) {
            await tx.ownerAccount.upsert({
              where: { ownerId },
              update: { balance: { decrement: paidAmount } },
              create: { tenantId, ownerId, balance: -paidAmount },
            })
          }
        })

        server.log.info({
          msg: 'Cobrança reembolsada via webhook',
          tenantId,
          chargeId: charge.id,
          asaasChargeId: payment.id,
          refundedAmount: paidAmount,
          ownerId,
        })

        // Enfileirar notificação de reembolso
        await notificationSendQueue.add('notification-send', {
          tenantId,
          to: 'notification@tenora.app',
          subject: 'Reembolso Processado',
          body: `Reembolso da cobrança ${charge.reference || charge.id} foi processado. Valor: R$ ${paidAmount.toFixed(2)}`,
          leaseId: charge.leaseId,
        })

        server.log.info({
          msg: 'Notificação de reembolso enfileirada',
          tenantId,
          chargeId: charge.id,
        })
        break
      }

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_EXPIRED': {
        // Futuros eventos (out of scope)
        server.log.info({
          msg: 'Asaas event não tratado',
          event: body.event,
          paymentId: body.payment?.id,
        })
        break
      }

      default: {
        server.log.debug({
          msg: 'Asaas event type desconhecido',
          event: body.event,
        })
      }
    }

    // 4. Retornar 200 imediatamente (processamento é assíncrono)
    return reply.status(200).send({ received: true })
  })
}
