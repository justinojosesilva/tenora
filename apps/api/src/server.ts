import Fastify from 'fastify'
import clerkPlugin from '@clerk/fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { getAuth } from '@clerk/fastify'
import { appRouter } from './routers/_app.router.js'
import { createContext } from '@tenora/trpc'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { startWorkers } from './jobs/index.js'
import { registerWebhooks } from './webhooks/index.js'
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
server.register(clerkPlugin as any, {
  secretKey: process.env.CLERK_SECRET_KEY,
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

// Hook para log com tenantId e userId
server.addHook('onRequest', async (request) => {
  const auth = getAuth(request)
  if (auth?.userId && auth?.orgId) {
    server.log.info({
      userId: auth.userId,
      tenantId: auth.orgId,
      path: request.url,
      method: request.method,
    })
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

server.get('/health', async () => {
  const { db } = await import('@tenora/db')
  const redis = new (Redis as any)({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
  })

  let dbStatus = 'disconnected'
  let redisStatus = 'disconnected'

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

  const allHealthy = dbStatus === 'connected' && redisStatus === 'connected'

  return {
    status: allHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  }
})

const start = async () => {
  try {
    await startWorkers()
    const port = Number(process.env.API_PORT ?? 3001)
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info(`🚀 Server is running at http://0.0.0.0:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
