import * as Sentry from '@sentry/node'
import { Worker } from 'bullmq'
import { Resend } from 'resend'
import {
  QUEUE_NAMES,
  redisConnection,
  dlqQueue,
  notificationSendQueue,
  billingGenerateQueue,
  type BankSyncJobData,
  type BillingGenerateJobData,
  type FinancialRepasseJobData,
  type NotificationSendJobData,
} from '@tenora/queues'
import { db } from '@tenora/db'

// ---------------------------------------------------------------------------
// Estratégia de backoff customizada — delays: 1s, 5s, 30s
// Registrada em cada worker via settings.backoffStrategy.
// ---------------------------------------------------------------------------

const BACKOFF_DELAYS_MS = [1_000, 5_000, 30_000]

function backoffStrategy(attemptsMade: number): number {
  return BACKOFF_DELAYS_MS[attemptsMade - 1] ?? 30_000
}

const workerSettings = { backoffStrategy }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Envia alerta Slack quando um job é movido para a DLQ.
 * Inclui: fila, job ID, erro, tenant (extraído do job data).
 */
async function sendJobFailureSlackAlert(
  queue: string,
  job: {
    id?: string
    name: string
    data: unknown
  },
  err: Error,
) {
  const slackWebhook =
    process.env.SLACK_WEBHOOK_JOBS_FAILED || process.env.SLACK_WEBHOOK_BILLING_ALERTS
  if (!slackWebhook) return

  try {
    const jobData = job.data as Record<string, unknown>
    const tenantId = jobData.tenantId ?? 'unknown'

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Job falhou após todas as tentativas*`,
        attachments: [
          {
            color: 'danger',
            fields: [
              { title: 'Fila', value: queue, short: true },
              { title: 'Job ID', value: job.id ?? 'unknown', short: true },
              { title: 'Job Name', value: job.name, short: true },
              { title: 'Tenant', value: String(tenantId), short: true },
              { title: 'Erro', value: err.message, short: false },
            ],
          },
        ],
      }),
    })
  } catch (slackErr) {
    Sentry.captureException(slackErr)
  }
}

/**
 * Move o job para a Dead Letter Queue após esgotar todas as tentativas.
 * Acionado pelo evento 'failed' quando job.attemptsMade >= job.opts.attempts.
 */
async function moveToDlq(
  queue: string,
  job: {
    id?: string
    name: string
    attemptsMade: number
    opts: { attempts?: number }
    data: unknown
  },
  err: Error,
) {
  const maxAttempts = job.opts.attempts ?? 3

  // Captura no Sentry com contexto do job
  Sentry.withScope((scope) => {
    scope.setTag('queue', queue)
    scope.setTag('jobName', job.name)
    scope.setContext('job', {
      id: job.id,
      attemptsMade: job.attemptsMade,
      maxAttempts,
      data: job.data,
    })
    Sentry.captureException(err)
  })

  // Move para DLQ após esgotar tentativas
  if (job.attemptsMade >= maxAttempts) {
    await dlqQueue.add('failed-job', {
      originalQueue: queue,
      originalJobId: job.id,
      originalJobName: job.name,
      failedReason: err.message,
      originalData: job.data,
    })

    // Envia alerta Slack quando job é movido para DLQ
    await sendJobFailureSlackAlert(queue, job, err)
  }
}

// ---------------------------------------------------------------------------
// Cron: Scan de contratos vencendo (disparado diariamente às 08:00)
// ---------------------------------------------------------------------------

const EXPIRY_ALERT_DAYS = [30, 15, 7]

/**
 * Verifica se o alerta já foi enviado hoje para este contrato.
 * Usa lastExpiryAlertAt para dedup dentro do mesmo dia (UTC).
 */
function alreadySentToday(lastAlertAt: Date | null): boolean {
  if (!lastAlertAt) return false
  const today = new Date()
  return (
    lastAlertAt.getUTCFullYear() === today.getUTCFullYear() &&
    lastAlertAt.getUTCMonth() === today.getUTCMonth() &&
    lastAlertAt.getUTCDate() === today.getUTCDate()
  )
}

async function runLeaseExpiryScan() {
  const now = new Date()

  // Monta janelas de datas para cada threshold (30, 15 e 7 dias)
  const dateWindows = EXPIRY_ALERT_DAYS.map((days) => {
    const from = new Date(now)
    from.setUTCHours(0, 0, 0, 0)
    from.setUTCDate(from.getUTCDate() + days)

    const to = new Date(from)
    to.setUTCHours(23, 59, 59, 999)

    return { days, from, to }
  })

  for (const { days, from, to } of dateWindows) {
    const leases = await db.lease.findMany({
      where: {
        deletedAt: null,
        status: 'active',
        endDate: { gte: from, lte: to },
        tenantEmail: { not: null }, // só notifica se tiver email do inquilino
      },
      include: {
        property: { select: { address: true, city: true, state: true } },
      },
    })

    for (const lease of leases) {
      if (alreadySentToday(lease.lastExpiryAlertAt)) {
        continue
      }

      if (!lease.tenantEmail) continue

      const formattedDate = lease.endDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

      const propertyAddress = `${lease.property.address}, ${lease.property.city} - ${lease.property.state}`
      const dashboardUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}/dashboard/contracts`
        : 'https://app.tenora.com.br/dashboard/contracts'

      const subject = `⚠️ Seu contrato vence em ${days} dias — ${propertyAddress}`
      const body = buildExpiryEmailHtml({
        tenantName: lease.tenantName,
        propertyAddress,
        endDate: formattedDate,
        daysLeft: days,
        dashboardUrl,
      })

      await notificationSendQueue.add(
        'lease-expiry-alert',
        {
          tenantId: lease.tenantId,
          to: lease.tenantEmail,
          subject,
          body,
          leaseId: lease.id,
        },
        { jobId: `expiry-${lease.id}-${now.toISOString().slice(0, 10)}` }, // dedup por jobId único no dia
      )

      // Marca que o alerta foi disparado hoje
      await db.lease.update({
        where: { id: lease.id },
        data: { lastExpiryAlertAt: now },
      })
    }
  }
}

