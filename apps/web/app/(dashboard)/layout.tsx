export const dynamic = 'force-dynamic'

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'
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
    <>
      <PageViewTracker />
      <DashboardShell orgName={org.name} userName={userName} userImageUrl={user?.imageUrl}>
        {children}
      </DashboardShell>
    </>
  )
}
