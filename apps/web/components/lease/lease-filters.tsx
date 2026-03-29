'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Vigente' },
  { value: 'ended', label: 'Encerrado' },
  { value: 'renewing', label: 'Renovando' },
  { value: 'overdue', label: 'Em Atraso' },
]

export function LeaseFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const selectClass = cn(
    'h-9 rounded-md border border-input bg-background px-3 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-ring',
    'text-foreground',
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por inquilino ou endereço..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e) => {
          const value = e.target.value
          const timer = setTimeout(() => setParam('search', value), 400)
          return () => clearTimeout(timer)
        }}
        className="h-9 w-64"
      />

      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => setParam('status', e.target.value)}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Vigência de</label>
        <input
          type="date"
          value={searchParams.get('startDate') ?? ''}
          onChange={(e) => setParam('startDate', e.target.value)}
          className={selectClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">até</label>
        <input
          type="date"
          value={searchParams.get('endDate') ?? ''}
          onChange={(e) => setParam('endDate', e.target.value)}
          className={selectClass}
        />
      </div>
    </div>
  )
}
