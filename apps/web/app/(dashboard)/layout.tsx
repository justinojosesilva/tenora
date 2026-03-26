import { Suspense } from 'react'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SidebarSkeleton } from '@/components/layout/sidebar-skeleton'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/onboarding')

  const [user, clerk] = await Promise.all([currentUser(), clerkClient()])
  const org = await clerk.organizations.getOrganization({ organizationId: orgId })

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.emailAddresses[0]?.emailAddress ||
    'Usuário'

  return (
    <div className="flex h-screen overflow-hidden">
      <PageViewTracker />
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar orgName={org.name} userName={userName} userImageUrl={user?.imageUrl} />
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
