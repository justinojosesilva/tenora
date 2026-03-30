'use client'

import { useEffect, useState } from 'react'
import { ScrollText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeaseStatusBadge } from '@/components/lease/lease-status-badge'
import { LeaseDrawer, type DrawerLease } from '@/components/lease/lease-drawer'
import { getPropertyLeasesAction } from '@/app/(dashboard)/imoveis/actions'
import type { DrawerProperty } from './property-drawer'

type PropertyOption = {
  id: string
  address: string
  city: string | null
  status: string
  owner: { name: string } | null
}

type Props = {
  property: DrawerProperty
  canEdit: boolean
}

function sortLeases(leases: DrawerLease[]): DrawerLease[] {
  return [...leases].sort((a, b) => {
    const groupA = a.status === 'active' || a.status === 'renewing' ? 0 : 1
    const groupB = b.status === 'active' || b.status === 'renewing' ? 0 : 1
    if (groupA !== groupB) return groupA - groupB
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })
}

export function PropertyContratosTab({ property, canEdit }: Props) {
  const [leases, setLeases] = useState<DrawerLease[]>([])
  const [loading, setLoading] = useState(true)
  const [leaseDrawerOpen, setLeaseDrawerOpen] = useState(false)
  const [selectedLease, setSelectedLease] = useState<DrawerLease | null>(null)

  const fetchLeases = async () => {
    setLoading(true)
    const result = await getPropertyLeasesAction(property.id)
    setLeases(result)
    setLoading(false)
  }

  useEffect(() => {
    fetchLeases()
  }, [property.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaseClose = () => {
    setLeaseDrawerOpen(false)
    setSelectedLease(null)
    fetchLeases()
  }

  const handleNewLease = () => {
    setSelectedLease(null)
    setLeaseDrawerOpen(true)
  }

  const handleLeaseClick = (lease: DrawerLease) => {
    setSelectedLease(lease)
    setLeaseDrawerOpen(true)
  }

  const propertyOption: PropertyOption = {
    id: property.id,
    address: property.address,
    city: property.city ?? null,
    status: property.status,
    owner: property.ownerName ? { name: property.ownerName } : null,
  }

  const sorted = sortLeases(leases)

  return (
    <>
      <div className="flex flex-col gap-4 p-5">
        {canEdit && property.status === 'available' && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleNewLease}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo Contrato
            </Button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse py-8 text-center text-sm text-muted-foreground">
            Carregando contratos...
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-14 text-center">
            <ScrollText className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((lease) => {
              const isActive = lease.status === 'active' || lease.status === 'renewing'
              const rentFormatted = parseFloat(lease.rentAmount).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
              const startFormatted = new Date(lease.startDate).toLocaleDateString('pt-BR')
              const endFormatted = new Date(lease.endDate).toLocaleDateString('pt-BR')

              return (
                <div
                  key={lease.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleLeaseClick(lease)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLeaseClick(lease)}
                  className={[
                    'relative cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50',
                    isActive ? 'border-l-4 border-l-[#1D9E75]' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-snug">{lease.tenantName}</p>
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {startFormatted} – {endFormatted}
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground">{rentFormatted}/mês</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LeaseDrawer
        open={leaseDrawerOpen}
        onClose={handleLeaseClose}
        lease={selectedLease}
        properties={[propertyOption]}
        canWrite={canEdit}
      />
    </>
  )
}
