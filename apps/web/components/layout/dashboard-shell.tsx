'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: hidden on mobile, fixed overlay on mobile when open */}
      <div
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-300 ${
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative w-60'
        }`}
      >
        <Suspense fallback={<SidebarSkeleton />}>
          <AppSidebar orgName={orgName} userName={userName} userImageUrl={userImageUrl} />
        </Suspense>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <AppTopbar
            mobileMenuOpen={mobileOpen}
            onMobileMenuToggle={setMobileOpen}
            isMobile={isMobile}
          />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
