'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  ArrowLeftRight,
  Users,
  Building2,
  Wrench,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: 'PRINCIPAL',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'GESTÃO',
    items: [
      { label: 'Imóveis', href: '/imoveis', icon: Building2 },
      { label: 'Proprietários', href: '/proprietarios', icon: Users },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { label: 'Fluxo de Caixa', href: '/fluxo-de-caixa', icon: Wallet },
      { label: 'DRE', href: '/dre', icon: BarChart3 },
      { label: 'Transações', href: '/transacoes', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'OPERAÇÕES',
    items: [{ label: 'Manutenções', href: '/manutencoes', icon: Wrench }],
  },
]

const NAV_BOTTOM = [{ label: 'Configurações', href: '/configuracoes', icon: Settings }]

export interface AppSidebarProps {
  orgName: string
  userName: string
  userImageUrl?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function AppSidebar({
  orgName,
  userName,
  userImageUrl,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

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

  const sidebarContent = (isOverlay: boolean) => (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
          isOverlay ? 'w-60' : collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Header: logo + toggle */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-sidebar-border px-3',
            !isOverlay && collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold text-sidebar-foreground">Tenora</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Gestão Patrimonial</p>
          </div>
          {isOverlay ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="shrink-0 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
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
          )}
        </div>

        {/* Main nav — grouped sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {(!collapsed || isOverlay) && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <NavItem
                        item={item}
                        collapsed={!isOverlay && collapsed}
                        active={pathname === item.href}
                        onSelect={isOverlay ? onMobileClose : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom nav (Configurações) */}
        <div className="border-t border-sidebar-border px-2 py-3">
          {(!collapsed || isOverlay) && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              CONFIGURAÇÕES
            </p>
          )}
          <ul className="space-y-1">
            {NAV_BOTTOM.map((item) => (
              <li key={item.href}>
                <NavItem
                  item={item}
                  collapsed={!isOverlay && collapsed}
                  active={pathname === item.href}
                  onSelect={isOverlay ? onMobileClose : undefined}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — Novo Lançamento */}
        {/*<div className={cn('px-2 pb-3', !isOverlay && collapsed && 'flex justify-center')}>
          {!isOverlay && collapsed ? (
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
        </div>*/}

        {/* User footer */}
        <div className="relative border-t border-sidebar-border">
          {userMenuOpen && (
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
          )}
          {userMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 z-20 mb-1 overflow-hidden rounded-md border border-sidebar-border bg-sidebar shadow-lg">
              <button
                onClick={async () => {
                  await signOut({ redirectUrl: '/sign-in' })
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sair
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className={cn(
              'flex w-full items-center p-3 transition-colors hover:bg-sidebar-accent',
              !isOverlay && collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={userImageUrl} alt={userName} />
              <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {(isOverlay || !collapsed) && (
              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{orgName}</p>
              </div>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebarContent(false)}</div>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex lg:hidden transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent(true)}
      </div>
    </>
  )
}

interface NavItemProps {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  collapsed: boolean
  active: boolean
  onSelect?: () => void
}

function NavItem({ item, collapsed, active, onSelect }: NavItemProps) {
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      onClick={onSelect}
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
