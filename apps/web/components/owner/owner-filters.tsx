'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'

export function OwnerFilters() {
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
    <Input
      placeholder="Buscar por nome ou CPF/CNPJ..."
      defaultValue={searchParams.get('search') ?? ''}
      onChange={(e) => {
        const value = e.target.value
        const timer = setTimeout(() => setParam('search', value), 400)
        return () => clearTimeout(timer)
      }}
      className="h-9 w-72"
    />
  )
}
