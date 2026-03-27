import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { PropertyCreateSchema, PropertyUpdateSchema, PropertyListSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

export const propertyRouter: TRPCRouter = router({
  list: protectedProcedure.input(PropertyListSchema).query(async ({ ctx, input }) => {
    const { status, type, ownerId, search, page, limit } = input
    return ctx.db.property.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(type && { type }),
        ...(ownerId && { ownerId }),
        ...(search && {
          address: { contains: search, mode: 'insensitive' },
        }),
      },
      skip: (page - 1) * limit,
      take: limit,
      include: { owner: true, leases: { where: { status: 'active' } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.db.property.findUnique({
        where: { id: input.id, deletedAt: null },
        include: { owner: true, leases: true, maintenanceOrders: true },
      })
      if (!property)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada!' })
      return property
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(PropertyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.property.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
        },
      })
    }),

  update: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(z.object({ id: z.string().uuid(), data: PropertyUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.property.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada!' })

      return ctx.db.property.update({
        where: { id: input.id },
        data: input.data,
      })
    }),

  softDelete: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.property.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada!' })

      return ctx.db.property.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
    }),
})
