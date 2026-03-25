import { createClerkClient } from '@clerk/backend'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@tenora/trpc'
import { InviteUserSchema, RevokeInvitationSchema } from '@tenora/validators'
import type { TRPCRouter } from '@tenora/trpc'

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'CLERK_SECRET_KEY não configurada',
    })
  }
  return createClerkClient({ secretKey })
}

function toClerkRole(role: string): string {
  return role === 'admin' ? 'org:admin' : 'org:member'
}

export const usersRouter: TRPCRouter = router({
  // Lista membros ativos do tenant
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return ctx.db.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Lista convites pendentes via Clerk
  listPendingInvitations: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const clerk = getClerkClient()
    const { data } = await clerk.organizations.getOrganizationInvitationList({
      organizationId: ctx.tenantId,
      status: ['pending'],
    })

    return data.map((inv) => ({
      id: inv.id,
      emailAddress: inv.emailAddress,
      role:
        ((inv.publicMetadata as Record<string, unknown> | null)?.role as string | undefined) ??
        'visualizador',
      createdAt: new Date(inv.createdAt),
    }))
  }),

  // Convida usuário por email
  invite: adminProcedure.input(InviteUserSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenantId || !ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    // Verificar se já existe usuário ativo com este email no tenant
    const existing = await ctx.db.user.findFirst({
      where: { email: input.email, deletedAt: null },
    })
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Já existe um usuário com este email neste tenant.',
      })
    }

    // Buscar o clerkId do admin que está convidando
    const adminUser = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { clerkId: true },
    })
    if (!adminUser?.clerkId) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin sem clerkId.' })
    }

    const clerk = getClerkClient()

    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: ctx.tenantId,
      inviterUserId: adminUser.clerkId,
      emailAddress: input.email,
      role: toClerkRole(input.role),
      // Guarda a role Tenora nos metadados para o webhook usar
      publicMetadata: { role: input.role } as Record<string, unknown>,
    })

    return {
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: input.role,
      createdAt: new Date(invitation.createdAt),
    }
  }),

  // Cancela convite pendente
  revokeInvitation: adminProcedure
    .input(RevokeInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId || !ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const adminUser = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { clerkId: true },
      })
      if (!adminUser?.clerkId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin sem clerkId.' })
      }

      const clerk = getClerkClient()

      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: ctx.tenantId,
        invitationId: input.invitationId,
        requestingUserId: adminUser.clerkId,
      })

      return { success: true }
    }),
})
