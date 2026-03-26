import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { router, adminProcedure } from '@tenora/trpc'
import { db as rootDb } from '@tenora/db'
import type { TRPCRouter } from '@tenora/trpc'

export const onboardingRouter: TRPCRouter = router({
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
