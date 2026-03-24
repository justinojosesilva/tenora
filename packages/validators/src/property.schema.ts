import { z } from 'zod'

export const PropertyCreateSchema = z.object({
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  type: z.enum(['residential', 'commercial', 'mixed']),
  area: z.number().positive().optional(),
  adminFeePct: z.number().min(0).max(100).default(10),
  rentAmount: z.number().positive().optional(),
  ownerId: z.string().uuid(),
})

export type PropertyCreate = z.infer<typeof PropertyCreateSchema>
