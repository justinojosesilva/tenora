'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'

const MARK_PAID_ROLES = new Set(['admin', 'financeiro'])
const CANCEL_ROLES = new Set(['admin', 'operacional'])
const GENERATE_PIX_ROLES = new Set(['admin', 'financeiro'])
const GENERATE_BOLETO_ROLES = new Set(['admin', 'financeiro'])

async function resolveRole(): Promise<{ orgId: string; role: string } | { error: string }> {
  const { orgId, sessionClaims, orgRole } = await auth()
  if (!orgId) return { error: 'Não autenticado' }

  const role =
    ((sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ?? orgRole?.replace(/^org:/, '')

  return { orgId, role: role ?? '' }
}

export async function markAsPaidAction(
  id: string,
  paidAmount: number,
  paidAt: Date,
): Promise<{ error?: string; success?: boolean }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!MARK_PAID_ROLES.has(role)) return { error: 'Sem permissão para registrar pagamentos' }

  const db = prismaWithTenant(orgId)

  const charge = await db.billingCharge.findUnique({
    where: { id },
    include: {
      lease: {
        select: {
          rentAmount: true,
          adminFeePct: true,
          propertyId: true,
          property: {
            select: { ownerId: true },
          },
        },
      },
    },
  })

  if (!charge) return { error: 'Cobrança não encontrada' }
  if (charge.status === 'paid') return { error: 'Cobrança já está paga' }
  if (charge.status === 'cancelled') return { error: 'Cobrança cancelada não pode ser paga' }

  await db.$transaction(async (tx) => {
    await tx.billingCharge.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt,
        paidAmount,
      },
    })

    const ownerId = charge.lease.property.ownerId
    if (ownerId) {
      const rentAmount = parseFloat(charge.lease.rentAmount.toString())
      const adminFeePct = parseFloat(charge.lease.adminFeePct.toString())
      const repasse = rentAmount - (rentAmount * adminFeePct) / 100

      await tx.ownerAccount.updateMany({
        where: { ownerId },
        data: { balance: { increment: repasse } },
      })
    }
  })

  revalidatePath('/cobrancas')
  return { success: true }
}

export async function cancelChargeAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { orgId, role } = resolved

  if (!CANCEL_ROLES.has(role)) return { error: 'Sem permissão para cancelar cobranças' }

  const db = prismaWithTenant(orgId)

  const charge = await db.billingCharge.findUnique({ where: { id } })
  if (!charge) return { error: 'Cobrança não encontrada' }
  if (charge.status === 'paid') return { error: 'Cobrança já paga não pode ser cancelada' }
  if (charge.status === 'cancelled') return { error: 'Cobrança já está cancelada' }

  await db.billingCharge.update({
    where: { id },
    data: { status: 'cancelled' },
  })

  revalidatePath('/cobrancas')
  return { success: true }
}

export async function generatePixAction(
  id: string,
): Promise<{ error?: string; pixCode?: string; qrCodeImage?: string }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { role } = resolved

  if (!GENERATE_PIX_ROLES.has(role)) return { error: 'Sem permissão para gerar PIX' }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/trpc/charges.generatePix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error?.message || 'Erro ao gerar PIX' }
    }

    const result = await response.json()
    revalidatePath('/cobrancas')
    return {
      pixCode: result?.result?.data?.pixCode ?? undefined,
      qrCodeImage: result?.result?.data?.qrCodeImage ?? undefined,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao gerar PIX' }
  }
}

export async function generateBoletoAction(
  id: string,
): Promise<{ error?: string; boletoCode?: string; boletoUrl?: string }> {
  const resolved = await resolveRole()
  if ('error' in resolved) return { error: resolved.error }
  const { role } = resolved

  if (!GENERATE_BOLETO_ROLES.has(role)) return { error: 'Sem permissão para gerar Boleto' }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/trpc/charges.generateBoleto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error?.message || 'Erro ao gerar Boleto' }
    }

    const result = await response.json()
    revalidatePath('/cobrancas')
    return {
      boletoCode: result?.result?.data?.boletoCode ?? undefined,
      boletoUrl: result?.result?.data?.boletoUrl ?? undefined,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao gerar Boleto' }
  }
}
