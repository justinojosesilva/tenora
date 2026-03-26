import { z } from 'zod'
import { router, protectedProcedure, type TRPCRouter } from '@tenora/trpc'
import { PropertyCreateSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'

export const propertyRouter: TRPCRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['available', 'rented', 'maintenance']).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input
      return ctx.db.property.findMany({
        where: { ...(status && { status }) },
        skip: (page - 1) * limit,
        take: limit,
        include: { owner: true, leases: { where: { status: 'active' } } },
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.db.property.findUnique({
        where: { id: input.id },
        include: { owner: true, leases: true, maintenanceOrders: true },
      })
      if (!property)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada!' })
      return property
    }),

  create: protectedProcedure.input(PropertyCreateSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.property.create({
      data: {
        ...input,
        tenantId: ctx.tenantId,
      },
    })
  }),
})
