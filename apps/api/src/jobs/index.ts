import { Worker } from 'bullmq'
import {
  QUEUE_NAMES,
  redisConnection,
  dlqQueue,
  type BankSyncJobData,
  type BillingGenerateJobData,
  type FinancialRepasseJobData,
  type NotificationSendJobData,
} from '@tenora/queues'

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
  failedReason: string,
) {
  const maxAttempts = job.opts.attempts ?? 3
  if (job.attemptsMade >= maxAttempts) {
    await dlqQueue.add('failed-job', {
      originalQueue: queue,
      originalJobId: job.id,
      originalJobName: job.name,
      failedReason,
      originalData: job.data,
    })
  }
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
    if (job) await moveToDlq(QUEUE_NAMES.BANK_SYNC, job, err.message)
  })

  return worker
}

function createBillingGenerateWorker() {
  const worker = new Worker<BillingGenerateJobData>(
    QUEUE_NAMES.BILLING_GENERATE,
    async (job) => {
      console.log(
        `[billing:generate] job ${job.id} | tenant=${job.data.tenantId} lease=${job.data.leaseId} due=${job.data.dueDate}`,
      )
      // TODO T-2x: implementar geração de cobranças
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.BILLING_GENERATE, job, err.message)
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
    if (job) await moveToDlq(QUEUE_NAMES.FINANCIAL_REPASSE, job, err.message)
  })

  return worker
}

function createNotificationSendWorker() {
  const worker = new Worker<NotificationSendJobData>(
    QUEUE_NAMES.NOTIFICATION_SEND,
    async (job) => {
      console.log(
        `[notification:send] job ${job.id} | tenant=${job.data.tenantId} to=${job.data.to} subject="${job.data.subject}"`,
      )
      // TODO T-2x: implementar envio de notificações (email/push)
    },
    { connection: redisConnection, settings: workerSettings },
  )

  worker.on('failed', async (job, err) => {
    if (job) await moveToDlq(QUEUE_NAMES.NOTIFICATION_SEND, job, err.message)
  })

  return worker
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

  return workers
}
