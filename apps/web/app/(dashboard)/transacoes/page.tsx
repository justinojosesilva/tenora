import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { TransactionsPageClient, type TransactionRow } from './_components/transactions-page-client'

export const metadata = { title: 'Transações — Tenora' }

type SearchParams = {
  status?: string
  type?: string
  bankAccountId?: string
  dateFrom?: string
  dateTo?: string
  page?: string
}

const PAGE_SIZE = 20
const VALID_STATUSES = ['pending', 'categorized', 'reviewed'] as const
const VALID_TYPES = ['credit', 'debit'] as const

type ValidStatus = (typeof VALID_STATUSES)[number]
type ValidType = (typeof VALID_TYPES)[number]

async function TransactionsSection({
  orgId,
  status,
  type,
  bankAccountId,
  dateFrom,
  dateTo,
  page,
}: {
  orgId: string
  status?: string
  type?: string
  bankAccountId?: string
  dateFrom?: string
  dateTo?: string
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const statusFilter = VALID_STATUSES.includes(status as ValidStatus)
    ? (status as ValidStatus)
    : undefined
  const typeFilter = VALID_TYPES.includes(type as ValidType) ? (type as ValidType) : undefined

  const dateWhere =
    dateFrom && dateTo
      ? { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } }
      : dateFrom
        ? { date: { gte: new Date(dateFrom) } }
        : dateTo
          ? { date: { lte: new Date(dateTo) } }
          : {}

  const baseWhere = {
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
    ...(bankAccountId && { bankAccountId }),
    ...dateWhere,
  }

  const [transactions, total, bankAccounts] = await Promise.all([
    db.transaction.findMany({
      where: baseWhere,
      include: {
        bankAccount: { select: { name: true } },
        lease: { select: { tenantName: true } },
        splits: { select: { id: true, party: true, amount: true, description: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.transaction.count({ where: baseWhere }),
    db.bankAccount.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const serialized: TransactionRow[] = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount.toString(),
    type: t.type as 'credit' | 'debit',
    status: t.status as 'pending' | 'categorized' | 'reviewed',
    date: t.date.toISOString(),
    bankAccount: t.bankAccount ? { name: t.bankAccount.name } : null,
    lease: t.lease ? { tenantName: t.lease.tenantName } : null,
    splits: t.splits.map((s) => ({
      id: s.id,
      party: s.party as 'agency' | 'owner',
      amount: s.amount.toString(),
      description: s.description,
    })),
  }))

  return (
    <TransactionsPageClient
      transactions={serialized}
      bankAccounts={bankAccounts}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      activeStatus={statusFilter ?? 'all'}
      activeType={typeFilter ?? 'all'}
      activeBankAccountId={bankAccountId ?? ''}
      activeDateFrom={dateFrom ?? ''}
      activeDateTo={dateTo ?? ''}
    />
  )
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/60" />
      <div className="flex gap-1 border-b pb-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-t-md bg-muted/40" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="border-b px-4 py-4 last:border-0">
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted/40" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/40" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted/40" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { orgId } = await auth()
  const params = await searchParams

  if (!orgId) return null

  const page = Math.max(1, Number(params.page ?? 1))

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsSection
          orgId={orgId}
          status={params.status}
          type={params.type}
          bankAccountId={params.bankAccountId}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          page={page}
        />
      </Suspense>
    </div>
  )
}
