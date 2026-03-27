import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { OwnerCreateSchema, OwnerUpdateSchema, OwnerListSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

export const ownerRouter: TRPCRouter = router({
  list: protectedProcedure.input(OwnerListSchema).query(async ({ ctx, input }) => {
    const { search, page, limit } = input
    return ctx.db.owner.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cpfCnpj: { contains: search } },
          ],
        }),
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        properties: { where: { deletedAt: null }, select: { id: true } },
        ownerAccount: { select: { balance: true } },
      },
      orderBy: { name: 'asc' },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db.owner.findUnique({
        where: { id: input.id, deletedAt: null },
        include: {
          properties: { where: { deletedAt: null } },
          ownerAccount: true,
        },
      })
      if (!owner)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })
      return owner
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(OwnerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const owner = await tx.owner.create({
          data: { ...input, tenantId: ctx.tenantId },
        })
        await tx.ownerAccount.create({
          data: { tenantId: ctx.tenantId, ownerId: owner.id, balance: 0 },
        })
        return owner
      })
    }),

  update: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(z.object({ id: z.string().uuid(), data: OwnerUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.owner.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })
      return ctx.db.owner.update({ where: { id: input.id }, data: input.data })
    }),

  softDelete: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.owner.findUnique({
        where: { id: input.id, deletedAt: null },
        include: { properties: { where: { deletedAt: null }, select: { id: true } } },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })
      if (existing.properties.length > 0)
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Não é possível excluir proprietário com imóveis ativos vinculados',
        })
      return ctx.db.owner.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
    }),
})
