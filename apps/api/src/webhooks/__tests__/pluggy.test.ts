import { createHmac } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerWebhooks } from '../index'

// Mock @tenora/db
vi.mock('@tenora/db', () => ({
  db: {
    bankConnection: {
      findFirst: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

// Mock @tenora/queues
vi.mock('@tenora/queues', () => ({
  bankSyncQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  },
}))

// Mock svix
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockReturnValue({ type: 'unknown' }),
  })),
}))

// Mock stripe
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'unknown', data: { object: {} } }),
    },
  })),
}))

const WEBHOOK_SECRET = 'test-secret-pluggy'

function makeSignature(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

async function buildServer() {
  const app = Fastify({ logger: false })
  await registerWebhooks(app)
  return app
}

describe('POST /webhooks/pluggy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PLUGGY_WEBHOOK_SECRET = WEBHOOK_SECRET
  })

  it('retorna 400 quando assinatura está ausente', async () => {
    const app = await buildServer()

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: { event: 'transactions/created', itemId: 'item-1' },
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'Missing x-pluggy-signature header' })
  })

  it('retorna 400 quando assinatura é inválida', async () => {
    const app = await buildServer()
    const body = JSON.stringify({ event: 'transactions/created', itemId: 'item-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-pluggy-signature':
          'sha256=invalidsignature00000000000000000000000000000000000000000000000',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'Invalid signature' })
  })

  it('retorna 200 e enfileira job quando BankConnection existe', async () => {
    const { db } = await import('@tenora/db')
    const { bankSyncQueue } = await import('@tenora/queues')

    vi.mocked(db.bankConnection.findFirst).mockResolvedValue({
      id: 'conn-1',
      bankAccountId: 'ba-1',
      pluggyItemId: 'item-1',
      pluggyAccountId: 'acct-1',
      status: 'active',
      lastSyncedAt: null,
      createdAt: new Date(),
      bankAccount: { tenantId: 'tenant-1' },
    } as never)

    const app = await buildServer()
    const body = JSON.stringify({ event: 'transactions/created', itemId: 'item-1' })
    const sig = makeSignature(body, WEBHOOK_SECRET)

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-pluggy-signature': sig,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ received: true })
    expect(bankSyncQueue.add).toHaveBeenCalledWith('bank-sync', {
      tenantId: 'tenant-1',
      bankConnectionId: 'conn-1',
    })
  })

  it('retorna 200 sem enfileirar quando BankConnection não existe', async () => {
    const { db } = await import('@tenora/db')
    const { bankSyncQueue } = await import('@tenora/queues')

    vi.mocked(db.bankConnection.findFirst).mockResolvedValue(null)

    const app = await buildServer()
    const body = JSON.stringify({ event: 'transactions/created', itemId: 'item-unknown' })
    const sig = makeSignature(body, WEBHOOK_SECRET)

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-pluggy-signature': sig,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(bankSyncQueue.add).not.toHaveBeenCalled()
  })

  it('aceita assinatura sem prefixo sha256=', async () => {
    const { db } = await import('@tenora/db')

    vi.mocked(db.bankConnection.findFirst).mockResolvedValue({
      id: 'conn-2',
      bankAccountId: 'ba-2',
      pluggyItemId: 'item-2',
      pluggyAccountId: 'acct-2',
      status: 'active',
      lastSyncedAt: null,
      createdAt: new Date(),
      bankAccount: { tenantId: 'tenant-2' },
    } as never)

    const app = await buildServer()
    const body = JSON.stringify({ event: 'transactions/updated', itemId: 'item-2' })
    // Assinatura sem prefixo "sha256="
    const sig = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-pluggy-signature': sig,
      },
    })

    expect(response.statusCode).toBe(200)
  })

  it('retorna 500 quando PLUGGY_WEBHOOK_SECRET não está configurada', async () => {
    delete process.env.PLUGGY_WEBHOOK_SECRET

    const app = await buildServer()

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pluggy',
      payload: { event: 'transactions/created', itemId: 'item-1' },
    })

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'Webhook secret not configured' })
  })
})