function buildExpiryEmailHtml(params: {
  tenantName: string
  propertyAddress: string
  endDate: string
  daysLeft: number
  dashboardUrl: string
}): string {
  const { tenantName, propertyAddress, endDate, daysLeft, dashboardUrl } = params
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 32px 16px; color: #111827;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <h2 style="color: #b45309; margin-top: 0;">⚠️ Contrato próximo do vencimento</h2>
    <p>Olá, <strong>${tenantName}</strong>!</p>
    <p>Seu contrato de locação referente ao imóvel abaixo vence em <strong>${daysLeft} dias</strong>:</p>
    <table style="width:100%; background:#f3f4f6; border-radius:6px; padding:16px; margin:16px 0; border-collapse:collapse;">
      <tr><td style="padding:4px 0; color:#6b7280;">Imóvel</td><td style="padding:4px 0; font-weight:600;">${propertyAddress}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Data de vencimento</td><td style="padding:4px 0; font-weight:600;">${endDate}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Dias restantes</td><td style="padding:4px 0; font-weight:600; color:#b45309;">${daysLeft} dias</td></tr>
    </table>
    <p>Acesse o dashboard para mais informações ou para renovar o contrato:</p>
    <a href="${dashboardUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; margin-top:8px;">
      Acessar Dashboard →
    </a>
    <p style="margin-top:32px; font-size:12px; color:#9ca3af;">
      Esta é uma mensagem automática do sistema Tenora. Por favor, não responda este e-mail.
    </p>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

function createBankSyncWorker() {
  const worker = new Worker<BankSyncJobData>(
    QUEUE_NAMES.BANK_SYNC,
    async (job) => {
      console.log(
        `[bank:sync] job ${job.id} | tenant=${job.data.tenantId} bankConnection=${job.data.bankConnectionId}`,
      )
      // TODO T-2x: implementar sincronização via Pluggy
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.BANK_SYNC, job, err)
  })

  return worker
}

function createBillingGenerateWorker() {
  const worker = new Worker<BillingGenerateJobData>(
    QUEUE_NAMES.BILLING_GENERATE,
    async (job) => {
      const { tenantId, leaseId, dueDate: dueDateStr } = job.data
      const dueDate = new Date(dueDateStr)

      // Handler especial para o trigger mensal que processa todos os contratos
      if (job.name === 'billing-generate-trigger') {
        console.log(`[billing:generate] job ${job.id} | gatilho mensal iniciado`)

        const now = new Date()
        const dueDay = 1 // Vencimento no 1º de cada mês

        // Iterar todos os tenants ativos
        const tenants = await db.tenant.findMany({ where: { status: 'active' } })

        for (const tenant of tenants) {
          // Iterar todos os contratos ativos do tenant
          const leases = await db.lease.findMany({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              status: 'active',
            },
          })

          for (const lease of leases) {
            // Enqueue job para cada contrato
            const monthDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay)
            await billingGenerateQueue.add(
              'lease-monthly-charge',
              {
                tenantId: tenant.id,
                leaseId: lease.id,
                dueDate: monthDueDate.toISOString(),
              },
              { priority: 10, jobId: `billing-${lease.id}-${monthDueDate.getTime()}` },
            )
          }

          console.log(
            `[billing:generate] job ${job.id} | ${leases.length} contratos enfileirados para tenant=${tenant.id}`,
          )
        }

        console.log(`[billing:generate] job ${job.id} | gatilho mensal concluído`)
        return
      }

      // Handler normal para jobs individuais
      console.log(
        `[billing:generate] job ${job.id} | tenant=${tenantId} lease=${leaseId} due=${dueDateStr}`,
      )

      // Idempotência: não criar duplicata para o mesmo mês/ano
      const startOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1)
      const endOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0, 23, 59, 59)

      const existingCharge = await db.billingCharge.findFirst({
        where: {
          tenantId,
          leaseId,
          dueDate: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'cancelled' },
        },
      })

      if (!existingCharge) {
        const lease = await db.lease.findUnique({ where: { id: leaseId } })
        if (!lease || lease.status === 'ended' || lease.deletedAt) {
          console.log(
            `[billing:generate] job ${job.id} | lease ${leaseId} não encontrado ou encerrado, pulando`,
          )
          return
        }

        const reference = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        await db.billingCharge.create({
          data: { tenantId, leaseId, amount: lease.rentAmount, dueDate, reference },
        })

        console.log(
          `[billing:generate] job ${job.id} | cobrança criada para lease=${leaseId} mês=${reference}`,
        )
      } else {
        console.log(
          `[billing:generate] job ${job.id} | cobrança já existe para lease=${leaseId} neste mês, pulando`,
        )
      }

      // Atualizar cobranças vencidas: pending + dueDate < hoje → overdue
      const updated = await db.billingCharge.updateMany({
        where: {
          tenantId,
          status: 'pending',
          dueDate: { lt: new Date() },
        },
        data: { status: 'overdue' },
      })

      if (updated.count > 0) {
        console.log(
          `[billing:generate] job ${job.id} | ${updated.count} cobranças marcadas como overdue para tenant=${tenantId}`,
        )
      }
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.BILLING_GENERATE, job, err)
  })

  return worker
}

