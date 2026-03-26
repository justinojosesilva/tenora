'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export type OnboardingResult = { success: true; orgId: string } | { success: false; error: string }

export async function createOrganizationAction(
  name: string,
  cnpj: string,
  nProperties: number,
): Promise<OnboardingResult> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Não autenticado.' }
  }

  try {
    const clerk = await clerkClient()

    // Criar organização no Clerk com os metadados do onboarding
    const org = await clerk.organizations.createOrganization({
      name,
      createdBy: userId,
      publicMetadata: {
        cnpj: cnpj.replace(/\D/g, ''),
        nProperties,
        onboardingComplete: false,
      },
    })

    // Definir como org ativa do usuário via Clerk
    await clerk.users.updateUser(userId, {
      publicMetadata: { lastOrgId: org.id },
    })

    return { success: true, orgId: org.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar organização.'
    return { success: false, error: message }
  }
}

export async function completeOnboardingAction(
  orgId: string,
  bankSlug: string | null,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Não autenticado.' }
  }

  try {
    const clerk = await clerkClient()

    // Atualizar metadados da organização com info do banco e marcar onboarding como completo
    await clerk.organizations.updateOrganization(orgId, {
      publicMetadata: {
        bankSlug,
        onboardingComplete: true,
      },
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao finalizar onboarding.'
    return { success: false, error: message }
  }
}
