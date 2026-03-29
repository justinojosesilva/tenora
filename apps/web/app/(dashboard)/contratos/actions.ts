'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'
import { LeaseCreateSchema, LeaseUpdateSchema } from '@tenora/validators'

export type LeaseFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  leaseId?: string
} | null

const WRITE_ROLES = new Set(['admin', 'operacional'])

async function resolveRole(): Promise<{ orgId: string; role: string } | { error: string }> {
  const { orgId, sessionClaims, orgRole } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const role =
    ((sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ?? orgRole?.replace(/^org:/, '')

  return { orgId, role: role ?? '' }
}

export async function createLeaseAction(
  _prevState: LeaseFormState,
  formData: FormData,
): Promise<LeaseFormState> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!WRITE_ROLES.has(role)) return { error: 'Sem permissão para criar contratos' }

  const raw = {
    propertyId: formData.get('propertyId') as string,
    tenantName: formData.get('tenantName') as string,
    tenantCpf: (formData.get('tenantCpf') as string) || undefined,
    tenantEmail: (formData.get('tenantEmail') as string) || undefined,
    tenantPhone: (formData.get('tenantPhone') as string) || undefined,
    rentAmount: Number(formData.get('rentAmount')),
    adminFeePct: Number(formData.get('adminFeePct') ?? 10),
    readjustIndex: (formData.get('readjustIndex') as string) || 'IGPM',
    dueDayOfMonth: Number(formData.get('dueDayOfMonth') ?? 5),
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    signedAt: (formData.get('signedAt') as string) || undefined,
  }

  const parsed = LeaseCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)

  const property = await db.property.findUnique({
    where: { id: parsed.data.propertyId, deletedAt: null },
  })
  if (!property) return { error: 'Imóvel não encontrado' }
  if (property.status === 'rented') {
    return { error: 'Imóvel já possui contrato ativo e não pode ser locado novamente.' }
  }
  if (property.status === 'maintenance') {
    return { error: 'Imóvel em manutenção não pode ter contrato criado.' }
  }

  const now = new Date()
  const lease = await db.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: { ...parsed.data, tenantId: orgId },
    })

    await tx.property.update({
      where: { id: parsed.data.propertyId },
      data: { status: 'rented' },
    })

    const dueDate = new Date(now.getFullYear(), now.getMonth(), created.dueDayOfMonth)
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
    const reference = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    await tx.billingCharge.create({
      data: {
        tenantId: orgId,
        leaseId: created.id,
        amount: created.rentAmount,
        dueDate,
        reference,
      },
    })

    return created
  })

  revalidatePath('/contratos')
  revalidatePath('/imoveis')
  return { success: true, leaseId: lease.id }
}

export async function updateLeaseAction(
  _prevState: LeaseFormState,
  formData: FormData,
): Promise<LeaseFormState> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!WRITE_ROLES.has(role)) return { error: 'Sem permissão para editar contratos' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID do contrato não informado' }

  const raw = {
    tenantName: (formData.get('tenantName') as string) || undefined,
    tenantCpf: (formData.get('tenantCpf') as string) || undefined,
    tenantEmail: (formData.get('tenantEmail') as string) || undefined,
    tenantPhone: (formData.get('tenantPhone') as string) || undefined,
    rentAmount: formData.get('rentAmount') ? Number(formData.get('rentAmount')) : undefined,
    adminFeePct: formData.get('adminFeePct') ? Number(formData.get('adminFeePct')) : undefined,
    readjustIndex: (formData.get('readjustIndex') as string) || undefined,
    dueDayOfMonth: formData.get('dueDayOfMonth')
      ? Number(formData.get('dueDayOfMonth'))
      : undefined,
    startDate: (formData.get('startDate') as string) || undefined,
    endDate: (formData.get('endDate') as string) || undefined,
    signedAt: (formData.get('signedAt') as string) || undefined,
  }

  const parsed = LeaseUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const db = prismaWithTenant(orgId)

  const existing = await db.lease.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Contrato não encontrado' }
  if (existing.status === 'ended') return { error: 'Contratos encerrados não podem ser editados' }

  await db.lease.update({ where: { id }, data: parsed.data })

  revalidatePath('/contratos')
  return { success: true }
}

export async function endLeaseAction(id: string): Promise<{ error?: string; success?: boolean }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!WRITE_ROLES.has(role)) return { error: 'Sem permissão para encerrar contratos' }

  const db = prismaWithTenant(orgId)

  const existing = await db.lease.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Contrato não encontrado' }
  if (existing.status === 'ended') return { error: 'Contrato já encerrado' }

  await db.$transaction(async (tx) => {
    await tx.lease.update({ where: { id }, data: { status: 'ended' } })
    await tx.property.update({
      where: { id: existing.propertyId },
      data: { status: 'available' },
    })
  })

  revalidatePath('/contratos')
  revalidatePath('/imoveis')
  return { success: true }
}

export async function deleteLeaseAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!WRITE_ROLES.has(role)) return { error: 'Sem permissão para excluir contratos' }

  const db = prismaWithTenant(orgId)

  const existing = await db.lease.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return { error: 'Contrato não encontrado' }

  await db.lease.update({ where: { id }, data: { deletedAt: new Date() } })

  revalidatePath('/contratos')
  return { success: true }
}
