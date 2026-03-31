'use client'

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
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar orgName={orgName} userName={userName} userImageUrl={userImageUrl} />
      </Suspense>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <AppTopbar />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
