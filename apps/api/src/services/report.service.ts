import type { PrismaClient } from '@prisma/client'

export interface CashFlowDay {
  date: string // YYYY-MM-DD
  entries: number // type = 'credit'
  exits: number // type = 'debit'
  balance: number // running balance after this day
}

export interface CashFlowReport {
  period: string // YYYY-MM
  openingBalance: number
  closingBalance: number
  variation: number // closingBalance - openingBalance
  days: CashFlowDay[]
}

/**
 * Calcula o fluxo de caixa real por período.
 * Agrupa transações por dia e calcula saldo acumulado.
 */
export async function calculateCashFlow(
  db: PrismaClient,
  tenantId: string,
  period: string, // "2026-04"
  bankAccountId?: string,
): Promise<CashFlowReport> {
  const parts = period.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999)

  // Query all transactions in the period
  const transactions = await db.transaction.findMany({
    where: {
      tenantId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      ...(bankAccountId && { bankAccountId }),
    },
    orderBy: { date: 'asc' },
  })

  // Calculate opening balance from transactions before the period
  const beforePeriod = await db.transaction.findMany({
    where: {
      tenantId,
      date: {
        lt: periodStart,
      },
      ...(bankAccountId && { bankAccountId }),
    },
  })

  const openingBalance = beforePeriod.reduce((sum, tx) => {
    const amount = Number(tx.amount)
    return tx.type === 'credit' ? sum + amount : sum - amount
  }, 0)

  // Group by day and calculate balance
  const dayMap = new Map<string, { entries: number; exits: number }>()

  transactions.forEach((tx) => {
    const dateStr = tx.date.toISOString().split('T')[0] || ''
    const entry = dayMap.get(dateStr) || { entries: 0, exits: 0 }

    if (tx.type === 'credit') {
      entry.entries += Number(tx.amount)
    } else {
      entry.exits += Number(tx.amount)
    }

    dayMap.set(dateStr, entry)
  })

  // Build daily report with running balance
  let runningBalance = openingBalance
  const days: CashFlowDay[] = Array.from(dayMap.entries()).map(([dateStr, { entries, exits }]) => {
    runningBalance += entries - exits
    return {
      date: dateStr,
      entries,
      exits,
      balance: runningBalance,
    }
  })

  const closingBalance = runningBalance

  return {
    period,
    openingBalance,
    closingBalance,
    variation: closingBalance - openingBalance,
    days,
  }
}
