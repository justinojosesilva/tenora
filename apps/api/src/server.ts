// Sentry DEVE ser inicializado antes de qualquer outro import
import './instrumentation.js'

import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import { clerkPlugin, getAuth } from '@clerk/fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { appRouter } from './routers/_app.router.js'
import { createContext } from '@tenora/trpc'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { startWorkers } from './jobs/index.js'
import { registerWebhooks } from './webhooks/index.js'
import { queues } from '@tenora/queues'
import Redis from 'ioredis'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    serializers: {
      req: (request) => {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
        }
      },
    },
  },
})

// Registrar Clerk
server.register(clerkPlugin, {
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey:
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
})

// Registrar CORS
await server.register(cors, {
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
  credentials: true,
})

// Registrar Rate Limit (100 req/min por IP em rotas públicas)
await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['/health'],
})

// Hook: log estruturado + enriquecimento do scope Sentry com userId e tenantId
server.addHook('preHandler', async (request) => {
  const auth = getAuth(request)
  if (auth?.userId && auth?.orgId) {
    server.log.info({
      userId: auth.userId,
      tenantId: auth.orgId,
      path: request.url,
      method: request.method,
    })

    Sentry.setUser({ id: auth.userId })
    Sentry.setTag('tenantId', auth.orgId)
    Sentry.setTag('http.path', request.url)
  }
})

// Hook: capturar erros críticos e enviar alertas para Slack
server.addHook('onError', async (request, reply, error) => {
  const { sendSentryErrorToSlack } = await import('./lib/sentry-slack-alert.js')
  const auth = getAuth(request)

  // Apenas enviar para Slack se for erro 5xx (crítico)
  if (reply.statusCode >= 500) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorPath = request.url
    const userId = auth?.userId
    const tenantId = auth?.orgId

    await sendSentryErrorToSlack('error', errorMessage, errorPath, userId, tenantId)
  }
})

// Registrar tRPC adapter
await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: createContext,
  },
})

registerWebhooks(server)

// Bull Board — /admin/queues (somente role admin)
const bullBoardAdapter = new FastifyAdapter()
bullBoardAdapter.setBasePath('/admin/queues')
createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(q)),
  serverAdapter: bullBoardAdapter,
})
server.register(async (instance) => {
  instance.addHook('preHandler', async (request, reply) => {
    const auth = getAuth(request)
    if (!auth?.userId || !auth?.orgId) {
      return reply.code(401).send({ error: 'Não autenticado' })
    }
    const role = (auth.sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined
    if (role !== 'admin') {
      return reply.code(403).send({ error: 'Acesso negado' })
    }
  })
  await instance.register(bullBoardAdapter.registerPlugin(), { prefix: '/admin/queues' })
})

server.get('/health', async () => {
  const { db } = await import('@tenora/db')
  const redisUrl = process.env.REDIS_URL
  const redisOpts = redisUrl
    ? (() => {
        const { hostname, port, password } = new URL(redisUrl)
        return { host: hostname, port: Number(port) || 6379, password: password || undefined }
      })()
    : {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      }
  const redis = new Redis({ ...redisOpts, lazyConnect: true })

  let dbStatus = 'disconnected'
  let redisStatus = 'disconnected'
  let pluggyStatus = 'disconnected'
  let pluggyEnv = 'unconfigured'
  let asaasStatus = 'disconnected'
  let asaasEnv = 'unconfigured'

  try {
    await db.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    server.log.error({ msg: 'DB health check failed', error })
  }

  try {
    await redis.ping()
    redisStatus = 'connected'
  } catch (error) {
    server.log.error({ msg: 'Redis health check failed', error })
  } finally {
    await redis.quit()
  }

  // Validar configuração do Pluggy
  const pluggyClientId = process.env.PLUGGY_CLIENT_ID
  const pluggyClientSecret = process.env.PLUGGY_CLIENT_SECRET
  const pluggyWebhookSecret = process.env.PLUGGY_WEBHOOK_SECRET
  pluggyEnv = process.env.PLUGGY_ENV || 'unconfigured'

  if (pluggyClientId && pluggyClientSecret && pluggyWebhookSecret) {
    pluggyStatus = 'configured'
  } else {
    server.log.warn({
      msg: 'Pluggy configuration incomplete',
      hasClientId: !!pluggyClientId,
      hasClientSecret: !!pluggyClientSecret,
      hasWebhookSecret: !!pluggyWebhookSecret,
    })
  }

  // Validar configuração do Asaas
  const asaasApiKey = process.env.ASAAS_API_KEY
  const asaasApiEnv = process.env.ASAAS_ENV
  const asaasWebhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  asaasEnv = asaasApiEnv || 'unconfigured'

  if (asaasApiKey && asaasApiEnv && asaasWebhookToken) {
    asaasStatus = 'connected'
  } else {
    server.log.warn({
      msg: 'Asaas configuration incomplete',
      hasApiKey: !!asaasApiKey,
      hasEnv: !!asaasApiEnv,
      hasWebhookToken: !!asaasWebhookToken,
    })
  }

  const allHealthy =
    dbStatus === 'connected' &&
    redisStatus === 'connected' &&
    pluggyStatus === 'configured' &&
    asaasStatus === 'connected'

  return {
    status: allHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    pluggy: { status: pluggyStatus, env: pluggyEnv },
    asaas: { status: asaasStatus, env: asaasEnv },
    timestamp: new Date().toISOString(),
  }
})

// Registrar error handler do Sentry (captura exceções não tratadas do Fastify)
Sentry.setupFastifyErrorHandler(server)

const start = async () => {
  try {
    await startWorkers()
    const port = Number(process.env.API_PORT ?? 3001)
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info(`🚀 Server is running at http://0.0.0.0:${port}`)
  } catch (err) {
    Sentry.captureException(err)
    server.log.error(err)
    process.exit(1)
  }
}

start()
