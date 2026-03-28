'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, History, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PropertyForm, type FormOwner, type FormProperty } from './property-form'
import { deletePropertyAction } from '@/app/(dashboard)/imoveis/actions'

export type DrawerProperty = FormProperty & {
  status: string
  createdAt: string
  updatedAt: string
  ownerName: string | null
}

type Toast = { message: string; type: 'success' | 'error' }

type Props = {
  open: boolean
  onClose: () => void
  property: DrawerProperty | null
  owners: FormOwner[]
  canEdit: boolean
  canDelete: boolean
}

export function PropertyDrawer({ open, onClose, property, owners, canEdit, canDelete }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Reset confirm state when drawer closes
  useEffect(() => {
    if (!open) setConfirmDelete(false)
  }, [open])

  const handleSuccess = () => {
    setToast({
      message: property ? 'Imóvel atualizado com sucesso!' : 'Imóvel criado com sucesso!',
      type: 'success',
    })
    onClose()
    router.refresh()
  }

  const handleDelete = () => {
    if (!property) return
    startTransition(async () => {
      const result = await deletePropertyAction(property.id)
      if (result?.error) {
        setToast({ message: result.error, type: 'error' })
      } else {
        setToast({ message: 'Imóvel excluído com sucesso!', type: 'success' })
        onClose()
        router.refresh()
      }
      setConfirmDelete(false)
    })
  }

  const statusLabel: Record<string, string> = {
    available: 'Disponível',
    rented: 'Alugado',
    maintenance: 'Manutenção',
  }

  return (
    <>
      <Sheet.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Sheet.Portal>
          <Sheet.Backdrop />
          <Sheet.Content>
            <Sheet.Header>
              <div className="min-w-0">
                <Sheet.Title className="truncate">
                  {property ? property.address : 'Novo Imóvel'}
                </Sheet.Title>
                {property?.ownerName && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {property.ownerName}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {property && canDelete && (
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
                  <Building2 className="h-3.5 w-3.5" />
                  Dados Gerais
                </Tabs.Tab>
                <Tabs.Tab value="documentos">
                  <FileText className="h-3.5 w-3.5" />
                  Documentos
                </Tabs.Tab>
                <Tabs.Tab value="historico">
                  <History className="h-3.5 w-3.5" />
                  Histórico
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="dados">
                <PropertyForm
                  property={property ?? undefined}
                  owners={owners}
                  canEdit={canEdit}
                  onSuccess={handleSuccess}
                />
              </Tabs.Panel>

              <Tabs.Panel value="documentos" className="p-5">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-14 text-center">
                  <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {property
                      ? 'Nenhum documento enviado'
                      : 'Salve o imóvel antes de enviar documentos'}
                  </p>
                  {property && (
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Upload de documentos disponível após configuração do R2
                    </p>
                  )}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="historico" className="p-5">
                {property ? (
                  <dl className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Status atual</dt>
                      <dd className="font-medium">
                        {statusLabel[property.status] ?? property.status}
                      </dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Criado em</dt>
                      <dd>{new Date(property.createdAt).toLocaleDateString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Última atualização</dt>
                      <dd>{new Date(property.updatedAt).toLocaleDateString('pt-BR')}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
                )}
              </Tabs.Panel>
            </Tabs.Root>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet.Root>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Excluir imóvel?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O imóvel será desativado e não aparecerá mais na listagem.
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
