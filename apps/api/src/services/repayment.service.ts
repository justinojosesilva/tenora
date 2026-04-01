import type { PrismaClient } from '@prisma/client'

/**
 * Calcula o valor total de repasse ao proprietário para um período específico.
 *
 * Soma todos os TransactionSplit com party === 'owner' para transações
 * que ocorreram no mês/ano indicado (período em formato "YYYY-MM").
 */
export async function calculateRepaymentAmount(
  db: PrismaClient,
  tenantId: string,
  ownerId: string,
  period: string, // "2026-04"
): Promise<number> {
  const parts = period.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  const splits = await db.transactionSplit.findMany({
    where: {
      tenantId,
      party: 'owner',
      transaction: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        lease: {
          property: {
            ownerId,
          },
        },
      },
    },
  })

  return splits.reduce((sum, split) => sum + Number(split.amount), 0)
}
