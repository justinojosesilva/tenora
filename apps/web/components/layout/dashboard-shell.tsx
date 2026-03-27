'use client'

import { useState } from 'react'
import { Suspense } from 'react'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { SidebarSkeleton } from './sidebar-skeleton'

interface DashboardShellProps {
  orgName: string
  userName: string
  userImageUrl?: string
  children: React.ReactNode
}

export function DashboardShell({ orgName, userName, userImageUrl, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar
          orgName={orgName}
          userName={userName}
          userImageUrl={userImageUrl}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      </Suspense>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <AppTopbar onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
