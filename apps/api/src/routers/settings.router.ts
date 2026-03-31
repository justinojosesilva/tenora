import { z } from 'zod'
import { router, protectedProcedure } from '@tenora/trpc'

export const settingsRouter = router({
  /**
   * Fetch settings da imobiliária (name, CNPJ, logo, contactEmail)
   */
  getTenantSettings: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await ctx.db.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: {
        id: true,
        name: true,
        cnpj: true,
        logo: true,
        contactEmail: true,
      },
    })

    return tenant
  }),

  /**
   * Atualiza settings da imobiliária
   */
  updateTenantSettings: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        cnpj: z.string().optional(),
        logo: z.string().url().optional(),
        contactEmail: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await ctx.db.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.cnpj !== undefined && { cnpj: input.cnpj }),
          ...(input.logo !== undefined && { logo: input.logo }),
          ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        },
        select: {
          id: true,
          name: true,
          cnpj: true,
          logo: true,
          contactEmail: true,
        },
      })

      return tenant
    }),

  /**
   * Fetch lista de contas bancárias vinculadas
   */
  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.bankAccount.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        name: true,
        bankCode: true,
        agency: true,
        accountNumber: true,
        accountType: true,
        isPrimary: true,
        bankConnection: {
          select: {
            id: true,
            status: true,
            lastSyncedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  /**
   * Fetch plano e informações de assinatura do Stripe
   */
  getSubscriptionInfo: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await ctx.db.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    return tenant
  }),
})
