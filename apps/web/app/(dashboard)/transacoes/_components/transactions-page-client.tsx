'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TransactionRow = {
  id: string
  description: string
  amount: string
  type: 'credit' | 'debit'
  status: 'pending' | 'categorized' | 'reviewed'
  date: string
  bankAccount: { name: string } | null
  lease: { tenantName: string } | null
  splits: Array<{
    id: string
    party: 'agency' | 'owner'
    amount: string
    description: string | null
  }>
}

type BankAccountOption = { id: string; name: string }

type Props = {
  transactions: TransactionRow[]
  bankAccounts: BankAccountOption[]
  total: number
  page: number
  totalPages: number
  activeStatus: string
  activeType: string
  activeBankAccountId: string
  activeDateFrom: string
  activeDateTo: string
}

const STATUS_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Não categorizadas' },
  { key: 'categorized', label: 'Categorizadas' },
  { key: 'reviewed', label: 'Revisadas' },
]

const STATUS_CONFIG: Record<TransactionRow['status'], { label: string; className: string }> = {
  pending: {
    label: 'Não categorizada',
    className: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  categorized: {
    label: 'Categorizada',
    className: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  reviewed: {
    label: 'Revisada',
    className: 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]',
  },
}

function formatCurrency(value: string | number) {
  return parseFloat(String(value)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function StatusBadge({ status }: { status: TransactionRow['status'] }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 whitespace-nowrap font-medium', config.className)}
    >
      {config.label}
    </Badge>
  )
}

function TypeBadge({ type }: { type: TransactionRow['type'] }) {
  const Icon = type === 'credit' ? ArrowUpCircle : ArrowDownCircle
  const className =
    type === 'credit'
      ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
      : 'border-[#E24B4A] bg-[#E24B4A]/10 text-[#E24B4A]'
  const label = type === 'credit' ? 'Crédito' : 'Débito'

  return (
    <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap font-medium', className)}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  )
}

function SplitInfo({ splits }: { splits: TransactionRow['splits'] }) {
  if (splits.length === 0) {
    return (
      <Badge
        variant="outline"
        className="shrink-0 whitespace-nowrap font-medium border-amber-500 bg-amber-50 text-amber-700"
      >
        Não processada
      </Badge>
    )
  }

  const agency = splits.find((s) => s.party === 'agency')
  const owner = splits.find((s) => s.party === 'owner')

  return (
    <div className="flex items-center gap-2">
      {agency && (
        <span className="text-xs font-medium">Agência: {formatCurrency(agency.amount)}</span>
      )}
      {owner && (
        <span className="text-xs font-medium">Proprietário: {formatCurrency(owner.amount)}</span>
      )}
    </div>
  )
}

function TransactionDetailDrawer({
  transaction,
  isOpen,
  onClose,
}: {
  transaction: TransactionRow | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !transaction) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-background shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Detalhes da Transação</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Transação Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Informações da Transação
            </h3>
            <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{formatDate(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-medium text-right">{transaction.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span
                  className={cn(
                    'font-semibold',
                    transaction.type === 'credit' ? 'text-[#1D9E75]' : 'text-[#E24B4A]',
                  )}
                >
                  {transaction.type === 'credit' ? '+' : '−'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              {transaction.lease && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contrato:</span>
                  <span className="font-medium">{transaction.lease.tenantName}</span>
                </div>
              )}
              {transaction.bankAccount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conta:</span>
                  <span className="font-medium">{transaction.bankAccount.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Split Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Divisão Financeira</h3>
            {transaction.splits.length === 0 ? (
              <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700">
                Não processada
              </Badge>
            ) : (
              <div className="space-y-2">
                {transaction.splits.map((split) => (
                  <div key={split.id} className="flex justify-between rounded-lg bg-muted/30 p-3">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {split.party === 'agency' ? 'Agência' : 'Proprietário'}
                      </p>
                      {split.description && (
                        <p className="text-xs text-muted-foreground">{split.description}</p>
                      )}
                    </div>
                    <p className="font-semibold">{formatCurrency(split.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function TransactionsPageClient({
  transactions,
  bankAccounts,
  total,
  page,
  totalPages,
  activeStatus,
  activeType,
  activeBankAccountId,
  activeDateFrom,
  activeDateTo,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    params.delete('page')
    return `/transacoes?${params.toString()}`
  }

  function handleFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value }))
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total > 0
              ? `${total} ${total === 1 ? 'transação' : 'transações'} encontradas`
              : 'Transações sincronizadas das contas bancárias'}
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key || (tab.key === 'all' && activeStatus === 'all')
          return (
            <Link
              key={tab.key}
              href={buildUrl({ status: tab.key })}
              className={cn(
                'flex shrink-0 items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        {/* Tipo */}
        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
          value={activeType === 'all' ? '' : activeType}
          onChange={(e) => handleFilter('type', e.target.value || 'all')}
        >
          <option value="">Todos os tipos</option>
          <option value="credit">Crédito</option>
          <option value="debit">Débito</option>
        </select>

        {/* Conta */}
        {bankAccounts.length > 0 && (
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
            value={activeBankAccountId}
            onChange={(e) => handleFilter('bankAccountId', e.target.value || 'all')}
          >
            <option value="">Todas as contas</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {/* Período — de */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">De</label>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
            defaultValue={activeDateFrom}
            onBlur={(e) => handleFilter('dateFrom', e.target.value || 'all')}
          />
        </div>

        {/* Período — até */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Até</label>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
            defaultValue={activeDateTo}
            onBlur={(e) => handleFilter('dateTo', e.target.value || 'all')}
          />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ArrowLeftRight className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma transação encontrada</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            As transações aparecerão aqui após a sincronização bancária
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Split</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => {
                      setSelectedTransaction(t)
                      setIsDrawerOpen(true)
                    }}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium">{t.description}</p>
                      {t.lease && (
                        <p className="text-xs text-muted-foreground">{t.lease.tenantName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.bankAccount?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={t.type} />
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-semibold',
                        t.type === 'credit' ? 'text-[#1D9E75]' : 'text-[#E24B4A]',
                      )}
                    >
                      {t.type === 'credit' ? '+' : '−'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <SplitInfo splits={t.splits} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="cursor-pointer rounded-xl border p-4 transition-colors hover:bg-muted/30"
                onClick={() => {
                  setSelectedTransaction(t)
                  setIsDrawerOpen(true)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={t.status} />
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      t.type === 'credit' ? 'text-[#1D9E75]' : 'text-[#E24B4A]',
                    )}
                  >
                    {t.type === 'credit' ? '+' : '−'}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
                <p className="mt-2 truncate font-medium">{t.description}</p>
                {t.lease && <p className="text-sm text-muted-foreground">{t.lease.tenantName}</p>}
                <div className="mt-3 border-t pt-2">
                  <SplitInfo splits={t.splits} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(t.date)}</span>
                  {t.bankAccount && (
                    <>
                      <span>·</span>
                      <span>{t.bankAccount.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <TypeBadge type={t.type} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              {page > 1 && (
                <Link
                  href={`/transacoes?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(page - 1) }).toString()}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Anterior
                </Link>
              )}
              <p className="text-center text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              {page < totalPages && (
                <Link
                  href={`/transacoes?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(page + 1) }).toString()}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Próxima →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  )
}
