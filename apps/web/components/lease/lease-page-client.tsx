'use client'

import { useState } from 'react'
import { Plus, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { LeaseStatusBadge, type LeaseStatus } from './lease-status-badge'
import { LeaseVigenciaBar } from './lease-vigencia-bar'
import { LeaseDrawer, type DrawerLease } from './lease-drawer'

type PropertyOption = {
  id: string
  address: string
  city: string | null
  status: string
}

export type LeaseRow = DrawerLease

type Props = {
  leases: LeaseRow[]
  properties: PropertyOption[]
  canWrite: boolean
  total: number
  page: number
  totalPages: number
}

const TYPE_LABEL: Record<string, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  mixed: 'Misto',
}

export function LeasePageClient({ leases, properties, canWrite, total, page, totalPages }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<LeaseRow | null>(null)

  const openNew = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const openEdit = (l: LeaseRow) => {
    setSelected(l)
    setDrawerOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Gerencie os contratos de locação</p>
        </div>
        {canWrite && (
          <button
            onClick={openNew}
            className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center')}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Contrato
          </button>
        )}
      </div>

      {leases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ScrollText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum contrato encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {canWrite ? 'Cadastre o primeiro contrato para começar' : 'Ajuste os filtros de busca'}
          </p>
          {canWrite && (
            <button
              onClick={openNew}
              className={cn(buttonVariants({ size: 'sm' }), 'mt-4 inline-flex items-center')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Cadastrar contrato
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'contrato' : 'contratos'}
          </p>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imóvel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Inquilino
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Dia Vencto.
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                    Vigência
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leases.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => openEdit(l)}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.property.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {[TYPE_LABEL[l.property.type] ?? l.property.type, l.property.city]
                          .filter(Boolean)
                          .join(' · ')}
                        {l.property.owner ? ` · ${l.property.owner.name}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.tenantName}</p>
                      {l.tenantCpf && (
                        <p className="font-mono text-xs text-muted-foreground">{l.tenantCpf}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {parseFloat(l.rentAmount).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      Dia {l.dueDayOfMonth}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <LeaseVigenciaBar
                        startDate={l.startDate}
                        endDate={l.endDate}
                        status={l.status as LeaseStatus}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <LeaseStatusBadge status={l.status as LeaseStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {leases.map((l) => (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(l)}
                onKeyDown={(e) => e.key === 'Enter' && openEdit(l)}
                className="cursor-pointer rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <LeaseStatusBadge status={l.status as LeaseStatus} />
                  <span className="text-sm font-semibold">
                    {parseFloat(l.rentAmount).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <p className="mt-2 truncate font-medium">{l.property.address}</p>
                <p className="text-sm text-muted-foreground">{l.tenantName}</p>
                <div className="mt-3">
                  <LeaseVigenciaBar
                    startDate={l.startDate}
                    endDate={l.endDate}
                    status={l.status as LeaseStatus}
                  />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <p className="text-center text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
          )}
        </div>
      )}

      <LeaseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lease={selected}
        properties={properties}
        canWrite={canWrite}
      />
    </>
  )
}
