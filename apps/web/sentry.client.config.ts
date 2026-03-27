import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Captura 10% das transações em produção; 100% em dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: 10% de sessões normais, 100% de sessões com erro
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  // Não logar no console em produção
  debug: process.env.NODE_ENV === 'development',

  // Filtra erros originados em extensões de browser, crawlers e scripts de terceiros
  beforeSend(event) {
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? []
    if (frames.length === 0) return event

    const hasAppFrame = frames.some((f) => {
      const file = f.filename ?? ''
      return (
        !file.startsWith('chrome-extension://') &&
        !file.startsWith('moz-extension://') &&
        !file.includes('/node_modules/') &&
        file !== '<anonymous>'
      )
    })

    return hasAppFrame ? event : null
  },
})
