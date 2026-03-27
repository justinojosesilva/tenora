import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import type { PropertyStatus, PropertyType } from '@tenora/db'
import { Building2, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PropertyCard } from '@/components/property/property-card'
import { PropertyFilters } from '@/components/property/property-filters'
import { PropertyListSkeleton } from '@/components/property/property-list-skeleton'

export const metadata = { title: 'Imóveis — Tenora' }

type SearchParams = {
  search?: string
  status?: string
  type?: string
  page?: string
}

const PAGE_SIZE = 20

async function PropertyList({
  orgId,
  search,
  status,
  type,
  page,
}: {
  orgId: string
  search?: string
  status?: PropertyStatus
  type?: PropertyType
  page: number
}) {
  const db = prismaWithTenant(orgId)

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(type && { type }),
    ...(search && {
      address: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const [properties, total] = await Promise.all([
    db.property.findMany({
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.property.count({ where }),
  ])

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Nenhum imóvel encontrado</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {search || status || type
            ? 'Tente ajustar os filtros'
            : 'Cadastre o primeiro imóvel para começar'}
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'imóvel' : 'imóveis'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
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
  )
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { orgId } = await auth()
  const params = await searchParams

  if (!orgId) return null

  const page = Math.max(1, Number(params.page ?? 1))
  const status = params.status as PropertyStatus | undefined
  const type = params.type as PropertyType | undefined

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie o portfólio de imóveis</p>
        </div>
        <Link
          href="/imoveis/novo"
          className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center')}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Imóvel
        </Link>
      </div>

      <Suspense fallback={null}>
        <PropertyFilters />
      </Suspense>

      <Suspense fallback={<PropertyListSkeleton />}>
        <PropertyList
          orgId={orgId}
          search={params.search}
          status={status}
          type={type}
          page={page}
        />
      </Suspense>
    </div>
  )
}
