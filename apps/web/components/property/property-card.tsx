import Link from 'next/link'
import { MapPin, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PropertyStatus, PropertyType } from '@tenora/db'

const statusLabel: Record<PropertyStatus, string> = {
  available: 'Disponível',
  rented: 'Alugado',
  maintenance: 'Manutenção',
}

const statusVariant: Record<PropertyStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  available: 'default',
  rented: 'secondary',
  maintenance: 'destructive',
}

const typeLabel: Record<PropertyType, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  mixed: 'Misto',
}

type PropertyCardProps = {
  property: {
    id: string
    code: string | null
    address: string
    city: string | null
    state: string | null
    type: PropertyType
    status: PropertyStatus
    rentAmount: { toString(): string } | null
    adminFeePct: { toString(): string }
    owner: { name: string } | null
  }
}

export function PropertyCard({ property }: PropertyCardProps) {
  const rentFormatted = property.rentAmount
    ? Number(property.rentAmount.toString()).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : null

  const location = [property.city, property.state].filter(Boolean).join(' – ')

  return (
    <Link
      href={`/imoveis/${property.id}`}
      className="group block rounded-xl border bg-card p-5 space-y-3 hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        {property.code ? (
          <span className="text-xs font-mono text-muted-foreground">{property.code}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
        <Badge variant={statusVariant[property.status]}>{statusLabel[property.status]}</Badge>
      </div>

      <p className="font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {property.address}
      </p>

      {location && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{typeLabel[property.type]}</Badge>
        <Badge variant="outline">Taxa {property.adminFeePct.toString()}%</Badge>
      </div>

      <div className="border-t pt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.owner?.name ?? 'Sem proprietário'}</span>
        </div>
        {rentFormatted && (
          <span className="font-semibold text-foreground whitespace-nowrap">{rentFormatted}</span>
        )}
      </div>
    </Link>
  )
}
