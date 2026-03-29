export const dynamic = 'force-dynamic'

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { db as rootDb } from '@tenora/db'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'

// Rotas que não requerem assinatura ativa (trial expirado pode acessar)
const SUBSCRIPTION_FREE_PATHS = ['/billing', '/configuracoes']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/onboarding')

  // Verificar se o tenant tem assinatura ativa — redireciona para /billing se não tiver
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isFreeRoute = SUBSCRIPTION_FREE_PATHS.some((p) => pathname.startsWith(p))

  if (!isFreeRoute) {
    const tenant = await rootDb.tenant.findUnique({
      where: { id: orgId },
      select: { stripeSubscriptionId: true },
    })
    if (tenant && !tenant.stripeSubscriptionId) {
      redirect('/billing')
    }
  }

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
