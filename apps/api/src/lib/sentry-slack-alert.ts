/**
 * Integração de alertas do Sentry com Slack para erros críticos (500+)
 */

export async function sendSentryErrorToSlack(
  errorLevel: string,
  errorMessage: string,
  errorPath?: string,
  userId?: string | null,
  tenantId?: string | null,
): Promise<void> {
  const slackWebhook = process.env.SLACK_WEBHOOK_SENTRY_ALERTS

  if (!slackWebhook) {
    return // Silenciosamente ignorar se não houver webhook configurado
  }

  // Apenas enviar para erros críticos (level = fatal ou error com 500+)
  if (!['fatal', 'error'].includes(errorLevel)) {
    return
  }

  try {
    const sentryProjectId = process.env.SENTRY_DSN?.split('/').pop()?.split('@')[0]
    const sentryEnv = process.env.NODE_ENV ?? 'development'

    const message = {
      text: `🚨 *Erro Crítico no Sentry* — ${sentryEnv}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'Nível', value: errorLevel.toUpperCase(), short: true },
            { title: 'Ambiente', value: sentryEnv, short: true },
            { title: 'Mensagem', value: errorMessage, short: false },
            ...(errorPath ? [{ title: 'Path', value: errorPath, short: true }] : []),
            ...(userId ? [{ title: 'User ID', value: userId, short: true }] : []),
            ...(tenantId ? [{ title: 'Tenant ID', value: tenantId, short: true }] : []),
            {
              title: 'Projeto',
              value: sentryProjectId ?? 'unknown',
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            },
          ],
        },
      ],
    }

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
  } catch (err) {
    console.error('[sentry-slack-alert] Falha ao enviar alerta para Slack:', err)
  }
}