function createFinancialRepasseWorker() {
  const worker = new Worker<FinancialRepasseJobData>(
    QUEUE_NAMES.FINANCIAL_REPASSE,
    async (job) => {
      console.log(
        `[financial:repasse] job ${job.id} | tenant=${job.data.tenantId} owner=${job.data.ownerId} amount=${job.data.amount}`,
      )
      // TODO T-2x: implementar repasse financeiro
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.FINANCIAL_REPASSE, job, err)
  })

  return worker
}

function createNotificationSendWorker() {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const worker = new Worker<NotificationSendJobData>(
    QUEUE_NAMES.NOTIFICATION_SEND,
    async (job) => {
      // job de scan diário — disparado pelo cron, processa internamente
      if (job.name === 'lease-expiry-scan') {
        console.log(`[notification:send] job ${job.id} | lease-expiry-scan iniciado`)
        await runLeaseExpiryScan()
        console.log(`[notification:send] job ${job.id} | lease-expiry-scan concluído`)
        return
      }

      // job de envio de e-mail
      console.log(
        `[notification:send] job ${job.id} | tenant=${job.data.tenantId} to=${job.data.to} subject="${job.data.subject}"`,
      )

      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Tenora <noreply@tenora.com.br>',
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.body,
      })

      if (error) {
        throw new Error(`Resend error: ${error.message}`)
      }
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.NOTIFICATION_SEND, job, err)
  })

  return worker
}

// ---------------------------------------------------------------------------
// Cron: agendar scan diário de contratos vencendo (08:00 UTC)
// ---------------------------------------------------------------------------

async function scheduleDailyLeaseExpiryScan() {
  // Remove jobs repetíveis antigos com o mesmo nome para evitar duplicatas ao reiniciar
  const repeatableJobs = await notificationSendQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'lease-expiry-scan') {
      await notificationSendQueue.removeRepeatableByKey(job.key)
    }
  }

  await notificationSendQueue.add(
    'lease-expiry-scan',
    // NotificationSendJobData requer `to`, `subject`, `body` e `tenantId` —
    // para o scan não precisamos destes campos, usamos strings vazias como sentinela.
    { tenantId: 'system', to: '', subject: '', body: '' },
    {
      repeat: { pattern: '0 8 * * *', utc: true },
      jobId: 'lease-expiry-scan-cron',
    },
  )

  console.log('[jobs] Cron lease-expiry-scan agendado: 0 8 * * * (UTC)')
}

// ---------------------------------------------------------------------------
// Cron: agendar geração mensal de cobranças (1º do mês, 06:00 UTC)
// ---------------------------------------------------------------------------

async function scheduleMonthlyBillingGenerate() {
  // Remove jobs repetíveis antigos com o mesmo nome para evitar duplicatas ao reiniciar
  const repeatableJobs = await billingGenerateQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'billing-generate-trigger') {
      await billingGenerateQueue.removeRepeatableByKey(job.key)
    }
  }

  await billingGenerateQueue.add(
    'billing-generate-trigger',
    // Payload com valores de sentinela — o job processará todos os contratos ativos
    { tenantId: 'system', leaseId: 'system', dueDate: new Date().toISOString() },
    {
      repeat: { pattern: '0 6 1 * *', utc: true },
      jobId: 'billing-generate-trigger-cron',
    },
  )

  console.log('[jobs] Cron billing-generate-trigger agendado: 0 6 1 * * (UTC)')
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

export async function startWorkers() {
  const workers = [
    createBankSyncWorker(),
    createBillingGenerateWorker(),
    createFinancialRepasseWorker(),
    createNotificationSendWorker(),
  ]

  console.log(
    `[jobs] ${workers.length} workers iniciados: ${Object.values(QUEUE_NAMES)
      .filter((n) => n !== 'dlq')
      .join(', ')}`,
  )

  await scheduleDailyLeaseExpiryScan()
  await scheduleMonthlyBillingGenerate()

  return workers
}
