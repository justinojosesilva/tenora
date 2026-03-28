import { z } from 'zod'

export const LeaseCreateSchema = z.object({
  propertyId: z.string().uuid(),
  tenantName: z.string().min(1),
  tenantCpf: z.string().optional(),
  tenantEmail: z.string().email().optional(),
  tenantPhone: z.string().optional(),
  rentAmount: z.number().positive(),
  adminFeePct: z.number().min(0).max(100).default(10),
  readjustIndex: z.string().default('IGPM'),
  dueDayOfMonth: z.number().int().min(1).max(28).default(5),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  signedAt: z.coerce.date().optional(),
})

export const LeaseUpdateSchema = LeaseCreateSchema.partial()

export const LeaseListSchema = z.object({
  status: z.enum(['active', 'ended', 'renewing', 'overdue']).optional(),
  propertyId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export type LeaseCreate = z.infer<typeof LeaseCreateSchema>
export type LeaseUpdate = z.infer<typeof LeaseUpdateSchema>
export type LeaseList = z.infer<typeof LeaseListSchema>
