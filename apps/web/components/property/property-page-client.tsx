'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { PropertyCard } from './property-card'
import { PropertyDrawer, type DrawerProperty } from './property-drawer'
import type { FormOwner } from './property-form'

type PropertyForList = {
  id: string
  code: string | null
  address: string
  city: string | null
  state: string | null
  type: 'residential' | 'commercial' | 'mixed'
  status: 'available' | 'rented' | 'maintenance'
  rentAmount: { toString(): string } | null
  adminFeePct: { toString(): string }
  zipCode: string | null
  area: { toString(): string } | null
  ownerId: string | null
  createdAt: string
  updatedAt: string
  owner: { name: string } | null
}

type Props = {
  properties: PropertyForList[]
  owners: FormOwner[]
  canEdit: boolean
  canDelete: boolean
  total: number
  page: number
  totalPages: number
}

function toDrawerProperty(p: PropertyForList): DrawerProperty {
  return {
    id: p.id,
    address: p.address,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    type: p.type,
    area: p.area?.toString() ?? null,
    rentAmount: p.rentAmount?.toString() ?? null,
    adminFeePct: p.adminFeePct.toString(),
    ownerId: p.ownerId,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ownerName: p.owner?.name ?? null,
  }
}

export function PropertyPageClient({
  properties,
  owners,
  canEdit,
  canDelete,
  total,
  page,
  totalPages,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<DrawerProperty | null>(null)

  const openNew = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const openEdit = (p: PropertyForList) => {
    setSelected(toDrawerProperty(p))
    setDrawerOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Gerencie o portfólio de imóveis</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={openNew}
              className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Imóvel
            </button>
          )}
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">Nenhum imóvel encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Ajuste os filtros ou cadastre o primeiro imóvel
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'imóvel' : 'imóveis'}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <div key={p.id} className="relative">
                <PropertyCard property={p} />
                {canEdit && (
                  <button
                    onClick={() => openEdit(p)}
                    className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100"
                    aria-label="Editar imóvel"
                  >
                    Editar
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
            </div>
          )}
        </div>
      )}

      <PropertyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        property={selected}
        owners={owners}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  )
}
