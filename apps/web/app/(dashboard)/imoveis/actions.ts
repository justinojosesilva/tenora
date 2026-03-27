'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { PropertyCreateSchema, PropertyUpdateSchema } from '@tenora/validators'

export type PropertyFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
} | null

export async function createPropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const raw = {
    address: formData.get('address') as string,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    type: formData.get('type') as string,
    area: formData.get('area') ? Number(formData.get('area')) : undefined,
    adminFeePct: formData.get('adminFeePct') ? Number(formData.get('adminFeePct')) : undefined,
    rentAmount: formData.get('rentAmount') ? Number(formData.get('rentAmount')) : undefined,
    ownerId: (formData.get('ownerId') as string) || undefined,
  }

  const parsed = PropertyCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)
  await db.property.create({ data: { ...parsed.data, tenantId: orgId } })

  revalidatePath('/imoveis')
  return { success: true }
}

export async function updatePropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const { orgId } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID do imóvel não informado' }

  const raw = {
    address: (formData.get('address') as string) || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    type: (formData.get('type') as string) || undefined,
    area: formData.get('area') ? Number(formData.get('area')) : undefined,
    adminFeePct: formData.get('adminFeePct') ? Number(formData.get('adminFeePct')) : undefined,
    rentAmount: formData.get('rentAmount') ? Number(formData.get('rentAmount')) : undefined,
    ownerId: (formData.get('ownerId') as string) || undefined,
  }

  const parsed = PropertyUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)

  const existing = await db.property.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Imóvel não encontrado' }

  if (parsed.data.ownerId) {
    const owner = await db.owner.findUnique({ where: { id: parsed.data.ownerId, deletedAt: null } })
    if (!owner) return { error: 'Proprietário não encontrado' }
  }

  await db.property.update({ where: { id }, data: parsed.data })

  revalidatePath('/imoveis')
  return { success: true }
}

export async function deletePropertyAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const { orgId, sessionClaims } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const role = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
    | string
    | undefined
  if (role !== 'admin' && role !== 'operacional') {
    return { error: 'Sem permissão para excluir imóveis' }
  }

  const db = prismaWithTenant(orgId)
  const existing = await db.property.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Imóvel não encontrado' }

  await db.property.update({ where: { id }, data: { deletedAt: new Date() } })

  revalidatePath('/imoveis')
  return { success: true }
}
