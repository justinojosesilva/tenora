'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Bell, CalendarDays, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppTopbarProps {
  mobileMenuOpen?: boolean
  onMobileMenuToggle?: (open: boolean) => void
  isMobile?: boolean
}

const PERIODS = [
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Este Trimestre', value: 'quarter' },
  { label: 'Ano Atual', value: 'year' },
] as const

export type Period = (typeof PERIODS)[number]['value']

export function AppTopbar({
  mobileMenuOpen = false,
  onMobileMenuToggle,
  isMobile = false,
}: AppTopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as Period) ?? '30d'

  const setPeriod = useCallback(
    (value: Period) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', value)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={() => onMobileMenuToggle?.(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Search - hidden on small mobile, visible from sm up */}
      <div className="relative w-full max-w-sm hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por imóvel, proprietário ou transações..."
          className="h-9 border-0 bg-muted/50 pl-9 text-sm"
        />
      </div>

      <div className="flex-1" />

      {/* Period selector - hidden on small mobile */}
      <div className="hidden sm:flex items-center gap-1 rounded-lg bg-muted p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              period === p.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">Calendário</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">Notificações</span>
      </Button>
    </header>
  )
}
