import { z } from 'zod'

export const UserRoleEnum = z.enum(['admin', 'financeiro', 'operacional', 'visualizador'])

export const InviteUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: UserRoleEnum,
})

export const RevokeInvitationSchema = z.object({
  invitationId: z.string().min(1),
})

export type UserRole = z.infer<typeof UserRoleEnum>
export type InviteUser = z.infer<typeof InviteUserSchema>
export type RevokeInvitation = z.infer<typeof RevokeInvitationSchema>
