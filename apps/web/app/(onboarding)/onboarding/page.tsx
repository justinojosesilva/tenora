import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './_components/OnboardingWizard'

export const metadata = { title: 'Onboarding — Tenora' }

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (orgId) redirect('/dashboard')

  return <OnboardingWizard />
}
