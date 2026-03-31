'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  ArrowLeftRight,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV_MAIN = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Fluxo de Caixa', href: '/fluxo-de-caixa', icon: Wallet },
  { label: 'DRE', href: '/dre', icon: BarChart3 },
  { label: 'Transações', href: '/transacoes', icon: ArrowLeftRight },
  { label: 'Proprietários', href: '/proprietarios', icon: Users },
]

const NAV_BOTTOM = [{ label: 'Configurações', href: '/configuracoes', icon: Settings }]

export interface AppSidebarProps {
  orgName: string
  userName: string
  userImageUrl?: string
}

export function AppSidebar({ orgName, userName, userImageUrl }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Header: logo + toggle */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-sidebar-border px-3',
            collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-bold text-sidebar-foreground">Tenora</p>
              <p className="truncate text-xs text-sidebar-foreground/60">Gestão Patrimonial</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="shrink-0 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {NAV_MAIN.map((item) => (
              <li key={item.href}>
                <NavItem item={item} collapsed={collapsed} active={pathname === item.href} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom nav (Configurações) */}
        <div className="border-t border-sidebar-border px-2 py-3">
          <ul className="space-y-1">
            {NAV_BOTTOM.map((item) => (
              <li key={item.href}>
                <NavItem item={item} collapsed={collapsed} active={pathname === item.href} />
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — Novo Lançamento */}
        <div className={cn('px-2 pb-3', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size="icon"
                  className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Novo Lançamento</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Button>
          )}
        </div>

        {/* User footer */}
        <div
          className={cn(
            'flex items-center border-t border-sidebar-border p-3',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={userImageUrl} alt={userName} />
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{orgName}</p>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

interface NavItemProps {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  collapsed: boolean
  active: boolean
}

function NavItem({ item, collapsed, active }: NavItemProps) {
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}
