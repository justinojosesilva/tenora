'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export type InviteResult = { success: true } | { success: false; error: string }

export async function inviteUserAction(
  _prevState: InviteResult | null,
  formData: FormData,
): Promise<InviteResult> {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return { success: false, error: 'Não autenticado.' }
  }

  const email = formData.get('email')?.toString().trim()
  const role = formData.get('role')?.toString()

  if (!email || !role) {
    return { success: false, error: 'Email e role são obrigatórios.' }
  }

  const validRoles = ['admin', 'financeiro', 'operacional', 'visualizador']
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Role inválida.' }
  }

  try {
    const clerk = await clerkClient()
    const clerkRole = role === 'admin' ? 'org:admin' : 'org:member'

    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: email,
      role: clerkRole,
      publicMetadata: { role },
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao enviar convite.'
    return { success: false, error: message }
  }
}
