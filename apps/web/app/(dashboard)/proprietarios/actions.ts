'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant, withTenantRLS } from '@tenora/db'
import { OwnerCreateSchema, OwnerUpdateSchema } from '@tenora/validators'

export type OwnerFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  ownerId?: string
  ownerName?: string
} | null

export async function createOwnerAction(
  _prevState: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const raw = {
    name: formData.get('name') as string,
    cpfCnpj: formData.get('cpfCnpj') as string,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
  }

  const parsed = OwnerCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)

  const existing = await db.owner.findFirst({
    where: { cpfCnpj: parsed.data.cpfCnpj, deletedAt: null },
  })
  if (existing) return { error: 'Já existe um proprietário com este CPF/CNPJ' }

  const created = await withTenantRLS(orgId, async (tx) => {
    const owner = await tx.owner.create({ data: { ...parsed.data, tenantId: orgId } })
    await tx.ownerAccount.create({ data: { tenantId: orgId, ownerId: owner.id, balance: 0 } })
    return owner
  })

  revalidatePath('/proprietarios')
  return { success: true, ownerId: created.id, ownerName: created.name }
}

export async function updateOwnerAction(
  _prevState: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID do proprietário não informado' }

  const raw = {
    name: (formData.get('name') as string) || undefined,
    cpfCnpj: (formData.get('cpfCnpj') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
  }

  const parsed = OwnerUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)

  const existing = await db.owner.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Proprietário não encontrado' }

  if (parsed.data.cpfCnpj && parsed.data.cpfCnpj !== existing.cpfCnpj) {
    const dup = await db.owner.findFirst({
      where: { cpfCnpj: parsed.data.cpfCnpj, deletedAt: null, NOT: { id } },
    })
    if (dup) return { error: 'Já existe um proprietário com este CPF/CNPJ' }
  }

  await db.owner.update({ where: { id }, data: parsed.data })

  revalidatePath('/proprietarios')
  return { success: true }
}

export async function deleteOwnerAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const { orgId, sessionClaims, orgRole } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const role =
    ((sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ?? orgRole?.replace(/^org:/, '')
  if (role !== 'admin' && role !== 'operacional') {
    return { error: 'Sem permissão para excluir proprietários' }
  }

  const db = prismaWithTenant(orgId)

  const existing = await db.owner.findUnique({
    where: { id, deletedAt: null },
    include: { properties: { where: { deletedAt: null }, select: { id: true } } },
  })
  if (!existing) return { error: 'Proprietário não encontrado' }
  if (existing.properties.length > 0) {
    return { error: 'Não é possível excluir proprietário com imóveis ativos vinculados' }
  }

  await db.owner.update({ where: { id }, data: { deletedAt: new Date() } })

  revalidatePath('/proprietarios')
  return { success: true }
}
