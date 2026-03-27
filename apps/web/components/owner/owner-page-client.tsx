'use client'

import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OwnerDrawer, type DrawerOwner } from './owner-drawer'

type OwnerRow = DrawerOwner & {
  email: string | null
}

type Props = {
  owners: OwnerRow[]
  canEdit: boolean
  canDelete: boolean
  total: number
  page: number
  totalPages: number
}

function formatCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return raw
}

export function OwnerPageClient({ owners, canEdit, canDelete, total, page, totalPages }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<DrawerOwner | null>(null)

  const openNew = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const openEdit = (o: OwnerRow) => {
    setSelected(o)
    setDrawerOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proprietários</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie os proprietários dos imóveis
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center')}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Proprietário
          </button>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum proprietário encontrado
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {canEdit
              ? 'Cadastre o primeiro proprietário para começar'
              : 'Ajuste os filtros de busca'}
          </p>
          {canEdit && (
            <button
              onClick={openNew}
              className={cn(buttonVariants({ size: 'sm' }), 'mt-4 inline-flex items-center')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Cadastrar proprietário
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'proprietário' : 'proprietários'}
          </p>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    CPF/CNPJ
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Imóveis
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Saldo a repassar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {owners.map((o) => {
                  const balanceNum = parseFloat(o.balance)
                  return (
                    <tr
                      key={o.id}
                      onClick={() => openEdit(o)}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{o.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatCpfCnpj(o.cpfCnpj)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {o.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{o.propertiesCount}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={balanceNum > 0 ? 'text-green-600' : 'text-muted-foreground'}
                        >
                          {balanceNum.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <p className="text-center text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
          )}
        </div>
      )}

      <OwnerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        owner={selected}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  )
}
