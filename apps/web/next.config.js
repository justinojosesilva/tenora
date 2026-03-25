import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withSentryConfig(nextConfig, {
  // DSN para o Sentry CLI fazer upload de source maps no build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload de source maps apenas em produção (CI)
  silent: true,
  widenClientFileUpload: true,

  // Esconde source maps do bundle público
  hideSourceMaps: true,

  // Desativa o auto-instrumentação de rotas de API do Next.js
  // (usamos Fastify para a API, não Next.js API routes)
  disableLogger: true,

  // Não adiciona o Sentry SDK ao bundle se o DSN não estiver definido
  automaticVercelMonitors: false,
})
