'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'available', label: 'Disponível' },
  { value: 'rented', label: 'Alugado' },
  { value: 'maintenance', label: 'Manutenção' },
]

const typeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'mixed', label: 'Misto' },
]

export function PropertyFilters() {
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

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por endereço..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e) => {
          const value = e.target.value
          const timer = setTimeout(() => setParam('search', value), 400)
          return () => clearTimeout(timer)
        }}
        className="h-9 w-56"
      />

      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => setParam('status', e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get('type') ?? ''}
        onChange={(e) => setParam('type', e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
