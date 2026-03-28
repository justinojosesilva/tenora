'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, Trash2, User } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OwnerForm, type FormOwnerData } from './owner-form'
import { deleteOwnerAction } from '@/app/(dashboard)/proprietarios/actions'
import { PropertyDrawer, type DrawerProperty } from '@/components/property/property-drawer'

const statusLabel: Record<string, string> = {
  available: 'Disponível',
  rented: 'Alugado',
  maintenance: 'Manutenção',
}
const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  available: 'default',
  rented: 'secondary',
  maintenance: 'destructive',
}
const typeLabel: Record<string, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  mixed: 'Misto',
}

export type DrawerOwner = FormOwnerData & {
  balance: string
  propertiesCount: number
  properties: Array<{
    id: string
    address: string
    city: string | null
    state: string | null
    zipCode: string | null
    type: string
    status: string
    area: string | null
    rentAmount: string | null
    adminFeePct: string
    ownerId: string | null
    createdAt: string
    updatedAt: string
    activeLeaseCount: number
  }>
}

type Toast = { message: string; type: 'success' | 'error' }

type Props = {
  open: boolean
  onClose: () => void
  owner: DrawerOwner | null
  canEdit: boolean
  canDelete: boolean
}

export function OwnerDrawer({ open, onClose, owner, canEdit, canDelete }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<DrawerProperty | null>(null)

  const handlePropertyClick = (p: DrawerOwner['properties'][0]) => {
    setSelectedProperty({
      id: p.id,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      type: p.type,
      status: p.status,
      area: p.area,
      rentAmount: p.rentAmount,
      adminFeePct: p.adminFeePct,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      ownerName: owner?.name ?? null,
    })
    setPropertyDrawerOpen(true)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!open) setConfirmDelete(false)
  }, [open])

  const handleSuccess = () => {
    setToast({
      message: owner
        ? 'Proprietário atualizado com sucesso!'
        : 'Proprietário cadastrado com sucesso!',
      type: 'success',
    })
    onClose()
  }

  const handleDelete = () => {
    if (!owner) return
    startTransition(async () => {
      const result = await deleteOwnerAction(owner.id)
      if (result?.error) {
        setToast({ message: result.error, type: 'error' })
      } else {
        setToast({ message: 'Proprietário excluído com sucesso!', type: 'success' })
        onClose()
      }
      setConfirmDelete(false)
    })
  }

  const balanceNum = owner ? parseFloat(owner.balance) : 0
  const balanceFormatted = balanceNum.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <>
      <Sheet.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Sheet.Portal>
          <Sheet.Backdrop />
          <Sheet.Content>
            <Sheet.Header>
              <div className="min-w-0">
                <Sheet.Title className="truncate">
                  {owner ? owner.name : 'Novo Proprietário'}
                </Sheet.Title>
                {owner && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{owner.cpfCnpj}</p>
                )}
                {owner && balanceNum > 0 && (
                  <p className="mt-0.5 truncate text-xs font-medium text-green-600">
                    Saldo: {balanceFormatted}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {owner && canDelete && (
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
                  <User className="h-3.5 w-3.5" />
                  Dados
                </Tabs.Tab>
                <Tabs.Tab value="imoveis">
                  <Building2 className="h-3.5 w-3.5" />
                  Imóveis
                  {owner && owner.propertiesCount > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {owner.propertiesCount}
                    </span>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="extratos">
                  <FileText className="h-3.5 w-3.5" />
                  Extratos
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="dados">
                <OwnerForm owner={owner ?? undefined} canEdit={canEdit} onSuccess={handleSuccess} />
              </Tabs.Panel>

              <Tabs.Panel value="imoveis" className="p-5">
                {owner && owner.propertiesCount > 0 ? (
                  <div className="space-y-2">
                    {owner.properties.map((p) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePropertyClick(p)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePropertyClick(p)}
                        className="flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {[typeLabel[p.type] ?? p.type, p.city].filter(Boolean).join(' · ')}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {p.rentAmount && (
                              <span className="text-xs font-medium text-foreground">
                                {parseFloat(p.rentAmount).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            )}
                            {p.activeLeaseCount > 0 && (
                              <Badge
                                variant="outline"
                                className="border-green-500 text-[10px] text-green-600"
                              >
                                Contrato ativo
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={statusVariant[p.status] ?? 'outline'}
                          className="ml-2 shrink-0"
                        >
                          {statusLabel[p.status] ?? p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-14 text-center">
                    <Building2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {owner ? 'Nenhum imóvel vinculado' : 'Salve o proprietário primeiro'}
                    </p>
                  </div>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="extratos" className="p-5">
                {owner ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Saldo a repassar</p>
                      <p
                        className={[
                          'mt-1 text-2xl font-bold',
                          balanceNum > 0 ? 'text-green-600' : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {balanceFormatted}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center">
                      <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Histórico de extratos disponível na Sprint 3
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Salve o proprietário para visualizar extratos
                  </p>
                )}
              </Tabs.Panel>
            </Tabs.Root>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet.Root>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Excluir proprietário?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O proprietário será desativado. Certifique-se que não há imóveis ativos vinculados.
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

      {/* Property drawer — aberto ao clicar em um imóvel */}
      <PropertyDrawer
        open={propertyDrawerOpen}
        onClose={() => {
          setPropertyDrawerOpen(false)
          router.refresh()
        }}
        property={selectedProperty}
        owners={owner ? [{ id: owner.id, name: owner.name }] : []}
        canEdit={canEdit}
        canDelete={canDelete}
      />

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
