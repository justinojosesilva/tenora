import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { router, adminProcedure } from '@tenora/trpc'
import { db as rootDb } from '@tenora/db'
import type { TRPCRouter } from '@tenora/trpc'
import { CompleteStepSchema, SkipStepSchema, ONBOARDING_STEPS } from '@tenora/validators'

// Derives which steps are complete based on existing tenant data
function deriveCompletedSteps(tenant: {
  cnpj: string | null
  stripeSubscriptionId: string | null
  _count: { properties: number; owners: number }
  onboardingSkippedSteps: string[]
}): string[] {
  const completed: string[] = []

  // dados_basicos: always done once the tenant exists with a name
  completed.push('dados_basicos')

  if (tenant._count.properties > 0 || tenant.onboardingSkippedSteps.includes('primeiro_imovel')) {
    completed.push('primeiro_imovel')
  }

  if (tenant._count.owners > 0 || tenant.onboardingSkippedSteps.includes('primeiro_proprietario')) {
    completed.push('primeiro_proprietario')
  }

  if (tenant.stripeSubscriptionId != null || tenant.onboardingSkippedSteps.includes('plano')) {
    completed.push('plano')
  }

  return completed
}

export const onboardingRouter: TRPCRouter = router({
  // Retorna o status atual do onboarding: passos concluídos, passo atual e se está completo
  getStatus: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const tenant = await rootDb.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        cnpj: true,
        stripeSubscriptionId: true,
        onboardingCompletedAt: true,
        onboardingSkippedSteps: true,
        _count: {
          select: {
            properties: { where: { deletedAt: null } },
            owners: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado.' })

    const completedSteps = deriveCompletedSteps(tenant)
    const currentStep = ONBOARDING_STEPS.find((s) => !completedSteps.includes(s)) ?? null
    const isComplete =
      tenant.onboardingCompletedAt != null || completedSteps.length === ONBOARDING_STEPS.length

    return {
      completedSteps,
      currentStep,
      isComplete,
      completedAt: tenant.onboardingCompletedAt,
    }
  }),

  // Valida e marca um passo como concluído no tenant
  completeStep: adminProcedure.input(CompleteStepSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const tenant = await rootDb.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        stripeSubscriptionId: true,
        onboardingCompletedAt: true,
        onboardingSkippedSteps: true,
        _count: {
          select: {
            properties: { where: { deletedAt: null } },
            owners: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado.' })

    // Validações por passo
    if (input.step === 'primeiro_imovel' && tenant._count.properties === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cadastre ao menos um imóvel antes de concluir este passo.',
      })
    }

    if (input.step === 'primeiro_proprietario' && tenant._count.owners === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cadastre ao menos um proprietário antes de concluir este passo.',
      })
    }

    // Verifica se todos os passos estão concluídos após este
    const completedAfter = deriveCompletedSteps({
      cnpj: null,
      stripeSubscriptionId: input.step === 'plano' ? 'marked' : tenant.stripeSubscriptionId,
      onboardingSkippedSteps: tenant.onboardingSkippedSteps,
      _count: tenant._count,
    })

    const allDone = ONBOARDING_STEPS.every((s) => completedAfter.includes(s))

    await rootDb.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        ...(allDone && !tenant.onboardingCompletedAt ? { onboardingCompletedAt: new Date() } : {}),
      },
    })

    return { ok: true, isComplete: allDone }
  }),

  // Pula um passo do onboarding sem validar seus dados
  skip: adminProcedure.input(SkipStepSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    if (input.step === 'dados_basicos') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'O passo de dados básicos não pode ser pulado.',
      })
    }

    const tenant = await rootDb.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        stripeSubscriptionId: true,
        onboardingCompletedAt: true,
        onboardingSkippedSteps: true,
        _count: {
          select: {
            properties: { where: { deletedAt: null } },
            owners: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado.' })

    const alreadySkipped = tenant.onboardingSkippedSteps.includes(input.step)
    const newSkipped = alreadySkipped
      ? tenant.onboardingSkippedSteps
      : [...tenant.onboardingSkippedSteps, input.step]

    const completedAfter = deriveCompletedSteps({
      cnpj: null,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      onboardingSkippedSteps: newSkipped,
      _count: tenant._count,
    })

    const allDone = ONBOARDING_STEPS.every((s) => completedAfter.includes(s))

    await rootDb.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        onboardingSkippedSteps: newSkipped,
        ...(allDone && !tenant.onboardingCompletedAt ? { onboardingCompletedAt: new Date() } : {}),
      },
    })

    return { ok: true, skipped: input.step, isComplete: allDone }
  }),

  // Atualiza perfil do tenant com dados do onboarding (CNPJ, etc.)
  updateProfile: adminProcedure
    .input(
      z.object({
        cnpj: z.string().min(14).max(18).optional(),
        bankSlug: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const tenant = await rootDb.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          ...(input.cnpj && { cnpj: input.cnpj.replace(/\D/g, '') }),
        },
      })

      return { id: tenant.id, name: tenant.name }
    }),
})
