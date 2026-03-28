import { z } from 'zod'

export const PropertyCreateSchema = z.object({
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  type: z.enum(['residential', 'commercial', 'mixed']),
  status: z.enum(['available', 'rented', 'maintenance']).optional(),
  area: z.number().positive().optional(),
  adminFeePct: z.number().min(0).max(100).default(10),
  rentAmount: z.number().positive().optional(),
  ownerId: z.string().uuid().optional(),
})

export const PropertyUpdateSchema = PropertyCreateSchema.partial()

export const PropertyListSchema = z.object({
  status: z.enum(['available', 'rented', 'maintenance']).optional(),
  type: z.enum(['residential', 'commercial', 'mixed']).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export type PropertyCreate = z.infer<typeof PropertyCreateSchema>
export type PropertyUpdate = z.infer<typeof PropertyUpdateSchema>
export type PropertyList = z.infer<typeof PropertyListSchema>
