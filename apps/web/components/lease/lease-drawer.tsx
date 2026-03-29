'use client'

import { useEffect, useState, useTransition } from 'react'
import { FileText, Receipt, CalendarRange, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LeaseStatusBadge, type LeaseStatus } from './lease-status-badge'
import { LeaseVigenciaBar } from './lease-vigencia-bar'
import { LeaseForm, type FormLeaseData } from './lease-form'
import { endLeaseAction, deleteLeaseAction } from '@/app/(dashboard)/contratos/actions'

type PropertyOption = {
  id: string
  address: string
  city: string | null
  status: string
}

export type DrawerLease = FormLeaseData & {
  status: LeaseStatus
  property: {
    id: string
    address: string
    city: string | null
    state: string | null
    type: string
    owner: { name: string } | null
  }
}

type Toast = { message: string; type: 'success' | 'error' }

type Props = {
  open: boolean
  onClose: () => void
  lease: DrawerLease | null
  properties: PropertyOption[]
  canWrite: boolean
}

export function LeaseDrawer({ open, onClose, lease, properties, canWrite }: Props) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!open) {
      setConfirmEnd(false)
      setConfirmDelete(false)
    }
  }, [open])

  const handleSuccess = () => {
    setToast({
      message: lease ? 'Contrato atualizado com sucesso!' : 'Contrato cadastrado com sucesso!',
      type: 'success',
    })
    onClose()
  }

  const handleEnd = () => {
    if (!lease) return
    startTransition(async () => {
      const result = await endLeaseAction(lease.id)
      if (result?.error) {
        setToast({ message: result.error, type: 'error' })
      } else {
        setToast({ message: 'Contrato encerrado com sucesso!', type: 'success' })
        onClose()
      }
      setConfirmEnd(false)
    })
  }

  const handleDelete = () => {
    if (!lease) return
    startTransition(async () => {
      const result = await deleteLeaseAction(lease.id)
      if (result?.error) {
        setToast({ message: result.error, type: 'error' })
      } else {
        setToast({ message: 'Contrato excluído com sucesso!', type: 'success' })
        onClose()
      }
      setConfirmDelete(false)
    })
  }

  const rentAmountFormatted = lease
    ? parseFloat(lease.rentAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : ''

  const daysRemaining = lease
    ? Math.max(0, Math.round((new Date(lease.endDate).getTime() - Date.now()) / 86_400_000))
    : 0

  return (
    <>
      <Sheet.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Sheet.Portal>
          <Sheet.Backdrop />
          <Sheet.Content>
            <Sheet.Header>
              <div className="min-w-0">
                <Sheet.Title className="truncate">
                  {lease ? lease.property.address : 'Novo Contrato'}
                </Sheet.Title>
                {lease && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {lease.tenantName}
                    {lease.property.city ? ` · ${lease.property.city}` : ''}
                  </p>
                )}
                {lease && (
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {rentAmountFormatted}/mês
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lease && canWrite && lease.status !== 'ended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmEnd(true)}
                    disabled={isPending}
                    className="text-xs"
                  >
                    Encerrar
                  </Button>
                )}
                {lease && canWrite && (
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Sheet.CloseButton />
              </div>
            </Sheet.Header>

            <Tabs.Root defaultValue="dados" className="min-h-0 flex-1">
              <Tabs.List>
                <Tabs.Tab value="dados">
                  <FileText className="h-3.5 w-3.5" />
                  Dados
                </Tabs.Tab>
                <Tabs.Tab value="cobrancas">
                  <Receipt className="h-3.5 w-3.5" />
                  Cobranças
                </Tabs.Tab>
                <Tabs.Tab value="vigencia">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Vigência
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="dados">
                <LeaseForm
                  lease={lease ?? undefined}
                  properties={properties}
                  canWrite={canWrite}
                  onSuccess={handleSuccess}
                />
              </Tabs.Panel>

              <Tabs.Panel value="cobrancas" className="p-5">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-14 text-center">
                  <Receipt className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {lease
                      ? 'Histórico de cobranças disponível em breve'
                      : 'Salve o contrato primeiro'}
                  </p>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="vigencia" className="p-5">
                {lease ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <LeaseStatusBadge status={lease.status} />
                      <span className="text-sm text-muted-foreground">
                        {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Vencido'}
                      </span>
                    </div>

                    <LeaseVigenciaBar
                      startDate={lease.startDate}
                      endDate={lease.endDate}
                      status={lease.status}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p className="mt-1 text-sm font-medium">
                          {new Date(lease.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Fim</p>
                        <p className="mt-1 text-sm font-medium">
                          {new Date(lease.endDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className="mt-1 text-sm font-medium">Dia {lease.dueDayOfMonth}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Índice Reajuste</p>
                        <p className="mt-1 text-sm font-medium">{lease.readjustIndex ?? 'IGPM'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Salve o contrato para visualizar a vigência
                  </p>
                )}
              </Tabs.Panel>
            </Tabs.Root>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet.Root>

      {/* Confirm end */}
      {confirmEnd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmEnd(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Encerrar contrato?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O contrato será marcado como encerrado e o imóvel voltará ao status disponível.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmEnd(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEnd} disabled={isPending}>
                {isPending ? 'Encerrando...' : 'Encerrar contrato'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Excluir contrato?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O contrato será removido permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed bottom-4 right-4 z-[70] rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-destructive text-destructive-foreground',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
