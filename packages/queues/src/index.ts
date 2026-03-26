import { Queue, type ConnectionOptions } from 'bullmq'

// ---------------------------------------------------------------------------
// Conexão Redis (compartilhada entre filas)
// ---------------------------------------------------------------------------

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
}

// ---------------------------------------------------------------------------
// Nomes das filas
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  BANK_SYNC: 'bank-sync',
  BILLING_GENERATE: 'billing-generate',
  FINANCIAL_REPASSE: 'financial-repasse',
  NOTIFICATION_SEND: 'notification-send',
  DLQ: 'dlq',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ---------------------------------------------------------------------------
// Tipos dos dados de cada job
// ---------------------------------------------------------------------------

export interface BankSyncJobData {
  tenantId: string
  bankConnectionId: string
}

export interface BillingGenerateJobData {
  tenantId: string
  leaseId: string
  dueDate: string
}

export interface FinancialRepasseJobData {
  tenantId: string
  transactionId: string
  ownerId: string
  amount: number
}

export interface NotificationSendJobData {
  tenantId: string
  to: string
  subject: string
  body: string
}

export interface DlqJobData {
  originalQueue: string
  originalJobId: string | undefined
  originalJobName: string
  failedReason: string
  originalData: unknown
}

// ---------------------------------------------------------------------------
// Opções padrão — 3 tentativas com backoff customizado (1s, 5s, 30s)
// Os delays são aplicados pelo backoffStrategy registrado nos workers.
// removeOnFail: false mantém jobs falhos visíveis no Bull Board (padrão DLQ
// interno) até que sejam movidos para a fila dlq explícita.
// ---------------------------------------------------------------------------

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'custom',
  },
  removeOnComplete: { count: 100 },
  removeOnFail: false,
} as const

// ---------------------------------------------------------------------------
// Instâncias das filas
// ---------------------------------------------------------------------------

export const bankSyncQueue = new Queue<BankSyncJobData>(QUEUE_NAMES.BANK_SYNC, {
  connection: redisConnection,
  defaultJobOptions,
})

export const billingGenerateQueue = new Queue<BillingGenerateJobData>(
  QUEUE_NAMES.BILLING_GENERATE,
  {
    connection: redisConnection,
    defaultJobOptions,
  },
)

export const financialRepasseQueue = new Queue<FinancialRepasseJobData>(
  QUEUE_NAMES.FINANCIAL_REPASSE,
  { connection: redisConnection, defaultJobOptions },
)

export const notificationSendQueue = new Queue<NotificationSendJobData>(
  QUEUE_NAMES.NOTIFICATION_SEND,
  { connection: redisConnection, defaultJobOptions },
)

// Dead Letter Queue — recebe jobs que esgotaram todas as tentativas
export const dlqQueue = new Queue<DlqJobData>(QUEUE_NAMES.DLQ, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
})

// Lista de todas as filas (útil para registro no Bull Board e health checks)
export const queues = [
  bankSyncQueue,
  billingGenerateQueue,
  financialRepasseQueue,
  notificationSendQueue,
  dlqQueue,
] as const
