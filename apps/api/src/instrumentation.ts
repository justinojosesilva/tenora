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

  // beforeSend: filtra e enriquece eventos de erro
  beforeSend(event, hint) {
    // Ignorar erros de conexão/timeout do banco de dados que não são críticos
    if (hint.originalException instanceof Error) {
      const msg = hint.originalException.message
      // Passthrough para erros reais
      if (msg.includes('connect') || msg.includes('timeout')) {
        // Logar mas não enviar para Sentry em dev
        if (process.env.NODE_ENV !== 'production') {
          return null
        }
      }
    }

    // Enriquecer com informações do evento
    if (event.exception) {
      const statusCode = event.tags?.['http.status_code']

      // Marcar erros 5xx como críticos
      if (statusCode && parseInt(String(statusCode)) >= 500) {
        event.level = 'fatal'
        event.tags = event.tags || {}
        event.tags['critical_error'] = 'true'
      }
    }

    return event
  },
})
