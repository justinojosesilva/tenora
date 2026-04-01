'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChargesStatusBadge, type ChargeStatus } from './charges-status-badge'
import { markAsPaidAction, cancelChargeAction } from '@/app/(dashboard)/cobrancas/actions'
import { trackPaymentReceived } from '@/lib/analytics'

export type ChargeRow = {
  id: string
  leaseId: string
  amount: string
  dueDate: string
  paidAt: string | null
  paidAmount: string | null
  status: ChargeStatus
  reference: string | null
  type: 'pix' | 'boleto' | 'transfer'
  lease: {
    tenantName: string
    property: { address: string; city: string | null; owner: { name: string } | null }
  }
}

type TabSummary = { count: number; total: number }

type Props = {
  charges: ChargeRow[]
  tabSummaries: {
    all: TabSummary
    pending: TabSummary
    paid: TabSummary
    overdue: TabSummary
  }
  canWrite: boolean
  total: number
  page: number
  totalPages: number
  activeTab: string
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Em Aberto' },
  { key: 'paid', label: 'Pagas' },
  { key: 'overdue', label: 'Em Atraso' },
]

const EMPTY_MESSAGES: Record<string, string> = {
  all: 'Nenhuma cobrança encontrada',
  pending: 'Nenhuma cobrança em aberto',
  paid: 'Nenhuma cobrança paga',
  overdue: 'Nenhuma cobrança em atraso',
}

const EMPTY_SUBTITLES: Record<string, string> = {
  all: 'As cobranças aparecerão aqui quando contratos forem criados',
  pending: 'Todas as cobranças estão pagas ou canceladas',
  paid: 'Nenhum pagamento registrado ainda',
  overdue: 'Parabéns! Não há cobranças em atraso',
}

function formatCurrency(value: number | string) {
  return parseFloat(String(value)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

type MarkPaidModalProps = {
  chargeId: string
  amount: string
  chargeType: 'pix' | 'boleto' | 'transfer'
  onClose: () => void
}

function MarkPaidModal({ chargeId, amount, chargeType, onClose }: MarkPaidModalProps) {
  const [isPending, startTransition] = useTransition()
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().substring(0, 10))
  const [paidAmount, setPaidAmount] = useState(parseFloat(amount).toFixed(2))
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await markAsPaidAction(chargeId, parseFloat(paidAmount), new Date(paidAt))
      if (result?.error) {
        setError(result.error)
      } else {
        // Track payment_received event
        trackPaymentReceived(
          chargeId,
          chargeType,
          parseFloat(paidAmount),
          new Date(paidAt).toISOString(),
        )
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold">Marcar como Pago</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="paidAt">
              Data do pagamento
            </label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="paidAmount">
              Valor recebido (R$)
            </label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Salvando…' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ChargesPageClient({
  charges,
  tabSummaries,
  canWrite,
  total: _total,
  page,
  totalPages,
  activeTab,
}: Props) {
  const searchParams = useSearchParams()
  const [markPaidId, setMarkPaidId] = useState<string | null>(null)
  const [markPaidAmount, setMarkPaidAmount] = useState<string>('0')
  const [markPaidType, setMarkPaidType] = useState<'pix' | 'boleto' | 'transfer'>('pix')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function buildTabUrl(tabKey: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (tabKey === 'all') {
      params.delete('status')
    } else {
      params.set('status', tabKey)
    }
    params.delete('page')
    return `/cobrancas?${params.toString()}`
  }

  function openMarkPaid(charge: ChargeRow) {
    setMarkPaidId(charge.id)
    setMarkPaidAmount(charge.amount)
    setMarkPaidType(charge.type)
  }

  function handleCancel(id: string) {
    if (!confirm('Tem certeza que deseja cancelar esta cobrança? Esta ação não pode ser desfeita.'))
      return
    startTransition(async () => {
      await cancelChargeAction(id)
      setCancellingId(null)
    })
  }

  const summaryKey =
    activeTab === 'all' || !activeTab ? 'all' : (activeTab as keyof typeof tabSummaries)
  const activeSummary = tabSummaries[summaryKey] ?? tabSummaries.all

  return (
    <>
      {markPaidId && (
        <MarkPaidModal
          chargeId={markPaidId}
          amount={markPaidAmount}
          chargeType={markPaidType}
          onClose={() => setMarkPaidId(null)}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cobranças</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie as cobranças de aluguel dos contratos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key || (tab.key === 'all' && !activeTab)
          const summary = tabSummaries[tab.key as keyof typeof tabSummaries] ?? {
            count: 0,
            total: 0,
          }
          return (
            <Link
              key={tab.key}
              href={buildTabUrl(tab.key)}
              className={`flex shrink-0 flex-col items-start gap-0.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {summary.total > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {formatCurrency(summary.total)}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Summary line */}
      {activeSummary.count > 0 && (
        <p className="text-sm text-muted-foreground">
          {activeSummary.count} {activeSummary.count === 1 ? 'cobrança' : 'cobranças'} ·{' '}
          <span className="font-medium">{formatCurrency(activeSummary.total)}</span>
        </p>
      )}

      {charges.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {EMPTY_MESSAGES[activeTab] ?? EMPTY_MESSAGES.all}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {EMPTY_SUBTITLES[activeTab] ?? EMPTY_SUBTITLES.all}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imóvel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Inquilino
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Mês Ref.
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  {canWrite && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {charges.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.lease.property.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {[c.lease.property.city, c.lease.property.owner?.name]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.lease.tenantName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <ChargesStatusBadge status={c.status} />
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(c.status === 'pending' || c.status === 'overdue') && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openMarkPaid(c)}>
                                Marcar pago
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={isPending && cancellingId === c.id}
                                onClick={() => {
                                  setCancellingId(c.id)
                                  handleCancel(c.id)
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {charges.map((c) => (
              <div key={c.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <ChargesStatusBadge status={c.status} />
                  <span className="text-sm font-semibold">{formatCurrency(c.amount)}</span>
                </div>
                <p className="mt-2 truncate font-medium">{c.lease.property.address}</p>
                <p className="text-sm text-muted-foreground">{c.lease.tenantName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.reference ?? '—'}</span>
                  <span>·</span>
                  <span>Vence {formatDate(c.dueDate)}</span>
                </div>
                {canWrite && (c.status === 'pending' || c.status === 'overdue') && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openMarkPaid(c)}
                    >
                      Marcar pago
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={isPending && cancellingId === c.id}
                      onClick={() => {
                        setCancellingId(c.id)
                        handleCancel(c.id)
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              {page > 1 && (
                <Link
                  href={`/cobrancas?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(page - 1) }).toString()}`}
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
                  href={`/cobrancas?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(page + 1) }).toString()}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Próxima →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
