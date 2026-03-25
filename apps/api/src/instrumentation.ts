/**
 * Sentry — Node.js instrumentation para apps/api (Fastify 5)
 *
 * Este módulo DEVE ser importado antes de qualquer outro no server.ts para
 * garantir que o SDK intercepte erros desde o início da execução.
 */
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  // Captura 10% das transações em produção; 100% em dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Não logar no console em produção
  debug: process.env.NODE_ENV === 'development',
})
