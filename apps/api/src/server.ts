import Fastify from "fastify"
import { appRouter } from "./routers/_app.router.js"
import { createContext } from "./context.js"
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify" 
import { startWorkers } from "./jobs/index.js"
import { registerWebhooks } from "./webhooks/index.js"

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    serializers: {
      req: (request) => {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
        }
      }
    }
  }
})

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: createContext,
  },  
})

registerWebhooks(server)

server.get("/health", async () => { 
  const { db } = await import('@tenora/db')
  try {
    await db.$queryRaw`SELECT 1`
    return { status: "ok", db: "connected", ts: new Date().toISOString() }
  } catch (error) {
    return { status: "degraded", db: "disconnected" }
  }
})

const start = async () => {
  try {
    await startWorkers()
    await server.listen({ port: Number(process.env.API_PORT) ?? 3001, host: "0.0.0.0" })
    server.log.info(`Server is running at http://localhost:${process.env.API_PORT ?? 3001}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}